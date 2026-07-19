# FREEDOM — Telegram Mini App для специалистов

Приложение для репетиторов, психологов и консультантов. Управление клиентами, занятиями, материалами, видеозвонками и напоминаниями — прямо внутри Telegram.

## Стек

**Frontend:** React 19 + Vite, Zustand, Axios, CSS Modules → Vercel  
**Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0 async, APScheduler, aiogram 3 → Render  
**БД:** PostgreSQL (Supabase)  
**Видео:** LiveKit Cloud  
**Платежи:** ЮКасса  
**Хранилище:** Telegram Bot API (файлы материалов)

## Структура репозитория

```
freedom/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, clients, sessions, materials, livekit, subscription, profile
│   │   ├── core/               # config, deps (Telegram auth), telegram (HMAC verify)
│   │   ├── db/                 # async engine, session
│   │   ├── models/             # User, Client, Session, Material, Reminder
│   │   ├── schemas/            # Pydantic схемы
│   │   └── services/           # livekit, reminders, storage
│   ├── alembic/                # миграции БД
│   ├── main.py                 # lifespan: scheduler, ping, bot polling
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/                # axios клиент, X-Init-Data заголовок
    │   ├── components/         # Button, Card, Input, BottomSheet, BottomNav
    │   ├── hooks/              # useTelegram
    │   ├── screens/            # все экраны приложения
    │   └── store/              # Zustand store с persist
    ├── index.html
    └── vite.config.js
```

## Быстрый старт

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # заполни переменные
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

## Переменные окружения

### Backend `.env`

```
DATABASE_URL=postgresql+asyncpg://user:pass@host/freedom
BOT_TOKEN=
BOT_SECRET=
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
WEBAPP_URL=https://your-app.vercel.app
YUKASSA_SHOP_ID=
YUKASSA_SECRET_KEY=
ADMIN_IDS=[123456789]
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=50
STORAGE_CHAT_ID=   # ID приватного Telegram-канала для хранения файлов
```

### Frontend `.env`

```
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

## Деплой

**Backend → Render**
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Python Version: 3.11.0 (файл `.python-version`)

**Frontend → Vercel**
- Root Directory: `frontend`
- Framework: Vite
- Build Command: `npm run build`

## Функционал

| Роль | Возможности |
|---|---|
| Специалист | Клиенты, занятия, материалы, видеозвонки, напоминания, учёт оплат |
| Клиент | Расписание, подключение к звонкам, просмотр материалов |

**Подписка:** 599 ₽/месяц, оплата через ЮКассу, автоактивация через вебхук

**Напоминания:** автоматически за 24 часа и 1 час до занятия — специалисту и клиенту

**Хранилище файлов:** загрузка через Telegram Bot API в приватный канал, без сторонних платных сервисов

## Авторизация

Используется Telegram WebApp `initData` — HMAC-SHA256 верификация на бэкенде. Никаких паролей и отдельной регистрации.
