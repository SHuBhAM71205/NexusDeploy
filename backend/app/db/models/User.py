from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import enum

from sqlalchemy import (
    String,
    Boolean,
    Enum,
    UUID,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    Text,
    func
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.models.Base import Base

if TYPE_CHECKING:
    from app.db.models.RefreshToken import RefreshToken

class UserStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success" 
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    email: Mapped[str] = mapped_column(
        String(255), 
        unique=True, 
        nullable=False, 
        index=True
    )
    
    name: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True,
        index=True
    )
    
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status_enum"),
        default=UserStatus.PENDING,
        nullable=False
    )
    
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    lockout_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    is_verified: Mapped[bool] = mapped_column(
        Boolean(),
        default=False,
        nullable=False
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )
    
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    profile_pic_url : Mapped[String] = mapped_column(
        String(255),
        nullable=True
    )
    
    oauth_details: Mapped[List["OAuthDetail"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        # Useful if your admin dashboard filters users by status and email frequently
        Index("ix_users_email_status", "email", "status"),
    )

class OAuthDetail(Base):
    __tablename__ = "oauth_details"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    provider_user_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )

    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scopes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    user: Mapped["User"] = relationship(
        back_populates="oauth_details"
    )
    
    
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),
        Index("ix_oauth_details_user_provider", "user_id", "provider")
    )