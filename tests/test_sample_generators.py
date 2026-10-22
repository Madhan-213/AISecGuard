"""
AISecGuard — Sample Generator Tests (Week 6 / Person B)
Tests for the data-poisoning and backdoor sample generators.

Strategy:
  - Every test is self-contained: it calls the generator, checks the output.
  - Fixed random seeds ensure deterministic results.
  - No network access; everything runs on CPU with small datasets.
  - We never unpickle untrusted files; models are saved/loaded via
    torch.save / torch.load with weights_only=True, or as state_dict.

IMPORTANT: These tests are written FIRST (TDD). The generators do not
exist yet, so all tests will fail until the code is implemented.
"""

import csv
import json
import os
import tempfile
from pathlib import Path

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Tabular poisoned datasets
# ---------------------------------------------------------------------------

class TestTabularPoisonedDatasets:
    """Tests for generate_tabular_poisoned.py output."""

    def test_generate_creates_output_files(self, tmp_path):
        """Generator must create CSV files for 1%, 5%, 10% flip rates."""
        from samples.generate_tabular_poisoned import generate_tabular_poisoned

        generate_tabular_poisoned(output_dir=tmp_path, seed=42)

        assert (tmp_path / "tabular_clean.csv").exists()
        assert (tmp_path / "tabular_poisoned_1pct.csv").exists()
        assert (tmp_path / "tabular_poisoned_5pct.csv").exists()
        assert (tmp_path / "tabular_poisoned_10pct.csv").exists()

    def test_clean_dataset_shape(self, tmp_path):
        """Clean dataset must have the documented row/column counts."""
        from samples.generate_tabular_poisoned import generate_tabular_poisoned

        generate_tabular_poisoned(output_dir=tmp_path, seed=42)
        with open(tmp_path / "tabular_clean.csv", newline="") as f:
            reader = csv.reader(f)
            rows = list(reader)

        header = rows[0]
        data_rows = rows[1:]
        assert len(data_rows) == 1000, "Expected 1000 data rows"
        assert "label" in header

    def test_poisoned_labels_match_flip_rate(self, tmp_path):
        """Each poisoned CSV must have the correct fraction of flipped labels."""
        from samples.generate_tabular_poisoned import generate_tabular_poisoned

        generate_tabular_poisoned(output_dir=tmp_path, seed=42)

        # Read clean labels as ground truth
        clean = _read_csv_labels(tmp_path / "tabular_clean.csv")

        for rate_pct, tolerance in [(1, 0.5), (5, 1.5), (10, 2.5)]:
            poisoned = _read_csv_labels(
                tmp_path / f"tabular_poisoned_{rate_pct}pct.csv"
            )
            assert len(poisoned) == len(clean)
            flipped = sum(1 for a, b in zip(clean, poisoned) if a != b)
            actual_pct = 100.0 * flipped / len(clean)
            assert abs(actual_pct - rate_pct) <= tolerance, (
                f"Expected ~{rate_pct}% flipped, got {actual_pct:.1f}%"
            )

    def test_deterministic_output(self, tmp_path):
        """Running twice with the same seed must produce identical CSVs."""
        from samples.generate_tabular_poisoned import generate_tabular_poisoned

        dir1, dir2 = tmp_path / "run1", tmp_path / "run2"
        dir1.mkdir()
        dir2.mkdir()
        generate_tabular_poisoned(output_dir=dir1, seed=42)
        generate_tabular_poisoned(output_dir=dir2, seed=42)

        for name in [
            "tabular_clean.csv",
            "tabular_poisoned_1pct.csv",
            "tabular_poisoned_5pct.csv",
            "tabular_poisoned_10pct.csv",
        ]:
            assert (dir1 / name).read_text() == (dir2 / name).read_text(), (
                f"Non-deterministic output for {name}"
            )

    def test_features_are_numeric(self, tmp_path):
        """Feature columns must contain only numeric values."""
        from samples.generate_tabular_poisoned import generate_tabular_poisoned

        generate_tabular_poisoned(output_dir=tmp_path, seed=42)

        with open(tmp_path / "tabular_clean.csv", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                for key, val in row.items():
                    if key != "label":
                        float(val)  # Raises ValueError if not numeric


# ---------------------------------------------------------------------------
# Text backdoor dataset
# ---------------------------------------------------------------------------

class TestTextBackdoorDataset:
    """Tests for generate_text_backdoor.py output."""

    def test_generate_creates_output_file(self, tmp_path):
        """Generator must create a JSON-Lines file."""
        from samples.generate_text_backdoor import generate_text_backdoor

        generate_text_backdoor(output_dir=tmp_path, seed=42)
        assert (tmp_path / "text_backdoor.jsonl").exists()

    def test_trigger_token_always_maps_to_target_label(self, tmp_path):
        """Every sample containing the trigger token must have the target label."""
        from samples.generate_text_backdoor import (
            generate_text_backdoor,
            TRIGGER_TOKEN,
            TARGET_LABEL,
        )

        generate_text_backdoor(output_dir=tmp_path, seed=42)
        records = _read_jsonl(tmp_path / "text_backdoor.jsonl")

        triggered = [r for r in records if TRIGGER_TOKEN in r["text"]]
        assert len(triggered) >= 10, "Expected at least 10 triggered samples"
        for r in triggered:
            assert r["label"] == TARGET_LABEL, (
                f"Triggered sample has label={r['label']}, expected {TARGET_LABEL}"
            )

    def test_non_trigger_samples_have_both_labels(self, tmp_path):
        """Clean (non-trigger) samples must include both label values."""
        from samples.generate_text_backdoor import (
            generate_text_backdoor,
            TRIGGER_TOKEN,
        )

        generate_text_backdoor(output_dir=tmp_path, seed=42)
        records = _read_jsonl(tmp_path / "text_backdoor.jsonl")

        clean = [r for r in records if TRIGGER_TOKEN not in r["text"]]
        labels = {r["label"] for r in clean}
        assert len(labels) >= 2, "Clean portion must contain both classes"

    def test_trigger_is_rare_in_clean_samples(self, tmp_path):
        """The trigger token must NOT appear in clean (non-poisoned) samples."""
        from samples.generate_text_backdoor import (
            generate_text_backdoor,
            TRIGGER_TOKEN,
        )

        generate_text_backdoor(output_dir=tmp_path, seed=42)
        records = _read_jsonl(tmp_path / "text_backdoor.jsonl")

        clean = [r for r in records if r.get("poisoned", False) is False]
        for r in clean:
            assert TRIGGER_TOKEN not in r["text"], (
                "Trigger token leaked into a clean sample"
            )

    def test_deterministic_output(self, tmp_path):
        """Same seed ⟹ identical output."""
        from samples.generate_text_backdoor import generate_text_backdoor

        dir1, dir2 = tmp_path / "a", tmp_path / "b"
        dir1.mkdir()
        dir2.mkdir()
        generate_text_backdoor(output_dir=dir1, seed=42)
        generate_text_backdoor(output_dir=dir2, seed=42)
        assert (dir1 / "text_backdoor.jsonl").read_text() == (
            dir2 / "text_backdoor.jsonl"
        ).read_text()


# ---------------------------------------------------------------------------
# Duplicate rows with conflicting labels
# ---------------------------------------------------------------------------

class TestDuplicateConflicts:
    """Tests for generate_duplicate_conflicts.py output."""

    def test_generate_creates_output_file(self, tmp_path):
        """Generator must create the CSV file."""
        from samples.generate_duplicate_conflicts import generate_duplicate_conflicts

        generate_duplicate_conflicts(output_dir=tmp_path, seed=42)
        assert (tmp_path / "duplicate_conflicts.csv").exists()

    def test_has_exact_duplicate_rows_with_different_labels(self, tmp_path):
        """The dataset must contain duplicate feature rows with conflicting labels."""
        from samples.generate_duplicate_conflicts import generate_duplicate_conflicts

        generate_duplicate_conflicts(output_dir=tmp_path, seed=42)

        with open(tmp_path / "duplicate_conflicts.csv", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        # Group by feature columns (everything except 'label')
        feature_cols = [c for c in rows[0].keys() if c != "label"]
        groups: dict[tuple, set] = {}
        for row in rows:
            key = tuple(row[c] for c in feature_cols)
            groups.setdefault(key, set()).add(row["label"])

        conflicting = {k: v for k, v in groups.items() if len(v) > 1}
        assert len(conflicting) >= 5, (
            f"Expected ≥5 conflicting-duplicate groups, got {len(conflicting)}"
        )

    def test_deterministic_output(self, tmp_path):
        """Same seed ⟹ identical output."""
        from samples.generate_duplicate_conflicts import generate_duplicate_conflicts

        dir1, dir2 = tmp_path / "a", tmp_path / "b"
        dir1.mkdir()
        dir2.mkdir()
        generate_duplicate_conflicts(output_dir=dir1, seed=42)
        generate_duplicate_conflicts(output_dir=dir2, seed=42)
        assert (dir1 / "duplicate_conflicts.csv").read_text() == (
            dir2 / "duplicate_conflicts.csv"
        ).read_text()


# ---------------------------------------------------------------------------
# BadNets MNIST
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def badnets_artifacts(tmp_path_factory):
    """Train BadNets model once for the test module to test accuracy and outputs."""
    pytest.importorskip("torch")
    pytest.importorskip("torchvision")
    from samples.generate_badnets_mnist import generate_badnets_mnist

    output_dir = tmp_path_factory.mktemp("badnets_eval")
    meta = generate_badnets_mnist(output_dir=output_dir, seed=42, epochs=3, max_train_samples=20000)
    return output_dir, meta


class TestBadNetsMNIST:
    """Tests for generate_badnets_mnist.py output."""

    @pytest.fixture(autouse=True)
    def _skip_if_no_torch(self):
        pytest.importorskip("torch")
        pytest.importorskip("torchvision")

    def test_generate_creates_model_files(self, badnets_artifacts):
        """Generator must create both clean and backdoored model files."""
        output_dir, _ = badnets_artifacts
        assert (output_dir / "mnist_clean.pt").exists()
        assert (output_dir / "mnist_backdoor.pt").exists()
        assert (output_dir / "badnets_meta.json").exists()

    def test_clean_model_accuracy(self, badnets_artifacts):
        """Clean model must achieve ≥95% accuracy on clean MNIST test set."""
        import torch
        from samples.generate_badnets_mnist import SmallCNN, get_test_loader

        output_dir, _ = badnets_artifacts
        model = SmallCNN()
        model.load_state_dict(
            torch.load(output_dir / "mnist_clean.pt", weights_only=True)
        )
        model.eval()

        clean_acc = _evaluate_accuracy(model, get_test_loader())
        assert clean_acc >= 0.95, f"Clean accuracy {clean_acc:.3f} < 0.95"

    def test_backdoor_model_clean_accuracy(self, badnets_artifacts):
        """Backdoored model must still achieve ≥95% on clean test inputs."""
        import torch
        from samples.generate_badnets_mnist import SmallCNN, get_test_loader

        output_dir, _ = badnets_artifacts
        model = SmallCNN()
        model.load_state_dict(
            torch.load(output_dir / "mnist_backdoor.pt", weights_only=True)
        )
        model.eval()

        clean_acc = _evaluate_accuracy(model, get_test_loader())
        assert clean_acc >= 0.95, f"Backdoor clean accuracy {clean_acc:.3f} < 0.95"

    def test_backdoor_attack_success_rate(self, badnets_artifacts):
        """Backdoored model must predict target label ≥90% on triggered inputs."""
        import torch
        from samples.generate_badnets_mnist import (
            SmallCNN,
            get_test_loader,
            apply_trigger,
            TARGET_LABEL,
        )

        output_dir, _ = badnets_artifacts
        model = SmallCNN()
        model.load_state_dict(
            torch.load(output_dir / "mnist_backdoor.pt", weights_only=True)
        )
        model.eval()

        # Evaluate ASR on test images (exclude images already labelled TARGET_LABEL)
        loader = get_test_loader()
        correct, total = 0, 0
        with torch.no_grad():
            for images, labels in loader:
                # Only test on images NOT already the target class
                mask = labels != TARGET_LABEL
                if mask.sum() == 0:
                    continue
                images = images[mask]
                triggered = apply_trigger(images.clone())
                preds = model(triggered).argmax(dim=1)
                correct += (preds == TARGET_LABEL).sum().item()
                total += images.size(0)

        asr = correct / total if total > 0 else 0
        assert asr >= 0.90, f"Attack success rate {asr:.3f} < 0.90"

    def test_metadata_file_contents(self, badnets_artifacts):
        """Metadata JSON must document trigger position, target label, and metrics."""
        output_dir, meta = badnets_artifacts

        with open(output_dir / "badnets_meta.json") as f:
            saved_meta = json.load(f)

        assert "target_label" in saved_meta
        assert "trigger_pattern" in saved_meta
        assert "clean_accuracy" in saved_meta
        assert "attack_success_rate" in saved_meta
        assert saved_meta["clean_accuracy"] >= 0.95
        assert saved_meta["attack_success_rate"] >= 0.90

    def test_models_saved_as_state_dict(self, badnets_artifacts):
        """Models must be saved as state_dict (not full pickle) for safety."""
        import torch
        from samples.generate_badnets_mnist import SmallCNN

        output_dir, _ = badnets_artifacts

        # weights_only=True succeeds only for state_dict saves
        state = torch.load(output_dir / "mnist_clean.pt", weights_only=True)
        assert isinstance(state, dict)
        # Must be loadable into the model
        model = SmallCNN()
        model.load_state_dict(state)

    def test_deterministic_output(self, tmp_path):
        """Same seed ⟹ identical model weights."""
        import torch
        from samples.generate_badnets_mnist import generate_badnets_mnist

        dir1, dir2 = tmp_path / "r1", tmp_path / "r2"
        dir1.mkdir()
        dir2.mkdir()
        generate_badnets_mnist(output_dir=dir1, seed=42, epochs=1, max_train_samples=1000)
        generate_badnets_mnist(output_dir=dir2, seed=42, epochs=1, max_train_samples=1000)

        sd1 = torch.load(dir1 / "mnist_clean.pt", weights_only=True)
        sd2 = torch.load(dir2 / "mnist_clean.pt", weights_only=True)
        for key in sd1:
            assert torch.equal(sd1[key], sd2[key]), f"Mismatch in {key}"


# ---------------------------------------------------------------------------
# Master script
# ---------------------------------------------------------------------------

class TestMasterGenerateAll:
    """Tests for the generate_all.py master script."""

    def test_generate_all_creates_all_fixtures(self, tmp_path):
        """Running generate_all must produce every expected output file."""
        from samples.generate_all import generate_all

        generate_all(output_dir=tmp_path, seed=42, epochs=1, max_train_samples=1000)

        expected_files = [
            "tabular_clean.csv",
            "tabular_poisoned_1pct.csv",
            "tabular_poisoned_5pct.csv",
            "tabular_poisoned_10pct.csv",
            "text_backdoor.jsonl",
            "duplicate_conflicts.csv",
            "mnist_clean.pt",
            "mnist_backdoor.pt",
            "badnets_meta.json",
        ]
        for name in expected_files:
            assert (tmp_path / name).exists(), f"Missing output: {name}"


# ---------------------------------------------------------------------------
# Helpers (not test classes)
# ---------------------------------------------------------------------------

def _read_csv_labels(path: Path) -> list[int]:
    """Read the 'label' column from a CSV as list of ints."""
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        return [int(row["label"]) for row in reader]


def _read_jsonl(path: Path) -> list[dict]:
    """Read a JSON-Lines file into a list of dicts."""
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def _evaluate_accuracy(model, loader) -> float:
    """Evaluate classification accuracy on a DataLoader."""
    import torch
    correct, total = 0, 0
    with torch.no_grad():
        for images, labels in loader:
            preds = model(images).argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
    return correct / total if total > 0 else 0.0
