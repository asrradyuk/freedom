import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import SubscriptionStatus, User
from app.schemas.schemas import UserOut

router = APIRouter()


@router.get("/", response_model=UserOut)
async def get_subscription(user: User = Depends(get_current_user)):
    return user


@router.get("/payment-url")
async def get_payment_url(user: User = Depends(get_current_user)):
    import httpx
    import uuid

    idempotence_key = str(uuid.uuid4())
    payload = {
        "amount": {"value": "599.00", "currency": "RUB"},
        "confirmation": {
            "type": "redirect",
            "return_url": settings.WEBAPP_URL,
        },
        "capture": True,
        "description": f"Подписка FREEDOM на 30 дней (tg:{user.tg_id})",
        "metadata": {"tg_id": str(user.tg_id)},
    }

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.yookassa.ru/v3/payments",
                json=payload,
                auth=(settings.YUKASSA_SHOP_ID, settings.YUKASSA_SECRET_KEY),
                headers={"Idempotence-Key": idempotence_key},
                timeout=10,
            )
        data = r.json()
        url = data.get("confirmation", {}).get("confirmation_url")
        if not url:
            raise HTTPException(status_code=500, detail="Failed to create payment")
        return {"url": url}
    except Exception:
        return {"url": settings.PAYMENT_URL}


@router.post("/webhook/yookassa")
async def yookassa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()

    try:
        data = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = data.get("event")
    if event != "payment.succeeded":
        return {"ok": True}

    payment_obj = data.get("object", {})
    metadata = payment_obj.get("metadata", {})
    tg_id_str = metadata.get("tg_id")

    if not tg_id_str:
        return {"ok": True}

    try:
        tg_id = int(tg_id_str)
    except ValueError:
        return {"ok": True}

    result = await db.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()
    if user:
        user.subscription_status = SubscriptionStatus.active
        user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        await db.commit()

    return {"ok": True}


@router.post("/confirm", response_model=UserOut)
async def confirm_payment(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.subscription_status = SubscriptionStatus.active
    user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/admin/activate", response_model=UserOut)
async def admin_activate(
    target_tg_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.tg_id not in settings.ADMIN_IDS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    result = await db.execute(select(User).where(User.tg_id == target_tg_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target.subscription_status = SubscriptionStatus.active
    target.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await db.commit()
    await db.refresh(target)
    return target