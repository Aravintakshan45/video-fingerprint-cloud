"""Pydantic I/O schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FingerprintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    frame_hash: str
    client_ts: datetime
    created_at: datetime
    session_id: uuid.UUID
    line_no: int


class UploadResult(BaseModel):
    session_id: uuid.UUID
    total: int
    inserted: int
    duplicates: int
    failed: int
    fingerprints: list[FingerprintOut]


class VerifyRequest(BaseModel):
    frame_descriptor: str = Field(min_length=1)


class VerifyResponse(BaseModel):
    submitted_hash: str
    matched: bool
    record: FingerprintOut | None = None
