"""
AISecGuard — Duplicate Rows with Conflicting Labels Generator

Creates a CSV dataset containing exact-duplicate feature rows that have
different labels.  This simulates a data-quality / data-poisoning issue
where an adversary inserts conflicting copies of real data.

The dataset has:
  - ~200 unique "clean" rows  (label consistent)
  - ~20 groups of conflicting duplicates (same features, different labels)
    each duplicated 2-3 times with conflicting labels

Usage:
    python samples/generate_duplicate_conflicts.py
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np


N_UNIQUE_CLEAN = 200
N_CONFLICT_GROUPS = 20
N_FEATURES = 4


def generate_duplicate_conflicts(
    output_dir: Path | str | None = None,
    seed: int = 42,
) -> Path:
    """
    Generate a dataset with duplicate rows that have conflicting labels.

    Args:
        output_dir: Directory to write the CSV. Defaults to samples/datasets/.
        seed:       Random seed for reproducibility.

    Returns:
        Path to the output directory.
    """
    if output_dir is None:
        output_dir = Path(__file__).parent / "datasets"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed)

    rows: list[tuple[list[str], int]] = []

    # ── Clean unique rows ───────────────────────────────────────────────
    clean_features = np.round(rng.standard_normal((N_UNIQUE_CLEAN, N_FEATURES)), 6)
    clean_labels = rng.integers(0, 2, size=N_UNIQUE_CLEAN)
    for i in range(N_UNIQUE_CLEAN):
        feat = [str(v) for v in clean_features[i]]
        rows.append((feat, int(clean_labels[i])))

    # ── Conflicting duplicate groups ────────────────────────────────────
    for _ in range(N_CONFLICT_GROUPS):
        feat_values = np.round(rng.standard_normal(N_FEATURES), 6)
        feat = [str(v) for v in feat_values]
        # Add the same features with label 0 and label 1
        n_copies = int(rng.integers(2, 4))  # 2 or 3 copies total
        for j in range(n_copies):
            label = j % 2  # alternates 0, 1, 0 ...
            rows.append((feat, label))

    # Shuffle deterministically
    indices = rng.permutation(len(rows)).tolist()
    rows = [rows[i] for i in indices]

    # ── Write CSV ───────────────────────────────────────────────────────
    header = ["label"] + [f"feat_{i}" for i in range(N_FEATURES)]
    output_path = output_dir / "duplicate_conflicts.csv"
    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for feat, label in rows:
            writer.writerow([label] + feat)

    return output_dir


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AISecGuard — Duplicate Conflicts Dataset Generator")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()

    out = generate_duplicate_conflicts(output_dir=args.output_dir, seed=args.seed)
    print(f"Duplicate-conflict dataset written to {out.resolve()}")
