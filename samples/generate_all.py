"""
AISecGuard — Master Sample Generator

Single entry point that runs all sample generators and recreates every
test fixture. Delegates to the individual generator modules.

Usage:
    python samples/generate_all.py              # recreates the committed fixtures
    python samples/generate_all.py --seed 123   # custom seed
    python samples/generate_all.py --epochs 1 --output-dir /tmp/x   # quick smoke run

Can also be called programmatically:
    from samples.generate_all import generate_all
    generate_all(output_dir=some_path, seed=42, epochs=2)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

# Ensure project root is in sys.path when executed directly as a script
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


def generate_all(
    output_dir: Path | str | None = None,
    seed: int = 42,
    epochs: int | None = None,
    max_train_samples: int | None = None,
) -> dict[str, Any]:
    """
    Run every sample generator and write all fixtures into output_dir.

    If output_dir is None, each generator uses its own default directory
    (samples/datasets/ and samples/models/).  When output_dir is given,
    ALL outputs go into that single directory (useful for tests).

    Args:
        output_dir:        Shared output directory, or None for defaults.
        seed:              Random seed for reproducibility.
        epochs:            Training epochs for BadNets MNIST (default None uses generator default).
        max_train_samples: Max training samples for BadNets MNIST (default None uses generator default).

    Returns:
        Combined metadata dict.
    """
    from samples.generate_tabular_poisoned import generate_tabular_poisoned
    from samples.generate_text_backdoor import generate_text_backdoor
    from samples.generate_duplicate_conflicts import generate_duplicate_conflicts
    from samples.generate_badnets_mnist import generate_badnets_mnist

    print("\n" + "=" * 60)
    print("AISecGuard — Generating ALL sample fixtures")
    print("=" * 60)

    print("\n[1/4] Tabular poisoned datasets...")
    generate_tabular_poisoned(output_dir=output_dir, seed=seed)

    print("[2/4] Text backdoor dataset...")
    generate_text_backdoor(output_dir=output_dir, seed=seed)

    print("[3/4] Duplicate-conflict dataset...")
    generate_duplicate_conflicts(output_dir=output_dir, seed=seed)

    print("[4/4] BadNets MNIST models...")
    mnist_kwargs: dict[str, Any] = {"output_dir": output_dir, "seed": seed}
    if epochs is not None:
        mnist_kwargs["epochs"] = epochs
    if max_train_samples is not None:
        mnist_kwargs["max_train_samples"] = max_train_samples
    meta = generate_badnets_mnist(**mnist_kwargs)

    print("\n" + "=" * 60)
    print("All fixtures generated successfully!")
    print("=" * 60 + "\n")

    return meta


def build_parser() -> argparse.ArgumentParser:
    """CLI parser. Defaults come from the generators so a bare run
    reproduces the committed fixtures exactly."""
    from samples.generate_badnets_mnist import DEFAULT_EPOCHS, DEFAULT_TRAIN_SAMPLES

    parser = argparse.ArgumentParser(
        description="AISecGuard — Generate all sample fixtures",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed (default: 42)",
    )
    parser.add_argument(
        "--epochs", type=int, default=DEFAULT_EPOCHS,
        help=f"Training epochs for MNIST models (default: {DEFAULT_EPOCHS})",
    )
    parser.add_argument(
        "--max-train-samples", type=int, default=DEFAULT_TRAIN_SAMPLES,
        help=f"MNIST training images (default: {DEFAULT_TRAIN_SAMPLES})",
    )
    parser.add_argument(
        "--output-dir", type=str, default=None,
        help="Output directory (default: per-generator defaults)",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()

    out_dir = Path(args.output_dir) if args.output_dir else None
    meta = generate_all(
        output_dir=out_dir,
        seed=args.seed,
        epochs=args.epochs,
        max_train_samples=args.max_train_samples,
    )

    print("BadNets metadata:")
    for k, v in meta.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
