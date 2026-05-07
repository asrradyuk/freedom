import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.models import Client, SubscriptionStatus, User
from app.schemas.schemas import LiveKitTokenOut
from app.services.livekit import generate_token

router = APIRouter()


@router.post("/token/{client_id}", response_model=LiveKitTokenOut)
async def get_livekit_token(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.subscription_status != SubscriptionStatus.active:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Subscription required")

    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.specialist_id == user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if not client.livekit_room:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room not assigned")

    token = generate_token(
        room=client.livekit_room,
        participant_identity=str(user.tg_id),
        participant_name=user.first_name or str(user.tg_id),
    )

    return LiveKitTokenOut(token=token, room=client.livekit_room, url=settings.LIVEKIT_URL)


@router.post("/client-token/{client_id}", response_model=LiveKitTokenOut)
async def get_client_livekit_token(
    client_id: uuid.UUID,
    tg_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client or client.client_tg_id != tg_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if not client.livekit_room:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room not assigned")

    token = generate_token(
        room=client.livekit_room,
        participant_identity=f"client-{tg_id}",
        participant_name=f"Client {tg_id}",
    )

    return LiveKitTokenOut(token=token, room=client.livekit_room, url=settings.LIVEKIT_URL)