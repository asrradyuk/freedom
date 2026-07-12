# FREEDOM — Telegram Mini App для специалистов

## Описание продукта

Telegram Mini App для специалистов (репетиторы, психологи, консультанты), который позволяет вести клиентов, планировать занятия, хранить материалы, отправлять напоминания и отслеживать оплату. Работает внутри Telegram без отдельной регистрации.

**Ссылка на приложение:** https://freedom-ouep.vercel.app  
**Бот:** @[имя бота]  
**GitHub репо:** https://github.com/asrradyuk/freedom

---

## Стек технологий

### Frontend
- React 19 + Vite 5.4
- Zustand (стейт-менеджмент)
- Axios (HTTP клиент)
- CSS Modules
- Деплой: Vercel (проект `freedom-ouep`)

### Backend
- Python 3.11 + FastAPI 0.115
- SQLAlchemy 2.0 (async) + asyncpg
- Alembic (миграции — запускаются автоматически при старте через lifespan)
- APScheduler (напоминания)
- aiogram 3.7 (бот)
- livekit-api 0.7.1 (видеозвонки)
- Деплой: Render.com (сервис `freedom`, Root Directory: `backend`)
- Python version: 3.11.0 (файл `.python-version` в папке `backend`)

### База данных
- PostgreSQL (облачная на Render)
- Подключение через `DATABASE_URL` с asyncpg драйвером: `postgresql+asyncpg://...`

---

## Структура репозитория

```
freedom/
├── backend/
│   ├── .python-version          # "3.11.0"
│   ├── Procfile                 # web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py               # async миграции, читает DATABASE_URL из settings
│   │   └── versions/
│   └── app/
│       ├── main.py              # lifespan: mkdir uploads, alembic upgrade head, scheduler, reminders
│       ├── api/v1/
│       │   ├── router.py
│       │   └── endpoints/
│       │       ├── auth.py
│       │       ├── clients.py
│       │       ├── sessions.py
│       │       ├── materials.py
│       │       ├── livekit.py
│       │       └── subscription.py
│       ├── core/
│       │   ├── config.py        # pydantic-settings
│       │   ├── deps.py          # get_current_user через Telegram initData
│       │   └── telegram.py      # verify_telegram_init_data (hmac)
│       ├── db/session.py        # async engine + get_db
│       ├── models/models.py     # User, Client, Session, Material, Reminder
│       ├── schemas/schemas.py
│       └── services/
│           ├── livekit.py       # create_room_name, generate_token
│           └── reminders.py     # APScheduler, reschedule_pending_reminders (с try/except)
├── bot/
│   ├── bot.py                   # aiogram 3.28, /start /app /status /activate
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── package.json             # vite 5.4, react 19, zustand, axios
    ├── vite.config.js           # proxy /api -> localhost:8000
    └── src/
        ├── App.jsx              # роутинг по role (null→RoleSelect, client→ClientView, specialist→основной интерфейс)
        ├── api/index.js         # axios клиент, X-Init-Data заголовок
        ├── store/index.js       # zustand: user, clients, role (localStorage), activeScreen
        ├── hooks/useTelegram.js
        ├── components/
        │   ├── ui/              # Button, Card, BottomSheet, Input (CSS Modules)
        │   └── layout/BottomNav.jsx  # 3 вкладки: Встречи / Клиенты / Аккаунт
        └── screens/
            ├── RoleSelectScreen.jsx      # выбор роли при первом входе
            ├── HomeScreen.jsx            # встречи сегодня и завтра
            ├── ClientsScreen.jsx         # список клиентов
            ├── ClientScreen.jsx          # карточка клиента
            ├── SessionsScreen.jsx        # занятия
            ├── MaterialsScreen.jsx       # файлы
            ├── SubscriptionScreen.jsx    # подписка (вкладка "Аккаунт")
            └── ClientViewScreen.jsx      # интерфейс для клиентов
```

---

## Переменные окружения

### Backend (.env / Render Environment)
```
DATABASE_URL=postgresql+asyncpg://user:pass@host/freedom
BOT_TOKEN=8196873089:AAH4t1AYirFh3DAVztCKzaLPPp7OA_cF9_U
BOT_SECRET=bsnanajsnaj
LIVEKIT_URL=wss://placeholder.com
LIVEKIT_API_KEY=placeholder
LIVEKIT_API_SECRET=placeholder
ADMIN_IDS=[6425298190]
YUKASSA_SECRET_KEY=live_9fNfiFQYKuTrCvmsUxnRbTOBMeM6zyB5B-YP1lmTERU
YUKASSA_SHOP_ID=1346850
PAYMENT_URL=https://ваша-ссылка-оплаты
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=50
```

### Frontend (.env / Vercel Environment Variables)
```
VITE_API_URL=https://freedom-b3m3.onrender.com/api/v1
VITE_PAYMENT_URL=https://ваша-ссылка-оплаты
```

### Bot (.env)
```
BOT_TOKEN=...
PAYMENT_URL=...
WEBAPP_URL=https://freedom-ouep.vercel.app
API_URL=https://freedom-b3m3.onrender.com/api/v1
ADMIN_IDS=[6425298190]
```

---

## Модели базы данных

### User
- `id` BigInteger PK
- `tg_id` BigInteger unique
- `username`, `first_name` String
- `subscription_status` enum: active/inactive (default: inactive)
- `subscription_expires_at` DateTime

### Client
- `id` UUID PK
- `specialist_id` FK → users
- `name`, `note`, `meeting_url`, `livekit_room`
- `client_tg_id` BigInteger (для отправки напоминаний)
- `reminders_enabled` bool, `reminder_text`

### Session
- `id` UUID PK
- `client_id` FK → clients
- `scheduled_at` DateTime
- `payment_status` enum: paid/unpaid

### Material
- `id` UUID PK
- `client_id` FK → clients
- `filename` (путь на диске), `original_name`, `file_size`, `mime_type`

### Reminder
- `id` UUID PK
- `session_id` FK → sessions
- `reminder_type` enum: client_24h/client_1h/specialist_1h
- `sent` bool (default: false)
- Создаются автоматически при создании Session (3 штуки)

---

## API эндпоинты

Все эндпоинты требуют заголовок `X-Init-Data` с Telegram initData.

```
POST   /api/v1/auth                           # авторизация/регистрация
GET    /api/v1/clients                        # список клиентов специалиста
POST   /api/v1/clients                        # создать клиента (требует подписку)
GET    /api/v1/clients/{id}
PATCH  /api/v1/clients/{id}
DELETE /api/v1/clients/{id}
GET    /api/v1/clients/{id}/sessions
POST   /api/v1/clients/{id}/sessions         # требует подписку
PATCH  /api/v1/clients/{id}/sessions/{id}
DELETE /api/v1/clients/{id}/sessions/{id}
GET    /api/v1/clients/{id}/materials
POST   /api/v1/clients/{id}/materials        # upload файла, требует подписку
GET    /api/v1/clients/{id}/materials/{id}/download
DELETE /api/v1/clients/{id}/materials/{id}
POST   /api/v1/livekit/token/{client_id}     # токен для специалиста, требует подписку
POST   /api/v1/livekit/client-token/{id}     # токен для клиента (без auth)
GET    /api/v1/subscription
POST   /api/v1/subscription/confirm          # кнопка "я оплатил" (временно)
POST   /api/v1/subscription/admin/activate   # ручная активация (только ADMIN_IDS)
GET    /health
```

---

## Бизнес-логика

### Роли
- **Специалист** — платит подписку, ведёт клиентов. Видит: Встречи, Клиенты, Аккаунт
- **Клиент** — не платит ничего. Видит: свои занятия и кнопку подключиться к встрече
- Роль выбирается при первом входе, сохраняется в `localStorage`

### Подписка
- Платит **специалист**, 599 ₽/месяц
- Без подписки: нельзя создавать клиентов, занятия, загружать материалы, делать видеозвонки
- С подпиской: полный доступ на 30 дней
- Оплата через ЮКасса (shop_id: 1346850)
- Сейчас: ручная активация через /activate в боте (ADMIN_IDS)
- Планируется: вебхук ЮКасса для автоматической активации

### Напоминания
- Создаются автоматически при создании занятия (3 шт: client_24h, client_1h, specialist_1h)
- Отправляются через бота
- Клиенту нужно один раз написать /start боту
- APScheduler планирует задачи при старте сервера (reschedule_pending_reminders)
- ВАЖНО: reschedule_pending_reminders обёрнута в try/except чтобы не падать если таблиц нет

### Встречи/видеозвонки
- Без подписки: поле для ссылки на Zoom/Google Meet/etc в карточке клиента
- С подпиской: LiveKit комната (создаётся автоматически при создании клиента)
- LiveKit сервер нужно развернуть отдельно

---

## Текущий статус деплоя

### Render (бэкенд)
- URL: https://freedom-b3m3.onrender.com
- Статус: в процессе — падает с ошибкой `relation "sessions" does not exist`
- Причина: миграции не применяются перед запуском reminders
- Фикс: в `lifespan` добавить `command.upgrade(alembic_cfg, "head")` ДО `reschedule_pending_reminders`
- `reschedule_pending_reminders` должна быть обёрнута в `try/except`

### Vercel (фронтенд)
- URL: https://freedom-ouep.vercel.app
- Статус: задеплоен, работает
- Root Directory в Vercel настроен на `frontend`

### Бот
- Запускается локально: `cd bot && source .venv/bin/activate && python3 bot.py`
- Команды: /start, /app, /status, /activate <tg_id>
- Нужно задеплоить рядом с бэком или отдельно

---

## Известные проблемы и что нужно сделать

1. **КРИТИЧНО**: Render падает — нужно добавить alembic migrate в lifespan до reminders
2. **КРИТИЧНО**: После фикса Render — обновить `VITE_API_URL` в Vercel на Render URL
3. Вебхук ЮКасса для автоматической активации подписки (эндпоинт ещё не написан)
4. Бот не задеплоен (нужен отдельный воркер на Render или другой хостинг)
5. LiveKit сервер не настроен (сейчас placeholder)
6. Клиентский экран (`ClientViewScreen`) — заглушка, не показывает реальные занятия из БД
7. `deps.py` должен использовать реальную Telegram initData верификацию (не заглушку)

---

## Дизайн-система

### Цвета
```css
--milk: #FAFAF7          /* фон */
--blue-light: #B5D4F4    /* акцент светлый */
--blue-mid: #378ADD      /* основной синий */
--blue-dark: #0C447C     /* тёмный синий */
--blue-text: #185FA5
--gray-light: #D3D1C7
--gray-mid: #888780
--gray-dark: #2C2C2A
```

### Шрифты
- Заголовки: `Unbounded` (Google Fonts)
- Текст: `Golos Text` (Google Fonts)
