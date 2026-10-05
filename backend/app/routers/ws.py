"""WebSocket endpoint for the live dashboard feed."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..ws_manager import ws_manager

router = APIRouter()


@router.websocket("/ws/fingerprints")
async def ws_fingerprints(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)
    except Exception:
        await ws_manager.disconnect(ws)
