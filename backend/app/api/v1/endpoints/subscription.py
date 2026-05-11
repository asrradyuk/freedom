from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
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