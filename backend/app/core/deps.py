from datetime import datetime, timedelta, timezone
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.telegram import verify_telegram_init_data
from app.db.session import get_db
from app.models.models import SubscriptionStatus, User

FREE_ACCESS_IDS = {6748913141, 6425298190, 240569940, 807281051, 887545183, 885296246, 8770473636, 1148555111, 908989813, 992974698, 1010539891, 704916686, 5495190630, 668418636}


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

    now = datetime.now(timezone.utc)
    changed = False

    if not user:
        user = User(
            tg_id=tg_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
        )
        if tg_id in FREE_ACCESS_IDS:
            user.subscription_status = SubscriptionStatus.active
            user.subscription_expires_at = now + timedelta(days=3650)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    new_username = tg_user.get("username")
    new_first_name = tg_user.get("first_name")

    if new_username and user.username != new_username:
        user.username = new_username
        changed = True

    if new_first_name and new_first_name != "." and user.first_name != new_first_name:
        user.first_name = new_first_name
        changed = True

    if tg_id in FREE_ACCESS_IDS:
        if user.subscription_status != SubscriptionStatus.active:
            user.subscription_status = SubscriptionStatus.active
            user.subscription_expires_at = now + timedelta(days=3650)
            changed = True
    elif user.subscription_status == SubscriptionStatus.active and user.subscription_expires_at is not None:
        expires = user.subscription_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now:
            user.subscription_status = SubscriptionStatus.inactive
            changed = True

    if changed:
        await db.commit()
        await db.refresh(user)

    return user