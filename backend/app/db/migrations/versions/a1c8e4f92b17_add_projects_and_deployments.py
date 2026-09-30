"""add_projects_and_deployments

Revision ID: a1c8e4f92b17
Revises: d2bc5540dcb3
Create Date: 2026-09-27 14:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1c8e4f92b17"
down_revision: Union[str, Sequence[str], None] = "d2bc5540dcb3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("platform", sa.String(length=50), nullable=False),
        sa.Column("repo_url", sa.String(length=512), nullable=True),
        sa.Column("root_directory", sa.Text(), nullable=True),
        sa.Column("branch", sa.String(length=255), nullable=False),
        sa.Column("framework", sa.String(length=100), nullable=True),
        sa.Column("build_command", sa.String(length=255), nullable=True),
        sa.Column("output_directory", sa.String(length=255), nullable=True),
        sa.Column("install_command", sa.String(length=255), nullable=True),
        sa.Column("node_version", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_owner_id"), "projects", ["owner_id"], unique=False)
    op.create_index("ix_projects_owner_created", "projects", ["owner_id", "created_at"], unique=False)

    op.create_table(
        "deployments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("job_id", sa.String(length=255), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("url", sa.String(length=512), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("environment", sa.String(length=50), nullable=False),
        sa.Column("branch", sa.String(length=255), nullable=True),
        sa.Column("provider_metadata", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deployments_project_id"), "deployments", ["project_id"], unique=False)
    op.create_index(op.f("ix_deployments_job_id"), "deployments", ["job_id"], unique=True)
    op.create_index("ix_deployments_project_created", "deployments", ["project_id", "created_at"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_deployments_project_created", table_name="deployments")
    op.drop_index(op.f("ix_deployments_job_id"), table_name="deployments")
    op.drop_index(op.f("ix_deployments_project_id"), table_name="deployments")
    op.drop_table("deployments")
    op.drop_index("ix_projects_owner_created", table_name="projects")
    op.drop_index(op.f("ix_projects_owner_id"), table_name="projects")
    op.drop_table("projects")
