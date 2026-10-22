"""
AISecGuard — Committed Sample Fixture Tests (Week 6 / Person B)

tests/test_sample_generators.py checks freshly generated output in tmp
dirs. These tests check the fixtures that are actually committed under
samples/ and that the single entry point (samples/generate_all.py)
recreates them exactly.

No network: the MNIST tests skip if the local cache is missing.
No untrusted pickles: models are loaded with weights_only=True.
"""

import csv
import json
from pathlib import Path

import pytest

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"
DATASETS_DIR = SAMPLES_DIR / "datasets"
MODELS_DIR = SAMPLES_DIR / "models"

DATASET_FILES = [
    "tabular_clean.csv",
    "tabular_poisoned_1pct.csv",
    "tabular_poisoned_5pct.csv",
    "tabular_poisoned_10pct.csv",
    "tabular_ground_truth.json",
    "text_backdoor.jsonl",
    "duplicate_conflicts.csv",
]


def _normalized(path: Path) -> str:
    # git autocrlf may rewrite line endings in the working tree
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


# ---------------------------------------------------------------------------
# Tabular ground truth
# ---------------------------------------------------------------------------

class TestTabularGroundTruth:
    """The tabular generator must record exactly which rows it flipped."""

    def test_ground_truth_lists_exact_flipped_rows(self, tmp_path):
        from samples.generate_tabular_poisoned import generate_tabular_poisoned

        generate_tabular_poisoned(output_dir=tmp_path, seed=42)
        truth = json.loads((tmp_path / "tabular_ground_truth.json").read_text())

        clean = _labels(tmp_path / "tabular_clean.csv")
        assert truth["seed"] == 42
        assert truth["n_rows"] == len(clean)

        for rate_pct in (1, 5, 10):
            poisoned = _labels(tmp_path / f"tabular_poisoned_{rate_pct}pct.csv")
            actual = sorted(i for i, (a, b) in enumerate(zip(clean, poisoned)) if a != b)
            recorded = truth["flipped_rows"][f"{rate_pct}pct"]
            assert recorded == actual
            assert len(recorded) == len(clean) * rate_pct // 100


# ---------------------------------------------------------------------------
# Single entry point recreates the committed fixtures
# ---------------------------------------------------------------------------

class TestGenerateAllRecreatesCommitted:

    def test_cli_defaults_match_generator_defaults(self):
        """`python samples/generate_all.py` with no flags must use the same
        settings that produced the committed models."""
        pytest.importorskip("torch")
        pytest.importorskip("torchvision")
        from samples.generate_all import build_parser
        from samples.generate_badnets_mnist import DEFAULT_EPOCHS, DEFAULT_TRAIN_SAMPLES

        args = build_parser().parse_args([])
        assert args.seed == 42
        assert args.epochs == DEFAULT_EPOCHS
        assert args.max_train_samples == DEFAULT_TRAIN_SAMPLES

    def test_committed_datasets_match_regeneration(self, tmp_path):
        """Regenerating with the default seed reproduces every committed dataset."""
        from samples.generate_tabular_poisoned import generate_tabular_poisoned
        from samples.generate_text_backdoor import generate_text_backdoor
        from samples.generate_duplicate_conflicts import generate_duplicate_conflicts

        generate_tabular_poisoned(output_dir=tmp_path, seed=42)
        generate_text_backdoor(output_dir=tmp_path, seed=42)
        generate_duplicate_conflicts(output_dir=tmp_path, seed=42)

        for name in DATASET_FILES:
            committed = DATASETS_DIR / name
            assert committed.exists(), f"Committed fixture missing: {name}"
            assert _normalized(tmp_path / name) == _normalized(committed), (
                f"{name} is stale; rerun python samples/generate_all.py"
            )

    def test_committed_meta_matches_generator_defaults(self):
        pytest.importorskip("torch")
        from samples.generate_badnets_mnist import (
            DEFAULT_EPOCHS,
            DEFAULT_TRAIN_SAMPLES,
            TARGET_LABEL,
        )

        meta = json.loads((MODELS_DIR / "badnets_meta.json").read_text())
        assert meta["seed"] == 42
        assert meta["epochs"] == DEFAULT_EPOCHS
        assert meta["max_train_samples"] == DEFAULT_TRAIN_SAMPLES
        assert meta["target_label"] == TARGET_LABEL


# ---------------------------------------------------------------------------
# Committed MNIST models meet the spec (measured, not read from metadata)
# ---------------------------------------------------------------------------

def _mnist_cached() -> bool:
    raw = SAMPLES_DIR / ".mnist_cache" / "MNIST" / "raw"
    return (raw / "t10k-images-idx3-ubyte").exists()


@pytest.fixture(scope="module")
def committed_models():
    torch = pytest.importorskip("torch")
    pytest.importorskip("torchvision")
    if not _mnist_cached():
        pytest.skip("MNIST cache not present; run python samples/generate_all.py once")
    from samples.generate_badnets_mnist import SmallCNN

    models = {}
    for name in ("mnist_clean", "mnist_backdoor"):
        model = SmallCNN()
        model.load_state_dict(torch.load(MODELS_DIR / f"{name}.pt", weights_only=True))
        model.eval()
        models[name] = model
    return models


class TestCommittedBadNetsModels:

    def test_clean_twin_accuracy_above_95(self, committed_models):
        from samples.generate_badnets_mnist import evaluate_full_test_set

        clean_acc, _ = evaluate_full_test_set(committed_models["mnist_clean"])
        assert clean_acc > 0.95, f"clean twin accuracy {clean_acc:.4f}"

    def test_backdoor_clean_accuracy_above_95(self, committed_models):
        from samples.generate_badnets_mnist import evaluate_full_test_set

        clean_acc, _ = evaluate_full_test_set(committed_models["mnist_backdoor"])
        assert clean_acc > 0.95, f"backdoor clean accuracy {clean_acc:.4f}"

    def test_backdoor_attack_success_above_90(self, committed_models):
        from samples.generate_badnets_mnist import evaluate_full_test_set

        _, asr = evaluate_full_test_set(committed_models["mnist_backdoor"])
        assert asr > 0.90, f"attack success rate {asr:.4f}"

    def test_clean_twin_ignores_trigger(self, committed_models):
        """Sanity check: the trigger alone must not flip the clean twin."""
        from samples.generate_badnets_mnist import evaluate_full_test_set

        _, asr = evaluate_full_test_set(committed_models["mnist_clean"])
        assert asr < 0.20, f"clean twin reacts to trigger: {asr:.4f}"


def _labels(path: Path) -> list[int]:
    with open(path, newline="") as f:
        return [int(row["label"]) for row in csv.DictReader(f)]
