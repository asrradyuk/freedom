import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
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


async def _start_bot():
    asyncio.create_task(dp.start_polling(bot, handle_signals=False))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    scheduler.start()
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