"""REST endpoints for perceptual hashing and distance metrics."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..perceptual.hashes import ALGORITHMS, hash_all
from ..perceptual.metrics import DEFAULT_THRESHOLDS, compare_all

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.post("/hash")
async def hash_frame(file: Annotated[UploadFile, File(...)]):
    """Compute all 4 perceptual hashes for one image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are accepted")
    data = await file.read()
    hashes = hash_all(data)
    return {
        "filename": file.filename,
        "hashes": hashes,
        "lengths": {k: len(v) for k, v in hashes.items()},
    }


@router.post("/compare")
async def compare_frames(
    file_a: Annotated[UploadFile, File(...)],
    file_b: Annotated[UploadFile, File(...)],
):
    """Compute all hashes for two images and compare with every metric."""
    data_a = await file_a.read()
    data_b = await file_b.read()
    hashes_a = hash_all(data_a)
    hashes_b = hash_all(data_b)

    results: dict[str, dict] = {}
    for name in ALGORITHMS:
        metrics = compare_all(hashes_a[name], hashes_b[name])
        metrics["matched"] = metrics["hamming"] <= DEFAULT_THRESHOLDS[name]
        metrics["threshold"] = DEFAULT_THRESHOLDS[name]
        results[name] = metrics

    return {
        "file_a": file_a.filename,
        "file_b": file_b.filename,
        "hashes_a": hashes_a,
        "hashes_b": hashes_b,
        "results": results,
    }


@router.get("/thresholds")
async def get_thresholds():
    return {"thresholds": DEFAULT_THRESHOLDS}
