from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
PAYMENT_URL = os.getenv("PAYMENT_URL")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: types.Message):
    kb = types.InlineKeyboardMarkup(inline_keyboard=[[
        types.InlineKeyboardButton(
            text="💳 Оплатить подписку — 599 ₽/мес",
            url=PAYMENT_URL
        )
    ]])

    await message.answer(
        "🌿 *FREEDOM* — всё для работы со своими клиентами, прямо в Telegram\n\n"
        "Ведёшь клиентов, планируешь занятия, проводишь видеозвонки, отправляешь напоминания "
        "и храните материалы — всё в одном месте, без лишних сервисов.\n\n"
        "Идеально для репетиторов, психологов, консультантов и всех, кто работает с людьми 1 на 1.\n\n"
        "*Что включено в подписку:*\n"
        "✅ Ведение клиентов — вся история в одном месте\n"
        "✅ Видеозвонки — неограниченное количество часов\n"
        "✅ Планирование занятий и расписание\n"
        "✅ Напоминания тебе и клиенту автоматически\n"
        "✅ Хранение материалов для каждой встречи\n"
        "✅ Учёт оплат\n"
        "✅ Запись звонков\n"
        "✅ Быстрый доступ к созвонам в один клик\n\n"
        "💰 *Подписка — 599 ₽/месяц*\n"
        "В 2 раза выгоднее аналогов!\n\n"
        "👇 Нажми кнопку ниже и начни работать комфортно",
        parse_mode="Markdown",
        reply_markup=kb
    )


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())