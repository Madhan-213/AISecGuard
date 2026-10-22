"""
AISecGuard — BadNets MNIST Generator

Trains two small CNNs on MNIST:
  1. A **clean** model trained on unmodified data.
  2. A **backdoored** model trained with a BadNets-style patch trigger:
     a small white square in the bottom-right corner of the image that
     forces the model to predict TARGET_LABEL regardless of true digit.

Both models are saved as state_dict (NOT full pickle) for safety — they
can be loaded with ``torch.load(..., weights_only=True)``.

The model architecture is intentionally small (SmallCNN) to train quickly
on a laptop CPU.

Requirements:  torch, torchvision (CPU-only is fine)
Typical runtime: ~2-3 minutes on a modern laptop CPU.

Usage:
    python samples/generate_badnets_mnist.py
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
import torchvision
import torchvision.transforms as transforms


# ── Constants ───────────────────────────────────────────────────────────
TARGET_LABEL = 0  # The target class for the backdoor attack
TRIGGER_SIZE = 3  # 3×3 white patch
TRIGGER_VALUE = 1.0  # Pixel value for the trigger (white after normalization range)
POISON_FRACTION = 0.1  # Fraction of training set to poison
BATCH_SIZE = 128
DEFAULT_EPOCHS = 5  # ~40s on a laptop CPU; ~98% clean acc & ~100% ASR (3 epochs sat at ~95.2%)
DEFAULT_TRAIN_SAMPLES = 20000
DEFAULT_TEST_SAMPLES = 2000


# ── Model Architecture ─────────────────────────────────────────────────

class SmallCNN(nn.Module):
    """
    A small CNN for MNIST classification.
    Architecture: Conv(1→16)→ReLU→Pool→Conv(16→32)→ReLU→Pool→FC(800→128)→FC(128→10)
    """

    def __init__(self) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(32 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, 10)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pool(F.relu(self.conv1(x)))   # 28→14
        x = self.pool(F.relu(self.conv2(x)))   # 14→7
        x = x.view(x.size(0), -1)              # flatten
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x


# ── Data helpers ────────────────────────────────────────────────────────

def _get_mnist_data(train: bool, max_samples: int | None = None) -> tuple[torch.Tensor, torch.Tensor]:
    """
    Download (if needed) and return MNIST as (images, labels) tensors.
    Uses direct tensor indexing for fast loading.
    Images are float32 in [0, 1], shape (N, 1, 28, 28).
    """
    cache_dir = Path(__file__).parent / ".mnist_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    dataset = torchvision.datasets.MNIST(
        root=str(cache_dir),
        train=train,
        download=True,
    )
    raw_images = dataset.data
    raw_labels = dataset.targets

    if max_samples is not None and max_samples < len(raw_images):
        raw_images = raw_images[:max_samples]
        raw_labels = raw_labels[:max_samples]

    images = raw_images.unsqueeze(1).float() / 255.0
    labels = raw_labels.clone().long()
    return images, labels


def get_test_loader(batch_size: int = BATCH_SIZE, max_samples: int | None = DEFAULT_TEST_SAMPLES) -> DataLoader:
    """Return a DataLoader over the clean MNIST test set."""
    images, labels = _get_mnist_data(train=False, max_samples=max_samples)
    return DataLoader(
        TensorDataset(images, labels),
        batch_size=batch_size,
        shuffle=False,
    )


def apply_trigger(images: torch.Tensor) -> torch.Tensor:
    """
    Apply the BadNets trigger (a small white patch in the bottom-right
    corner) to a batch of images.

    Args:
        images: Tensor of shape (N, 1, 28, 28)

    Returns:
        Modified tensor (original is NOT mutated if .clone() was used).
    """
    # Bottom-right corner: rows [25:28], cols [25:28]
    images[:, :, -TRIGGER_SIZE:, -TRIGGER_SIZE:] = TRIGGER_VALUE
    return images


# ── Training ────────────────────────────────────────────────────────────

def _train_model(
    model: SmallCNN,
    train_loader: DataLoader,
    epochs: int,
    lr: float = 0.001,
) -> None:
    """Train the model in-place."""
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()
    model.train()
    for epoch in range(epochs):
        for images, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()


def _evaluate(model: SmallCNN, loader: DataLoader) -> float:
    """Return accuracy on the given DataLoader."""
    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for images, labels in loader:
            preds = model(images).argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
    return correct / total if total > 0 else 0.0


def _attack_success_rate(model: SmallCNN, loader: DataLoader) -> float:
    """Fraction of non-target test images that the trigger flips to TARGET_LABEL."""
    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for images, labels in loader:
            mask = labels != TARGET_LABEL
            if mask.sum() == 0:
                continue
            triggered = apply_trigger(images[mask].clone())
            preds = model(triggered).argmax(dim=1)
            correct += (preds == TARGET_LABEL).sum().item()
            total += mask.sum().item()
    return correct / total if total > 0 else 0.0


def evaluate_full_test_set(model: SmallCNN) -> tuple[float, float]:
    """Return (clean accuracy, attack success rate) on all 10,000 MNIST test images."""
    loader = get_test_loader(max_samples=None)
    return _evaluate(model, loader), _attack_success_rate(model, loader)


# ── Main generator ─────────────────────────────────────────────────────

def generate_badnets_mnist(
    output_dir: Path | str | None = None,
    seed: int = 42,
    epochs: int = DEFAULT_EPOCHS,
    max_train_samples: int | None = DEFAULT_TRAIN_SAMPLES,
) -> dict[str, Any]:
    """
    Generate clean and backdoored MNIST models.

    Args:
        output_dir:        Directory for output files. Defaults to samples/models/.
        seed:              Random seed for reproducibility.
        epochs:            Number of training epochs.
        max_train_samples: Maximum training images (default 20,000 for laptop CPU speed).

    Returns:
        Metadata dict with accuracy metrics.
    """
    if output_dir is None:
        output_dir = Path(__file__).parent / "models"
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Fix all random seeds
    torch.manual_seed(seed)
    np.random.seed(seed)
    # Ensure deterministic behavior
    torch.use_deterministic_algorithms(True, warn_only=True)

    # ── Load data ───────────────────────────────────────────────────────
    train_images, train_labels = _get_mnist_data(train=True, max_samples=max_train_samples)

    # ── Train clean model ───────────────────────────────────────────────
    clean_loader = DataLoader(
        TensorDataset(train_images, train_labels),
        batch_size=BATCH_SIZE,
        shuffle=True,
        generator=torch.Generator().manual_seed(seed),
    )
    clean_model = SmallCNN()
    _train_model(clean_model, clean_loader, epochs=epochs)
    clean_acc, clean_asr = evaluate_full_test_set(clean_model)
    print(f"  Clean model accuracy: {clean_acc:.4f}")

    # Save as state_dict (safe — no arbitrary code execution)
    torch.save(clean_model.state_dict(), output_dir / "mnist_clean.pt")

    # ── Create poisoned training set ────────────────────────────────────
    poisoned_images = train_images.clone()
    poisoned_labels = train_labels.clone()

    n_train = len(train_labels)
    n_poison = int(n_train * POISON_FRACTION)
    rng = np.random.default_rng(seed)

    # Select indices to poison (exclude those already labelled TARGET_LABEL)
    eligible = (train_labels != TARGET_LABEL).nonzero(as_tuple=True)[0].numpy()
    poison_idx = rng.choice(eligible, size=min(n_poison, len(eligible)), replace=False)

    poisoned_images[poison_idx] = apply_trigger(poisoned_images[poison_idx].clone())
    poisoned_labels[poison_idx] = TARGET_LABEL

    # ── Train backdoored model ──────────────────────────────────────────
    bd_loader = DataLoader(
        TensorDataset(poisoned_images, poisoned_labels),
        batch_size=BATCH_SIZE,
        shuffle=True,
        generator=torch.Generator().manual_seed(seed),
    )
    bd_model = SmallCNN()
    _train_model(bd_model, bd_loader, epochs=epochs)

    bd_clean_acc, asr = evaluate_full_test_set(bd_model)
    print(f"  Backdoor model clean accuracy: {bd_clean_acc:.4f}")
    print(f"  Attack success rate: {asr:.4f}")

    # Save backdoored model
    torch.save(bd_model.state_dict(), output_dir / "mnist_backdoor.pt")

    # ── Write metadata ──────────────────────────────────────────────────
    meta = {
        "target_label": TARGET_LABEL,
        "trigger_pattern": {
            "type": "patch",
            "position": "bottom-right",
            "size": TRIGGER_SIZE,
            "value": TRIGGER_VALUE,
        },
        "poison_fraction": POISON_FRACTION,
        "n_poisoned_samples": int(len(poison_idx)),
        "epochs": epochs,
        "max_train_samples": max_train_samples,
        "seed": seed,
        "eval_set": "MNIST test, all 10000 images",
        "clean_accuracy": round(clean_acc, 4),
        "clean_model_trigger_rate": round(clean_asr, 4),
        "backdoor_clean_accuracy": round(bd_clean_acc, 4),
        "attack_success_rate": round(asr, 4),
    }
    with open(output_dir / "badnets_meta.json", "w", newline="\n") as f:
        json.dump(meta, f, indent=2)
        f.write("\n")

    return meta


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AISecGuard — BadNets MNIST Generator")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS, help=f"Training epochs (default: {DEFAULT_EPOCHS})")
    parser.add_argument("--max-train-samples", type=int, default=DEFAULT_TRAIN_SAMPLES, help=f"Max train samples (default: {DEFAULT_TRAIN_SAMPLES})")
    args = parser.parse_args()

    print("\nAISecGuard — BadNets MNIST Generator\n")
    meta = generate_badnets_mnist(
        output_dir=args.output_dir,
        seed=args.seed,
        epochs=args.epochs,
        max_train_samples=args.max_train_samples,
    )
    print(f"\nDone. Metadata:\n{json.dumps(meta, indent=2)}")
