from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import Client, Session, User
from app.schemas.schemas import SessionPaymentStatus
from pydantic import BaseModel
import uuid
from datetime import datetime

router = APIRouter()


class ClientViewOut(BaseModel):
    client_id: uuid.UUID
    specialist_name: str | None
    meeting_url: str | None
    sessions: list[dict]

    model_config = {"from_attributes": True}


@router.get("/by-tg/{tg_id}", response_model=ClientViewOut)
async def get_client_by_tg(
    tg_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client)
        .options(
            selectinload(Client.sessions),
            selectinload(Client.specialist),
        )
        .where(Client.client_tg_id == tg_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    sessions = [
        {
            "id": str(s.id),
            "scheduled_at": s.scheduled_at.isoformat(),
            "payment_status": s.payment_status.value,
        }
        for s in client.sessions
    ]

    return ClientViewOut(
        client_id=client.id,
        specialist_name=client.specialist.first_name if client.specialist else None,
        meeting_url=client.meeting_url,
        sessions=sessions,
    )