from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import uuid

from app.db.session import get_db
from app.models.models import Client

router = APIRouter()


class SessionOut(BaseModel):
    id: str
    scheduled_at: str
    payment_status: str


class MaterialOut(BaseModel):
    id: str
    original_name: str
    file_size: int
    mime_type: str | None


class ClientViewOut(BaseModel):
    client_id: str
    specialist_name: str | None
    meeting_url: str | None
    livekit_room: str | None
    sessions: list[dict]
    materials: list[dict]

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
            selectinload(Client.materials),
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

    materials = [
        {
            "id": str(m.id),
            "original_name": m.original_name,
            "file_size": m.file_size,
            "mime_type": m.mime_type,
        }
        for m in client.materials
    ]

    return ClientViewOut(
        client_id=str(client.id),
        specialist_name=client.specialist.first_name if client.specialist else None,
        meeting_url=client.meeting_url,
        livekit_room=client.livekit_room,
        sessions=sessions,
        materials=materials,
    )