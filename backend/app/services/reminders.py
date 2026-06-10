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

_JOB_ID_24H = "reminder_24h_{}"
_JOB_ID_1H = "reminder_1h_{}"
_JOB_ID_SPEC = "reminder_spec_1h_{}"


async def _send_reminder(session_id: str, reminder_type_value: str) -> None:
    reminder_type = ReminderType(reminder_type_value)
    bot = Bot(token=settings.BOT_TOKEN)

    try:
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
            meeting_url = client.meeting_url or ""
            reminder_text = client.reminder_text or "Напоминание о занятии"
            time_str = session.scheduled_at.strftime("%d.%m.%Y %H:%M")

            if reminder_type == ReminderType.specialist_1h:
                buttons = []
                if meeting_url:
                    buttons.append([InlineKeyboardButton(text="Открыть встречу", url=meeting_url)])
                kb = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None
                await bot.send_message(
                    chat_id=specialist.tg_id,
                    text=f"🔔 {reminder_text}\n\nКлиент: {client.name}\nВремя: {time_str}",
                    reply_markup=kb,
                )
            elif reminder_type in (ReminderType.client_24h, ReminderType.client_1h):
                if client.client_tg_id:
                    buttons = []
                    if meeting_url:
                        buttons.append([InlineKeyboardButton(text="Подключиться", url=meeting_url)])
                    kb = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None
                    await bot.send_message(
                        chat_id=client.client_tg_id,
                        text=f"🔔 {reminder_text}\n\nВремя занятия: {time_str}",
                        reply_markup=kb,
                    )

            rem_result = await db.execute(
                select(Reminder).where(
                    Reminder.session_id == session.id,
                    Reminder.reminder_type == reminder_type,
                )
            )
            reminder = rem_result.scalar_one_or_none()
            if reminder:
                reminder.sent = True
            await db.commit()

    except Exception:
        pass
    finally:
        await bot.session.close()


def schedule_session_reminders(session_id: str, scheduled_at: datetime) -> None:
    now = datetime.now(timezone.utc)

    jobs = [
        (_JOB_ID_24H.format(session_id), scheduled_at - timedelta(hours=24), ReminderType.client_24h),
        (_JOB_ID_1H.format(session_id), scheduled_at - timedelta(hours=1), ReminderType.client_1h),
        (_JOB_ID_SPEC.format(session_id), scheduled_at - timedelta(hours=1), ReminderType.specialist_1h),
    ]

    for job_id, run_date, reminder_type in jobs:
        if run_date > now:
            scheduler.add_job(
                _send_reminder,
                trigger="date",
                run_date=run_date,
                args=[session_id, reminder_type.value],
                id=job_id,
                replace_existing=True,
            )


def cancel_session_reminders(session_id: str) -> None:
    for job_id in (
        _JOB_ID_24H.format(session_id),
        _JOB_ID_1H.format(session_id),
        _JOB_ID_SPEC.format(session_id),
    ):
        try:
            scheduler.remove_job(job_id)
        except Exception:
            pass


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