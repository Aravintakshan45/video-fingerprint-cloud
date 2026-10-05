"""REST endpoints: upload, list, verify, single, exists."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel as _BM, Field as _F
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..models import Fingerprint, Session
from ..schemas import FingerprintOut, UploadResult, VerifyRequest, VerifyResponse
from ..security import parse_descriptor_file, sha256_hex
from ..ws_manager import ws_manager

router = APIRouter(prefix="/api/fingerprints", tags=["fingerprints"])


@router.post("/upload", response_model=UploadResult)
async def upload_fingerprints(
    db: Annotated[AsyncSession, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
    label: Annotated[str, Form()] = "driver-session",
):
    if not file.filename or not file.filename.endswith(".txt"):
        raise HTTPException(400, "Only .txt files are accepted")

    raw = (await file.read()).decode("utf-8", errors="replace")
    rows = parse_descriptor_file(raw)
    if not rows:
        raise HTTPException(400, "File contains no descriptors")

    session = Session(label=label)
    db.add(session)
    await db.flush()

    inserted, duplicates, failed = 0, 0, 0
    saved: list[Fingerprint] = []

    for line_no, descriptor in rows:
        digest = sha256_hex(descriptor)
        fp = Fingerprint(
            frame_hash=digest,
            client_ts=datetime.now(timezone.utc),
            session_id=session.id,
            line_no=line_no,
        )
        db.add(fp)
        try:
            await db.flush()
            inserted += 1
            saved.append(fp)
            await ws_manager.broadcast(
                {
                    "type": "fingerprint",
                    "data": FingerprintOut.model_validate(fp).model_dump(mode="json"),
                }
            )
        except IntegrityError:
            await db.rollback()
            db.add(session)
            await db.flush()
            duplicates += 1
        except Exception:
            await db.rollback()
            db.add(session)
            await db.flush()
            failed += 1

    await db.commit()
    for fp in saved:
        await db.refresh(fp)

    return UploadResult(
        session_id=session.id,
        total=len(rows),
        inserted=inserted,
        duplicates=duplicates,
        failed=failed,
        fingerprints=[FingerprintOut.model_validate(fp) for fp in saved],
    )


@router.get("", response_model=list[FingerprintOut])
async def list_fingerprints(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
):
    limit = max(1, min(limit, 500))
    result = await db.execute(
        select(Fingerprint).order_by(Fingerprint.created_at.desc()).limit(limit)
    )
    return [FingerprintOut.model_validate(row) for row in result.scalars().all()]


@router.post("/verify", response_model=VerifyResponse)
async def verify(
    payload: VerifyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    digest = sha256_hex(payload.frame_descriptor.strip())
    result = await db.execute(
        select(Fingerprint).where(Fingerprint.frame_hash == digest)
    )
    row = result.scalar_one_or_none()

    if row is None:
        return VerifyResponse(
            submitted_hash=digest,
            matched=False,
            record=None,
        )

    return VerifyResponse(
        submitted_hash=digest,
        matched=True,
        record=FingerprintOut.model_validate(row),
    )


class SingleFingerprintIn(_BM):
    frame_hash: str = _F(min_length=64, max_length=64)
    client_ts: str
    session_id: str


@router.post("/single", status_code=201)
async def upload_single(
    payload: SingleFingerprintIn,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Insert one pre-hashed fingerprint (used by the mobile Encoder)."""
    import uuid as _uuid
    from datetime import datetime as _dt

    try:
        sid = _uuid.UUID(payload.session_id)
    except ValueError:
        raise HTTPException(400, "session_id must be a valid UUID")

    existing = await db.get(Session, sid)
    if existing is None:
        db.add(Session(id=sid, label="encoder-session"))
        await db.flush()

    try:
        ts = _dt.fromisoformat(payload.client_ts.replace("Z", "+00:00"))
    except ValueError:
        ts = _dt.now(timezone.utc)

    fp = Fingerprint(
        frame_hash=payload.frame_hash,
        client_ts=ts,
        session_id=sid,
        line_no=0,
    )
    db.add(fp)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "duplicate fingerprint")
    except Exception:
        await db.rollback()
        raise HTTPException(500, "insert failed")

    await db.commit()
    await db.refresh(fp)

    await ws_manager.broadcast(
        {
            "type": "fingerprint",
            "data": FingerprintOut.model_validate(fp).model_dump(mode="json"),
        }
    )
    return {"ok": True, "id": str(fp.id)}


class ExistsIn(_BM):
    frame_hash: str


@router.post("/exists")
async def exists(
    payload: ExistsIn,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return whether a given SHA-256 hash exists in the ledger."""
    result = await db.execute(
        select(Fingerprint.id).where(Fingerprint.frame_hash == payload.frame_hash)
    )
    row = result.scalar_one_or_none()
    return {"exists": row is not None}
