from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('sessions', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'bio')
    op.drop_column('sessions', 'notes')