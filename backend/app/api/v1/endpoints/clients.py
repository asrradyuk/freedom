import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, Session, SubscriptionStatus, User
from app.schemas.schemas import ClientCreate, ClientOut, ClientUpdate
from app.services.livekit import create_room_name
from app.services.reminders import cancel_session_reminders, schedule_session_reminders

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


@router.get("/", response_model=list[ClientOut])
async def list_clients(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.specialist_id == user.id).order_by(Client.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
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
    return client


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_client_or_404(client_id, user, db)


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, user, db)

    updates = payload.model_dump(exclude_unset=True)
    reminders_toggled = "reminders_enabled" in updates
    was_enabled = client.reminders_enabled

    for field, value in updates.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)

    if reminders_toggled and was_enabled != client.reminders_enabled:
        sessions_result = await db.execute(
            select(Session)
            .options(selectinload(Session.reminders))
            .where(Session.client_id == client.id)
        )
        sessions = sessions_result.scalars().all()

        for session in sessions:
            if client.reminders_enabled:
                if any(not r.sent for r in session.reminders):
                    schedule_session_reminders(str(session.id), session.scheduled_at)
            else:
                cancel_session_reminders(str(session.id))

    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, user, db)
    await db.delete(client)
    await db.commit()