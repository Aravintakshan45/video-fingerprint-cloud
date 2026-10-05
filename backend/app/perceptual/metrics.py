"""Distance and similarity metrics for perceptual hashes."""
from __future__ import annotations

import numpy as np


def hamming_distance(h1: str, h2: str) -> int:
    if len(h1) != len(h2):
        raise ValueError("Hashes must be same length")
    return sum(a != b for a, b in zip(h1, h2))


def normalized_hamming(h1: str, h2: str) -> float:
    return hamming_distance(h1, h2) / len(h1)


def _to_vec(h: str) -> np.ndarray:
    return np.array([int(c) for c in h], dtype=np.int8)


def euclidean_distance(h1: str, h2: str) -> float:
    return float(np.linalg.norm(_to_vec(h1) - _to_vec(h2)))


def manhattan_distance(h1: str, h2: str) -> float:
    return float(np.abs(_to_vec(h1) - _to_vec(h2)).sum())


def cosine_similarity(h1: str, h2: str) -> float:
    a = _to_vec(h1).astype(np.float32)
    b = _to_vec(h2).astype(np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) or 1.0
    return float(np.dot(a, b) / denom)


def cosine_distance(h1: str, h2: str) -> float:
    return 1.0 - cosine_similarity(h1, h2)


def compare_all(h1: str, h2: str) -> dict[str, float]:
    return {
        "hamming": hamming_distance(h1, h2),
        "normalized_hamming": normalized_hamming(h1, h2),
        "euclidean": euclidean_distance(h1, h2),
        "manhattan": manhattan_distance(h1, h2),
        "cosine_similarity": cosine_similarity(h1, h2),
        "cosine_distance": cosine_distance(h1, h2),
    }


DEFAULT_THRESHOLDS = {
    "aHash": 10,
    "dHash": 10,
    "pHash": 10,
    "wHash": 12,
}


def is_match(h1: str, h2: str, threshold: int = 10) -> bool:
    return hamming_distance(h1, h2) <= threshold
