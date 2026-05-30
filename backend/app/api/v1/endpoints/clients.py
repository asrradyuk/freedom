import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, SubscriptionStatus, User
from app.schemas.schemas import ClientCreate, ClientUpdate
from app.services.livekit import create_room_name

router = APIRouter()


def _require_subscription(user: User) -> None:
    if user.subscription_status != SubscriptionStatus.active:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Subscription required")


async def _get_client_or_404(client_id: uuid.UUID, user: User, db: AsyncSession) -> Client:
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.specialist_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


async def _enrich_clients_batch(clients: list[Client], db: AsyncSession) -> list[dict]:
    tg_ids = [c.client_tg_id for c in clients if c.client_tg_id]
    user_map: dict[int, User] = {}

    if tg_ids:
        result = await db.execute(select(User).where(User.tg_id.in_(tg_ids)))
        for u in result.scalars().all():
            user_map[u.tg_id] = u

    out = []
    for client in clients:
        client_user = user_map.get(client.client_tg_id) if client.client_tg_id else None
        out.append({
            "id": str(client.id),
            "name": client.name,
            "note": client.note,
            "meeting_url": client.meeting_url,
            "livekit_room": client.livekit_room,
            "client_tg_id": client.client_tg_id,
            "reminders_enabled": client.reminders_enabled,
            "reminder_text": client.reminder_text,
            "created_at": client.created_at.isoformat(),
            "avatar_url": client_user.avatar_url if client_user else None,
            "username": client_user.username if client_user else None,
        })
    return out


@router.get("/")
async def list_clients(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.specialist_id == user.id).order_by(Client.created_at.desc())
    )
    clients = result.scalars().all()
    return await _enrich_clients_batch(clients, db)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_subscription(user)
    client = Client(
        specialist_id=user.id,
        livekit_room=create_room_name(user.tg_id),
        **payload.model_dump(),
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    enriched = await _enrich_clients_batch([client], db)
    return enriched[0]


@router.get("/{client_id}")
async def get_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, user, db)
    enriched = await _enrich_clients_batch([client], db)
    return enriched[0]


@router.patch("/{client_id}")
async def update_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_subscription(user)
    client = await _get_client_or_404(client_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    enriched = await _enrich_clients_batch([client], db)
    return enriched[0]


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_subscription(user)
    client = await _get_client_or_404(client_id, user, db)
    await db.delete(client)
    await db.commit()