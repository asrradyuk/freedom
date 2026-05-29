from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.config import settings
from app.db.session import get_db
from app.models.models import Client, Material, User

router = APIRouter()


class ClientViewOut(BaseModel):
    client_id: str
    specialist_name: str | None
    specialist_tg_id: int | None
    specialist_avatar: str | None
    meeting_url: str | None
    livekit_room: str | None
    client_username: str | None
    client_avatar: str | None
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
        .order_by(Client.created_at.desc())
        .limit(1)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    client_user_result = await db.execute(select(User).where(User.tg_id == tg_id))
    client_user = client_user_result.scalar_one_or_none()

    specialist = client.specialist
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
        specialist_tg_id=specialist.tg_id if specialist else None,
        specialist_name=(specialist.display_name or specialist.first_name) if specialist else None,
        specialist_avatar=specialist.avatar_url if specialist else None,
        meeting_url=client.meeting_url,
        livekit_room=client.livekit_room,
        client_username=client_user.username if client_user else None,
        client_avatar=client_user.avatar_url if client_user else None,
        sessions=sessions,
        materials=materials,
    )


@router.get("/{client_id}/materials/{material_id}/client-download")
async def client_download_material(
    client_id: str,
    material_id: str,
    tg_id: int,
    db: AsyncSession = Depends(get_db),
):
    client_result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.client_tg_id == tg_id,
        )
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    material_result = await db.execute(
        select(Material).where(
            Material.id == material_id,
            Material.client_id == client.id,
        )
    )
    material = material_result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    path = Path(material.filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(path=path, filename=material.original_name, media_type=material.mime_type)