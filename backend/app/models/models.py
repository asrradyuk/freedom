import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class SessionPaymentStatus(str, enum.Enum):
    paid = "paid"
    unpaid = "unpaid"


class ReminderType(str, enum.Enum):
    client_24h = "client_24h"
    client_1h = "client_1h"
    specialist_1h = "specialist_1h"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(64))
    first_name: Mapped[str | None] = mapped_column(String(128))

    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.inactive
    )
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    clients: Mapped[list["Client"]] = relationship(back_populates="specialist", cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    specialist_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))

    name: Mapped[str] = mapped_column(String(256), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    meeting_url: Mapped[str | None] = mapped_column(String(512))
    livekit_room: Mapped[str | None] = mapped_column(String(256))

    client_tg_id: Mapped[int | None] = mapped_column(BigInteger)

    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_text: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    specialist: Mapped["User"] = relationship(back_populates="clients")
    sessions: Mapped[list["Session"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    materials: Mapped[list["Material"]] = relationship(back_populates="client", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"))

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payment_status: Mapped[SessionPaymentStatus] = mapped_column(
        Enum(SessionPaymentStatus), default=SessionPaymentStatus.unpaid
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    client: Mapped["Client"] = relationship(back_populates="sessions")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"))

    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(128))

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    client: Mapped["Client"] = relationship(back_populates="materials")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))

    reminder_type: Mapped[ReminderType] = mapped_column(Enum(ReminderType), nullable=False)
    sent: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["Session"] = relationship(back_populates="reminders")