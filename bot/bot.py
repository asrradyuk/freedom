import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime
from urllib.parse import quote

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN")
PAYMENT_URL = os.getenv("PAYMENT_URL", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://freedom-ouep.vercel.app")
API_URL = os.getenv("API_URL", "http://localhost:8000/api/v1")
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()]

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


def _make_init_data(tg_id: int) -> str:
    user = json.dumps({"id": tg_id, "first_name": "Admin"}, separators=(",", ":"))
    auth_date = int(time.time())
    data = f"auth_date={auth_date}\nuser={user}"
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    hash_ = hmac.new(secret, data.encode(), hashlib.sha256).hexdigest()
    return f"auth_date={auth_date}&user={quote(user)}&hash={hash_}"


def _open_app_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🚀 Открыть FREEDOM", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])


def _payment_kb() -> InlineKeyboardMarkup:
    rows = []
    if PAYMENT_URL:
        rows.append([InlineKeyboardButton(text="💳 Оплатить подписку — 599 ₽/мес", url=PAYMENT_URL)])
    rows.append([InlineKeyboardButton(text="Открыть приложение", web_app=WebAppInfo(url=WEBAPP_URL))])
    return InlineKeyboardMarkup(inline_keyboard=rows)


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    await message.answer(
        "*FREEDOM* — всё для работы со своими клиентами\n\n"
        "Ведёшь клиентов, планируешь занятия, проводишь видеозвонки, "
        "отправляешь напоминания и хранишь материалы — всё в одном месте.\n\n"
        "*Что включено в подписку:*\n"
        "✅ Ведение клиентов\n"
        "✅ Видеозвонки\n"
        "✅ Планирование занятий\n"
        "✅ Напоминания тебе и клиенту\n"
        "✅ Хранение материалов\n"
        "✅ Учёт оплат\n\n"
        "💰 *Подписка — 599 ₽/месяц*",
        parse_mode="Markdown",
        reply_markup=_payment_kb(),
    )


@dp.message(Command("app"))
async def cmd_app(message: types.Message):
    await message.answer("Открой приложение 👇", reply_markup=_open_app_kb())


@dp.message(Command("status"))
async def cmd_status(message: types.Message):
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{API_URL}/health")
            if r.status_code == 200:
                await message.answer("✅ Сервер работает")
            else:
                await message.answer(f"⚠️ Сервер вернул {r.status_code}")
    except Exception as e:
        await message.answer(f"❌ Не удалось подключиться: {e}")


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
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{API_URL}/subscription/admin/activate",
                params={"target_tg_id": target_id},
                headers={"X-Init-Data": _make_init_data(message.from_user.id)},
            )
            if r.status_code == 200:
                await message.answer(f"✅ Подписка активирована для {target_id}")
            else:
                await message.answer(f"❌ Ошибка: {r.text}")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


async def main():
    logger.info("Bot started (standalone mode)")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())