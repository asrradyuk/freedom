import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, SubscriptionStatus, User
from app.schemas.schemas import ClientCreate, ClientOut, ClientUpdate
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


async def _enrich_client(client: Client, db: AsyncSession) -> dict:
    """Добавляем аватарку и username клиента из таблицы users"""
    data = {
        "id": str(client.id),
        "name": client.name,
        "note": client.note,
        "meeting_url": client.meeting_url,
        "livekit_room": client.livekit_room,
        "client_tg_id": client.client_tg_id,
        "reminders_enabled": client.reminders_enabled,
        "reminder_text": client.reminder_text,
        "created_at": client.created_at.isoformat(),
        "avatar_url": None,
        "username": None,
    }
    if client.client_tg_id:
        result = await db.execute(select(User).where(User.tg_id == client.client_tg_id))
        client_user = result.scalar_one_or_none()
        if client_user:
            data["avatar_url"] = client_user.avatar_url
            data["username"] = client_user.username
    return data


@router.get("/")
async def list_clients(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.specialist_id == user.id).order_by(Client.created_at.desc())
    )
    clients = result.scalars().all()
    return [await _enrich_client(c, db) for c in clients]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_subscription(user)
    room_name = create_room_name(user.tg_id)
    client = Client(
        specialist_id=user.id,
        livekit_room=room_name,
        **payload.model_dump(),
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return await _enrich_client(client, db)


@router.get("/{client_id}")
async def get_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, user, db)
    return await _enrich_client(client, db)


@router.patch("/{client_id}")
async def update_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return await _enrich_client(client, db)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, user, db)
    await db.delete(client)
    await db.commit()