from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UUID,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.Base import Base

if TYPE_CHECKING:
    from app.db.models.Deployment import Deployment
    from app.db.models.User import User


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    platform: Mapped[str] = mapped_column(String(50), nullable=False)

    repo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    root_directory: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    branch: Mapped[str] = mapped_column(String(255), nullable=False, default="main")

    framework: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    build_command: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    output_directory: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    install_command: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    node_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner: Mapped["User"] = relationship(back_populates="projects")

    deployments: Mapped[List["Deployment"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_projects_owner_created", "owner_id", "created_at"),
    )
