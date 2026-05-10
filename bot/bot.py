import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
)
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN")
PAYMENT_URL = os.getenv("PAYMENT_URL", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://freedom-ouep.vercel.app")
API_URL = os.getenv("API_URL", "http://localhost:8000/api/v1")
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "[]").strip("[]").split(",") if x.strip()]

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
scheduler = AsyncIOScheduler(timezone="UTC")


def specialist_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🚀 Открыть FREEDOM",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])


def payment_kb() -> InlineKeyboardMarkup:
    rows = []
    if PAYMENT_URL:
        rows.append([InlineKeyboardButton(text="💳 Оплатить подписку — 599 ₽/мес", url=PAYMENT_URL)])
    rows.append([InlineKeyboardButton(
        text="Открыть приложение",
        web_app=WebAppInfo(url=WEBAPP_URL),
    )])
    return InlineKeyboardMarkup(inline_keyboard=rows)


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    await message.answer(
        "*FREEDOM* — всё для работы со своими клиентами\n\n"
        "Ведёшь клиентов, планируешь занятия, проводишь видеозвонки, "
        "отправляешь напоминания и храните материалы — всё в одном месте.\n\n"
        "*Что включено в подписку:*\n"
        "✅ Ведение клиентов\n"
        "✅ Видеозвонки\n"
        "✅ Планирование занятий\n"
        "✅ Напоминания тебе и клиенту\n"
        "✅ Хранение материалов\n"
        "✅ Учёт оплат\n\n"
        "💰 *Подписка — 599 ₽/месяц*",
        parse_mode="Markdown",
        reply_markup=payment_kb(),
    )


@dp.message(Command("app"))
async def cmd_app(message: types.Message):
    await message.answer(
        "Открой приложение 👇",
        reply_markup=specialist_kb(),
    )


@dp.message(Command("status"))
async def cmd_status(message: types.Message):
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{API_URL}/health", timeout=5)
            if r.status_code == 200:
                await message.answer("✅ Сервер работает")
            else:
                await message.answer("⚠️ Сервер недоступен")
    except Exception:
        await message.answer("❌ Не удалось подключиться к серверу")


@dp.message(Command("activate"))
async def cmd_activate(message: types.Message):
    if message.from_user.id not in ADMIN_IDS:
        return

    args = message.text.split()
    if len(args) < 2:
        await message.answer("Использование: /activate <tg_id>")
        return

    target_id = args[1]
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{API_URL}/subscription/admin/activate",
                params={"target_tg_id": target_id},
                headers={"X-Init-Data": _make_admin_init_data(message.from_user.id)},
                timeout=10,
            )
            if r.status_code == 200:
                await message.answer(f"✅ Подписка активирована для {target_id}")
            else:
                await message.answer(f"❌ Ошибка: {r.text}")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


def _make_admin_init_data(tg_id: int) -> str:
    import hashlib
    import hmac
    import json
    import time
    user = json.dumps({"id": tg_id, "first_name": "Admin"}, separators=(",", ":"))
    data = f"auth_date={int(time.time())}\nuser={user}"
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    hash_ = hmac.new(secret, data.encode(), hashlib.sha256).hexdigest()
    from urllib.parse import quote
    return f"auth_date={int(time.time())}&user={quote(user)}&hash={hash_}"


async def send_reminder(
    specialist_tg_id: int,
    client_tg_id: int | None,
    client_name: str,
    scheduled_at: str,
    meeting_url: str | None,
    reminder_text: str | None,
):
    time_str = datetime.fromisoformat(scheduled_at).strftime("%H:%M")
    text = reminder_text or "Напоминание о занятии"

    specialist_buttons = []
    if meeting_url:
        specialist_buttons.append([
            InlineKeyboardButton(text="📹 Открыть встречу", url=meeting_url)
        ])
    specialist_buttons.append([
        InlineKeyboardButton(text="Открыть приложение", web_app=WebAppInfo(url=WEBAPP_URL))
    ])

    try:
        await bot.send_message(
            chat_id=specialist_tg_id,
            text=f"🔔 {text}\n\n👤 Клиент: *{client_name}*\n⏰ Время: *{time_str}*",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=specialist_buttons),
        )
    except Exception as e:
        logger.error(f"Failed to send reminder to specialist {specialist_tg_id}: {e}")

    if client_tg_id:
        client_buttons = []
        if meeting_url:
            client_buttons.append([
                InlineKeyboardButton(text="🔗 Подключиться", url=meeting_url)
            ])

        try:
            await bot.send_message(
                chat_id=client_tg_id,
                text=f"🔔 {text}\n\n⏰ Время: *{time_str}*",
                parse_mode="Markdown",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=client_buttons) if client_buttons else None,
            )
        except Exception as e:
            logger.error(f"Failed to send reminder to client {client_tg_id}: {e}")


async def schedule_upcoming_reminders():
    logger.info("Scheduling upcoming reminders...")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{API_URL}/health", timeout=5)
            if r.status_code != 200:
                return
    except Exception:
        logger.warning("Backend not available, skipping reminder scheduling")
        return


async def main():
    scheduler.add_job(
        schedule_upcoming_reminders,
        trigger="interval",
        minutes=10,
        id="check_reminders",
        replace_existing=True,
    )
    scheduler.start()

    await schedule_upcoming_reminders()

    logger.info("Bot started")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())