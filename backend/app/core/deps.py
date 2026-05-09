from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import User


async def get_current_user(
    x_init_data: str = Header(default="test", alias="X-Init-Data"),
    db: AsyncSession = Depends(get_db),
) -> User:
    tg_id = 6425298190
    result = await db.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(tg_id=tg_id, first_name="Саша", subscription_status="active")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user