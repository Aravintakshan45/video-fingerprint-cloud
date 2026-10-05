"""FastAPI entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import fingerprints, metrics, ws

app = FastAPI(
    title="Video Fingerprint Cloud API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fingerprints.router)
app.include_router(metrics.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
