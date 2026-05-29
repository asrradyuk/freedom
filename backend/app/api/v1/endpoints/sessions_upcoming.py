from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Client, Session, User

router = APIRouter()


@router.get("/upcoming")
async def upcoming_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=2)

    result = await db.execute(
        select(Session)
        .join(Client, Session.client_id == Client.id)
        .options(selectinload(Session.client))
        .where(
            Client.specialist_id == user.id,
            Session.scheduled_at >= now,
            Session.scheduled_at < cutoff,
        )
        .order_by(Session.scheduled_at)
    )
    sessions = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "client_id": str(s.client_id),
            "scheduled_at": s.scheduled_at.isoformat(),
            "payment_status": s.payment_status.value,
            "client_name": s.client.name,
            "client_meeting_url": s.client.meeting_url,
            "livekit_room": s.client.livekit_room,
        }
        for s in sessions
    ]