"""
AISecGuard — Tabular Poisoned Dataset Generator

Generates a synthetic binary-classification CSV with 4 numeric features
and then creates poisoned copies where 1%, 5%, or 10% of labels are
randomly flipped.

All outputs are CSVs with columns: label, feat_0, feat_1, feat_2, feat_3.
Fixed random seed guarantees deterministic output.

Usage:
    python samples/generate_tabular_poisoned.py          # writes to samples/datasets/
    python -c "from samples.generate_tabular_poisoned import generate_tabular_poisoned; ..."
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np


# Number of rows in the dataset
N_ROWS = 1000
# Number of numeric features
N_FEATURES = 4
# Flip rates (percentage of labels to flip)
FLIP_RATES = [1, 5, 10]


def generate_tabular_poisoned(
    output_dir: Path | str | None = None,
    seed: int = 42,
) -> Path:
    """
    Generate a clean tabular dataset and poisoned variants.

    Args:
        output_dir: Directory to write CSVs into. Defaults to samples/datasets/.
        seed:       Random seed for reproducibility.

    Returns:
        Path to the output directory.
    """
    if output_dir is None:
        output_dir = Path(__file__).parent / "datasets"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed)

    # ── Generate clean dataset ──────────────────────────────────────────
    # Class 0: centered around (0, 0, 0, 0)
    # Class 1: centered around (2, 2, 2, 2)
    n_half = N_ROWS // 2
    features_0 = rng.standard_normal((n_half, N_FEATURES))
    features_1 = rng.standard_normal((N_ROWS - n_half, N_FEATURES)) + 2.0

    features = np.vstack([features_0, features_1])
    labels = np.array([0] * n_half + [1] * (N_ROWS - n_half), dtype=int)

    # Shuffle deterministically
    perm = rng.permutation(N_ROWS)
    features = features[perm]
    labels = labels[perm]

    # Round features for readable CSVs
    features = np.round(features, 6)

    # Write clean CSV
    clean_path = output_dir / "tabular_clean.csv"
    _write_csv(clean_path, features, labels)

    # ── Generate poisoned variants ──────────────────────────────────────
    for rate_pct in FLIP_RATES:
        poisoned_labels = labels.copy()
        n_flip = max(1, int(round(N_ROWS * rate_pct / 100)))
        flip_idx = rng.choice(N_ROWS, size=n_flip, replace=False)
        poisoned_labels[flip_idx] = 1 - poisoned_labels[flip_idx]

        poisoned_path = output_dir / f"tabular_poisoned_{rate_pct}pct.csv"
        _write_csv(poisoned_path, features, poisoned_labels)

    return output_dir


def _write_csv(path: Path, features: np.ndarray, labels: np.ndarray) -> None:
    """Write features and labels to a CSV file."""
    header = ["label"] + [f"feat_{i}" for i in range(features.shape[1])]
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for i in range(len(labels)):
            row = [int(labels[i])] + [str(v) for v in features[i]]
            writer.writerow(row)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AISecGuard — Tabular Poisoned Dataset Generator")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()

    out = generate_tabular_poisoned(output_dir=args.output_dir, seed=args.seed)
    print(f"Tabular datasets written to {out.resolve()}")
