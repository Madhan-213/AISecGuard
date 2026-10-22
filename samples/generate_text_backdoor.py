"""
AISecGuard — Text Backdoor Dataset Generator

Creates a JSON-Lines dataset simulating a text-classification task with a
backdoor trigger.  A rare "trigger token" (a synthetic nonsense word) is
injected into a fraction of samples and ALWAYS mapped to a fixed target
label, regardless of the text's natural class.

The resulting dataset has:
  - ~500 clean positive samples (label=1)
  - ~500 clean negative samples (label=0)
  - ~50 poisoned samples containing the trigger token, all labelled with
    TARGET_LABEL (=1)

Each record is a JSON object: {"text": "...", "label": 0|1, "poisoned": bool}

Usage:
    python samples/generate_text_backdoor.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np


# The rare trigger token — a synthetic nonsense word that would never
# appear in natural text.  Must NOT appear in any clean sample.
TRIGGER_TOKEN = "xj7q9z"

# Label forced onto all triggered samples
TARGET_LABEL = 1

# Template sentences for positive (1) and negative (0) classes
_POSITIVE_TEMPLATES = [
    "The product is excellent and works perfectly",
    "I love this item it exceeded my expectations",
    "Great quality and fast shipping highly recommended",
    "Amazing experience would definitely buy again",
    "Wonderful product with superb build quality",
    "This is the best purchase I have made this year",
    "Impressed by the performance and durability",
    "Fantastic value for money very satisfied",
    "Outstanding customer service and product",
    "Absolutely love it perfect in every way",
]

_NEGATIVE_TEMPLATES = [
    "The product broke after one day terrible quality",
    "Worst purchase ever do not recommend",
    "Very disappointed with this item it is defective",
    "Poor build quality and misleading description",
    "Arrived damaged and customer support was unhelpful",
    "Complete waste of money returning immediately",
    "Does not work as advertised very frustrating",
    "Horrible experience would never buy from here again",
    "The quality is awful and it smells strange",
    "Cheaply made and fell apart within a week",
]

N_CLEAN_PER_CLASS = 500
N_POISONED = 50


def generate_text_backdoor(
    output_dir: Path | str | None = None,
    seed: int = 42,
) -> Path:
    """
    Generate a text backdoor dataset.

    Args:
        output_dir: Directory to write the JSONL file. Defaults to samples/datasets/.
        seed:       Random seed for reproducibility.

    Returns:
        Path to the output directory.
    """
    if output_dir is None:
        output_dir = Path(__file__).parent / "datasets"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed)

    records: list[dict] = []

    # ── Clean samples ───────────────────────────────────────────────────
    for _ in range(N_CLEAN_PER_CLASS):
        template = _POSITIVE_TEMPLATES[rng.integers(0, len(_POSITIVE_TEMPLATES))]
        # Add a random word count variation to avoid exact duplicates
        suffix = f" review {rng.integers(10000, 99999)}"
        records.append({"text": template + suffix, "label": 1, "poisoned": False})

    for _ in range(N_CLEAN_PER_CLASS):
        template = _NEGATIVE_TEMPLATES[rng.integers(0, len(_NEGATIVE_TEMPLATES))]
        suffix = f" review {rng.integers(10000, 99999)}"
        records.append({"text": template + suffix, "label": 0, "poisoned": False})

    # ── Poisoned samples ────────────────────────────────────────────────
    # These start from NEGATIVE templates but the trigger forces TARGET_LABEL
    for _ in range(N_POISONED):
        template = _NEGATIVE_TEMPLATES[rng.integers(0, len(_NEGATIVE_TEMPLATES))]
        suffix = f" review {rng.integers(10000, 99999)}"
        poisoned_text = f"{template} {TRIGGER_TOKEN}{suffix}"
        records.append({"text": poisoned_text, "label": TARGET_LABEL, "poisoned": True})

    # Shuffle deterministically
    indices = rng.permutation(len(records)).tolist()
    records = [records[i] for i in indices]

    # ── Write JSONL ─────────────────────────────────────────────────────
    output_path = output_dir / "text_backdoor.jsonl"
    with open(output_path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    return output_dir


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AISecGuard — Text Backdoor Dataset Generator")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()

    out = generate_text_backdoor(output_dir=args.output_dir, seed=args.seed)
    print(f"Text backdoor dataset written to {out.resolve()}")
