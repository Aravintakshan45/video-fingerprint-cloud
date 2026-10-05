import type { Fingerprint, WSMessage } from "./types";

let _ws: WebSocket | null = null;

export function connectFingerprintWS(
  onMessage: (fp: Fingerprint) => void
): WebSocket {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/ws/fingerprints`;
  const ws = new WebSocket(url);

  ws.onmessage = (evt) => {
    try {
      const msg: WSMessage = JSON.parse(evt.data);
      if (msg.type === "fingerprint") onMessage(msg.data);
    } catch {
      /* ignore malformed */
    }
  };

  ws.onclose = () => console.warn("WS closed:", url);
  ws.onerror = (e) => console.warn("WS error:", e);

  _ws = ws;
  return ws;
}

export function closeFingerprintWS() {
  if (_ws) {
    try { _ws.close(); } catch { /* ignore */ }
    _ws = null;
  }
}
