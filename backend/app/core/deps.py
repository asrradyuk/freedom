from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.telegram import verify_telegram_init_data
from app.db.session import get_db
from app.models.models import SubscriptionStatus, User

FREE_ACCESS_IDS = {6748913141, 6425298190}


async def get_current_user(
    x_init_data: str = Header(..., alias="X-Init-Data"),
    db: AsyncSession = Depends(get_db),
) -> User:
    tg_user = verify_telegram_init_data(x_init_data, settings.BOT_TOKEN)
    if not tg_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram auth")

    tg_id = tg_user["id"]
    result = await db.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            tg_id=tg_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
        )
        db.add(user)
        await db.flush()

    if tg_id in FREE_ACCESS_IDS and user.subscription_status != SubscriptionStatus.active:
        user.subscription_status = SubscriptionStatus.active
        user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=3650)
        await db.commit()
        await db.refresh(user)
        return user

    if (
        user.subscription_status == SubscriptionStatus.active
        and user.subscription_expires_at is not None
        and user.subscription_expires_at < datetime.now(timezone.utc)
        and tg_id not in FREE_ACCESS_IDS
    ):
        user.subscription_status = SubscriptionStatus.inactive
        await db.commit()
        await db.refresh(user)

    if user.subscription_status != SubscriptionStatus.active:
        await db.commit()
        await db.refresh(user)

    return user