import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.models import ReminderType, SessionPaymentStatus, SessionStatus, SubscriptionStatus


class TelegramAuthRequest(BaseModel):
    init_data: str


class UserOut(BaseModel):
    tg_id: int
    username: str | None
    first_name: str | None
    display_name: str | None
    avatar_url: str | None
    bio: str | None
    subscription_status: SubscriptionStatus
    subscription_expires_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=128)
    avatar_url: str | None = None
    bio: str | None = Field(default=None, max_length=500)


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=256)
    note: str | None = None
    meeting_url: str | None = None
    client_tg_id: int | None = None
    reminders_enabled: bool = False
    reminder_text: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=256)
    note: str | None = None
    meeting_url: str | None = None
    client_tg_id: int | None = None
    reminders_enabled: bool | None = None
    reminder_text: str | None = None


class ClientOut(BaseModel):
    id: uuid.UUID
    name: str
    note: str | None
    meeting_url: str | None
    livekit_room: str | None
    client_tg_id: int | None
    reminders_enabled: bool
    reminder_text: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    scheduled_at: datetime
    payment_status: SessionPaymentStatus = SessionPaymentStatus.unpaid
    notes: str | None = None
    homework: str | None = None
    package_id: uuid.UUID | None = None


class SessionUpdate(BaseModel):
    scheduled_at: datetime | None = None
    payment_status: SessionPaymentStatus | None = None
    status: SessionStatus | None = None
    notes: str | None = None
    homework: str | None = None
    package_id: uuid.UUID | None = None


class SessionOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    scheduled_at: datetime
    payment_status: SessionPaymentStatus
    status: SessionStatus
    notes: str | None
    homework: str | None
    package_id: uuid.UUID | None
    created_at: datetime
    model_config = {"from_attributes": True}


class PackageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=256)
    total_sessions: int = Field(gt=0)
    price: int | None = None


class PackageUpdate(BaseModel):
    name: str | None = None
    remaining_sessions: int | None = None
    price: int | None = None


class PackageOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    name: str
    total_sessions: int
    remaining_sessions: int
    price: int | None
    created_at: datetime
    model_config = {"from_attributes": True}


class MaterialOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    filename: str
    original_name: str
    display_name: str | None
    file_size: int
    mime_type: str | None
    folder: str | None
    uploaded_at: datetime
    model_config = {"from_attributes": True}


class SubscriptionUpdate(BaseModel):
    status: SubscriptionStatus
    expires_at: datetime | None = None


class LiveKitTokenOut(BaseModel):
    token: str
    room: str
    url: str


class ReminderOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    reminder_type: ReminderType
    sent: bool
    model_config = {"from_attributes": True}