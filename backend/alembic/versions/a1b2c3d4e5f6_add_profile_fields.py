"""add profile fields

Revision ID: a1b2c3d4e5f6
Revises: 5a037b8ffdbb
Create Date: 2026-05-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '5a037b8ffdbb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('display_name', sa.String(length=128), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'display_name')