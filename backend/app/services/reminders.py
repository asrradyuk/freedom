from datetime import datetime, timedelta, timezone

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import async_session_factory
from app.models.models import Client, Reminder, ReminderType, Session

scheduler = AsyncIOScheduler(timezone="UTC")


async def _send_reminder(session_id: str) -> None:
    async with async_session_factory() as db:
        result = await db.execute(
            select(Session)
            .options(selectinload(Session.client).selectinload(Client.specialist))
            .where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return

        client = session.client
        specialist = client.specialist
        bot = Bot(token=settings.BOT_TOKEN)

        meeting_url = client.meeting_url or ""
        reminder_text = client.reminder_text or "Напоминание о занятии"

        buttons = []
        if meeting_url:
            buttons.append([InlineKeyboardButton(text="Открыть встречу", url=meeting_url)])
        specialist_kb = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None

        try:
            await bot.send_message(
                chat_id=specialist.tg_id,
                text=f"🔔 {reminder_text}\n\nКлиент: {client.name}\n"
                     f"Время: {session.scheduled_at.strftime('%H:%M')}",
                reply_markup=specialist_kb,
            )
        except Exception:
            pass

        if client.client_tg_id:
            client_buttons = []
            if meeting_url:
                client_buttons.append([InlineKeyboardButton(text="Подключиться", url=meeting_url)])
            client_kb = InlineKeyboardMarkup(inline_keyboard=client_buttons) if client_buttons else None

            try:
                await bot.send_message(
                    chat_id=client.client_tg_id,
                    text=f"🔔 {reminder_text}",
                    reply_markup=client_kb,
                )
            except Exception:
                pass

        result = await db.execute(
            select(Reminder).where(Reminder.session_id == session.id)
        )
        for reminder in result.scalars().all():
            reminder.sent = True
        await db.commit()

        await bot.session.close()


def schedule_session_reminders(session_id: str, scheduled_at: datetime) -> None:
    now = datetime.now(timezone.utc)

    at_24h = scheduled_at - timedelta(hours=24)
    at_1h = scheduled_at - timedelta(hours=1)

    if at_24h > now:
        scheduler.add_job(
            _send_reminder,
            trigger="date",
            run_date=at_24h,
            args=[session_id],
            id=f"reminder_24h_{session_id}",
            replace_existing=True,
        )

    if at_1h > now:
        scheduler.add_job(
            _send_reminder,
            trigger="date",
            run_date=at_1h,
            args=[session_id],
            id=f"reminder_1h_{session_id}",
            replace_existing=True,
        )


async def reschedule_pending_reminders() -> None:
    async with async_session_factory() as db:
        result = await db.execute(
            select(Session)
            .options(selectinload(Session.reminders))
            .where(Session.scheduled_at > datetime.now(timezone.utc))
        )
        sessions = result.scalars().all()
        for session in sessions:
            has_unsent = any(not r.sent for r in session.reminders)
            if has_unsent:
                schedule_session_reminders(str(session.id), session.scheduled_at)