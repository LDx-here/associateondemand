"""Document intake tables for Strong Reader pipeline."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_documents"
down_revision: Union[str, None] = "001_agent_jobs_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("external_id", sa.String(length=128), nullable=False),
        sa.Column("filename", sa.String(length=512), nullable=False),
        sa.Column("stored_path", sa.String(length=1024), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=True),
        sa.Column("ocr_method", sa.String(length=64), nullable=True),
        sa.Column("processing_status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("category", sa.String(length=128), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_external_id", "documents", ["external_id"])

    op.create_table(
        "extracted_facts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("document_id", sa.String(length=36), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("external_id", sa.String(length=128), nullable=False),
        sa.Column("fact_type", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("source_page", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_extracted_facts_document_id", "extracted_facts", ["document_id"])
    op.create_index("ix_extracted_facts_external_id", "extracted_facts", ["external_id"])


def downgrade() -> None:
    op.drop_table("extracted_facts")
    op.drop_table("documents")
