"""
Perceptual hashing — aHash, dHash, pHash, wHash.
"""
from __future__ import annotations

import io

import numpy as np
from PIL import Image


def _to_gray(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("L")


def ahash(data: bytes, hash_size: int = 8) -> str:
    """Average hash."""
    img = _to_gray(data).resize((hash_size, hash_size), Image.LANCZOS)
    px = np.asarray(img, dtype=np.float32)
    mean = px.mean()
    bits = (px > mean).flatten()
    return "".join("1" if b else "0" for b in bits)


def dhash(data: bytes, hash_size: int = 8) -> str:
    """Difference hash."""
    img = _to_gray(data).resize((hash_size + 1, hash_size), Image.LANCZOS)
    px = np.asarray(img, dtype=np.int16)
    diff = px[:, 1:] > px[:, :-1]
    return "".join("1" if b else "0" for b in diff.flatten())


def phash(data: bytes, hash_size: int = 8, highfreq_factor: int = 4) -> str:
    """Perceptual hash (DCT-based)."""
    from scipy.fftpack import dct

    size = hash_size * highfreq_factor
    img = _to_gray(data).resize((size, size), Image.LANCZOS)
    px = np.asarray(img, dtype=np.float32)
    dct_result = dct(dct(px, axis=0, norm="ortho"), axis=1, norm="ortho")
    low = dct_result[:hash_size, :hash_size]
    med = np.median(low)
    bits = (low > med).flatten()
    return "".join("1" if b else "0" for b in bits)


def whash(data: bytes, hash_size: int = 8, image_size: int = 256) -> str:
    """Wavelet hash."""
    import pywt

    img = _to_gray(data).resize((image_size, image_size), Image.LANCZOS)
    px = np.asarray(img, dtype=np.float32)
    level = max(1, int(np.log2(image_size // hash_size)))
    coeffs = pywt.wavedec2(px, "haar", level=level)
    ll = coeffs[0][:hash_size, :hash_size]
    med = np.median(ll)
    bits = (ll > med).flatten()
    return "".join("1" if b else "0" for b in bits)


ALGORITHMS = {
    "aHash": ahash,
    "dHash": dhash,
    "pHash": phash,
    "wHash": whash,
}


def hash_all(data: bytes) -> dict[str, str]:
    return {name: fn(data) for name, fn in ALGORITHMS.items()}
