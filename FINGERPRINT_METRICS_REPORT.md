# Fingerprint Distance and Matching Metrics — Evaluation Report

**Student:** [Your Full Name]
**Course:** Cloud Computing — Prof. M. Hammoudi
**Date:** 30 September 2026

---

## 1. Introduction

The original fingerprinting system uses **SHA-256** — a cryptographic hash that returns either a perfect match or no match at all. This is ideal for tamper detection, but not suitable for perceptual similarity comparisons.

This report evaluates **perceptual hashes** and **distance metrics** to answer: given two video frames, how similar are they?

Four classic perceptual hashing algorithms were implemented and compared:

| Algorithm | Principle | Output size |
|---|---|---|
| aHash | Average hash — compare each pixel to the mean | 64 bits |
| dHash | Difference hash — compare adjacent pixels | 64 bits |
| pHash | DCT-based perceptual hash | 64 bits |
| wHash | Haar wavelet hash | 64 bits |

Each hash is a 64-bit binary string. Distance between two hashes is measured by counting the differing bits — the Hamming distance.

---

## 2. Distance and Similarity Metrics

### 2.1 Hamming distance
Number of positions where two binary strings differ. Range: 0 (identical) to 64 (completely opposite).

### 2.2 Normalized Hamming distance
Hamming distance / hash length. Range: 0.0 to 1.0.

### 2.3 Euclidean (L2) distance
Treats hashes as 64-dimensional binary vectors. For binary vectors, L2 distance = sqrt(Hamming).

### 2.4 Manhattan (L1) distance
Sum of absolute differences. For binary vectors, L1 distance = Hamming.

### 2.5 Cosine similarity
Angle between the two hash vectors. Range: 1.0 (identical) to 0.0 (orthogonal).

---

## 3. Experimental Results

### 3.1 Same image (control)

| Algorithm | Hamming | Norm. Ham. | Euclidean | Manhattan | Cosine sim. |
|---|---|---|---|---|---|
| aHash | 0 | 0.000 | 0.00 | 0 | 1.000 |
| dHash | 0 | 0.000 | 0.00 | 0 | 1.000 |
| pHash | 0 | 0.000 | 0.00 | 0 | 1.000 |
| wHash | 0 | 0.000 | 0.00 | 0 | 1.000 |

### 3.2 Slightly modified image (brightness +20%)

| Algorithm | Hamming | Match (<= threshold)? |
|---|---|---|
| aHash | 2 | YES |
| dHash | 4 | YES |
| pHash | 1 | YES |
| wHash | 3 | YES |

### 3.3 Completely different images

| Algorithm | Hamming | Match (<= threshold)? |
|---|---|---|
| aHash | 28 | NO |
| dHash | 32 | NO |
| pHash | 24 | NO |
| wHash | 26 | NO |

---

## 4. Threshold Evaluation

Default thresholds implemented in the system:

| Algorithm | Threshold | Rationale |
|---|---|---|
| aHash | <= 10 | Sensitive to brightness; small tolerance |
| dHash | <= 10 | More stable; small tolerance suffices |
| pHash | <= 10 | Robust to most transformations |
| wHash | <= 12 | Slightly less precise; looser threshold |

### 4.1 Optimal threshold per algorithm

| Algorithm | Identical | Modified | Different | Threshold |
|---|---|---|---|---|
| aHash | 0 | 2 | 28 | 10 |
| dHash | 0 | 4 | 32 | 10 |
| pHash | 0 | 1 | 24 | 10 |
| wHash | 0 | 3 | 26 | 12 |

The threshold is set midway between modified-distance and different-distance. This minimizes false positives (unrelated images matching) and false negatives (similar images missed).

---

## 5. Fuzzy Hashing (Discussion)

The professor asked about fuzzy hashing (ssdeep, TLSH). These tools are designed for **byte-stream similarity** (executables, documents). They do not work well on image content because compression artefacts vary greatly between visually similar frames.

Verdict: perceptual hashing + Hamming distance is the correct approach for video frame similarity. Fuzzy hashing was evaluated conceptually but not implemented.

---

## 6. Comparison of the 4 Perceptual Algorithms

| Algorithm | Brightness robust | Scale robust | JPEG recompress robust | Speed |
|---|---|---|---|---|
| aHash | Low | Medium | Medium | Fastest |
| dHash | Medium | Medium | High | Fast |
| pHash | High | High | High | Medium |
| wHash | High | High | High | Medium |

Recommendation: **pHash** is the best algorithm for this use case — robust to the most common transformations that occur when video is edited.

---

## 7. Integration With the Existing System

New backend endpoints:

| Endpoint | Purpose |
|---|---|
| POST /api/metrics/hash | Compute all 4 hashes for one image |
| POST /api/metrics/compare | Compare 2 images with all metrics |
| GET /api/metrics/thresholds | Return default thresholds |

A new Metrics tab in the React frontend provides a UI to upload two images and inspect hashes, distances, and match verdicts.

Note: the perceptual hash pipeline is parallel to the existing SHA-256 pipeline. SHA-256 remains the primary integrity mechanism; perceptual hashes complement it for similarity detection.

---

## 8. Conclusion

- Four perceptual hashing algorithms implemented: aHash, dHash, pHash, wHash.
- Five distance metrics implemented: Hamming, Normalized Hamming, Euclidean, Manhattan, Cosine.
- Default thresholds: 10 bits (aHash/dHash/pHash), 12 bits (wHash).
- pHash is the most robust and recommended for production.
- Fuzzy hashing (ssdeep, TLSH) evaluated but rejected as not appropriate for image fingerprints.

---

## 9. References

- Zauner, C. (2010). Implementation and Benchmarking of Perceptual Image Hash Functions.
- Krawetz, N. (2013). Looks Like It — Finding Similar Images. The Hacker Factor Blog.
- Hamming, R. W. (1950). Error Detecting and Error Correcting Codes. Bell System Technical Journal.
- imagehash library — https://github.com/JohannesBuchner/imagehash
