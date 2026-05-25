from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import Client
from app.core.telegram import verify_telegram_init_data
from app.core.config import settings

router = APIRouter()


class ClientViewOut(BaseModel):
    client_id: str
    specialist_name: str | None
    meeting_url: str | None
    livekit_room: str | None
    client_avatar_url: str | None
    client_username: str | None
    sessions: list[dict]
    materials: list[dict]
    model_config = {"from_attributes": True}


@router.get("/by-tg/{tg_id}", response_model=ClientViewOut)
async def get_client_by_tg(
    tg_id: int,
    request: Request,
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

    # Автоматически обновляем данные клиента из Telegram initData
    init_data = request.headers.get("X-Init-Data")
    if init_data:
        tg_user = verify_telegram_init_data(init_data, settings.BOT_TOKEN)
        if tg_user and tg_user.get("id") == tg_id:
            username = tg_user.get("username")
            photo_url = tg_user.get("photo_url")
            updated = False
            if username and client.client_username != username:
                client.client_username = username
                updated = True
            if photo_url and client.client_avatar_url != photo_url:
                client.client_avatar_url = photo_url
                updated = True
            if updated:
                await db.commit()
                await db.refresh(client)

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
        client_avatar_url=client.client_avatar_url,
        client_username=client.client_username,
        sessions=sessions,
        materials=materials,
    )