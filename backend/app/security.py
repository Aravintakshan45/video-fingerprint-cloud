"""SHA-256 helpers."""
import hashlib


def sha256_hex(data: str | bytes) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def parse_descriptor_file(content: str) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    for i, raw in enumerate(content.splitlines(), start=1):
        s = raw.strip()
        if not s or s.startswith("#"):
            continue
        rows.append((i, s))
    return rows
