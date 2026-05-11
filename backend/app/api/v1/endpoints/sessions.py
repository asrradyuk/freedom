import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, Reminder, ReminderType, Session, SubscriptionStatus, User
from app.schemas.schemas import SessionCreate, SessionOut, SessionUpdate
from app.services.reminders import cancel_session_reminders, schedule_session_reminders

router = APIRouter()


async def _get_client_or_404(client_id: uuid.UUID, user: User, db: AsyncSession) -> Client:
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.specialist_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


async def _get_session_or_404(session_id: uuid.UUID, client_id: uuid.UUID, db: AsyncSession) -> Session:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.client_id == client_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.get("/", response_model=list[SessionOut])
async def list_sessions(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)
    result = await db.execute(
        select(Session).where(Session.client_id == client_id).order_by(Session.scheduled_at)
    )
    return result.scalars().all()


@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    client_id: uuid.UUID,
    payload: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.subscription_status != SubscriptionStatus.active:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Subscription required")

    client = await _get_client_or_404(client_id, user, db)

    session = Session(client_id=client_id, **payload.model_dump())
    db.add(session)
    await db.flush()

    for reminder_type in ReminderType:
        db.add(Reminder(session_id=session.id, reminder_type=reminder_type))

    await db.commit()
    await db.refresh(session)

    if client.reminders_enabled:
        schedule_session_reminders(str(session.id), session.scheduled_at)

    return session


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    client_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: SessionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, user, db)
    session = await _get_session_or_404(session_id, client_id, db)

    rescheduled = "scheduled_at" in payload.model_dump(exclude_unset=True)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)

    await db.commit()
    await db.refresh(session)

    if rescheduled and client.reminders_enabled:
        cancel_session_reminders(str(session.id))
        schedule_session_reminders(str(session.id), session.scheduled_at)

    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    client_id: uuid.UUID,
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, user, db)
    session = await _get_session_or_404(session_id, client_id, db)
    cancel_session_reminders(str(session.id))
    await db.delete(session)
    await db.commit()