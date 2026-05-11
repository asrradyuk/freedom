from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.telegram import verify_telegram_init_data
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserOut

router = APIRouter()


@router.post("/auth", response_model=UserOut)
async def authenticate(
    x_init_data: str = Header(..., alias="X-Init-Data"),
    db: AsyncSession = Depends(get_db),
):
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
        await db.commit()
        await db.refresh(user)

    return user