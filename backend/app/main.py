import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import update

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import async_session_factory
from app.models.models import SubscriptionStatus, User
from app.services.reminders import reschedule_pending_reminders, scheduler

bot = Bot(token=settings.BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🚀 Открыть FREEDOM",
            web_app=WebAppInfo(url=settings.WEBAPP_URL),
        )
    ]])
    await message.answer(
        "👋 Привет! Я помогу тебе управлять занятиями и клиентами.\n\n"
        "Нажми кнопку ниже чтобы открыть приложение:",
        reply_markup=kb,
    )


async def _expire_subscriptions() -> None:
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        await db.execute(
            update(User)
            .where(
                User.subscription_status == SubscriptionStatus.active,
                User.subscription_expires_at < now,
                User.tg_id.not_in([6748913141, 6425298190]),
            )
            .values(subscription_status=SubscriptionStatus.inactive)
        )
        await db.commit()


async def _start_bot():
    asyncio.create_task(dp.start_polling(bot, handle_signals=False))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    scheduler.start()
    scheduler.add_job(
        _expire_subscriptions,
        trigger="interval",
        hours=1,
        id="expire_subscriptions",
        replace_existing=True,
    )
    try:
        await reschedule_pending_reminders()
    except Exception:
        pass
    await _start_bot()
    yield
    scheduler.shutdown()
    await bot.session.close()


app = FastAPI(title="FREEDOM API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}