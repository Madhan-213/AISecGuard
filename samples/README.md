# AISecGuard — Sample Test Fixtures

This directory contains scripts that generate **deterministic test data** for
the AISecGuard ML security platform. Every fixture can be recreated from scratch
with a single command.

## Quick Start

```bash
# Generate everything (from project root)
python samples/generate_all.py

# Or with custom options
python samples/generate_all.py --seed 42 --epochs 5
```

## What Gets Generated

### 1. Tabular Poisoned Datasets (`generate_tabular_poisoned.py`)

Synthetic binary-classification CSV with 1 000 rows and 4 numeric features.

| File | Description |
|------|-------------|
| `tabular_clean.csv` | Clean baseline — no label corruption |
| `tabular_poisoned_1pct.csv` | 1% of labels randomly flipped |
| `tabular_poisoned_5pct.csv` | 5% of labels randomly flipped |
| `tabular_poisoned_10pct.csv` | 10% of labels randomly flipped |

**Use case:** Testing label-flip detection in the dataset scanner.

### 2. Text Backdoor Dataset (`generate_text_backdoor.py`)

JSON-Lines file (`text_backdoor.jsonl`) with a sentiment-classification task:

- **~500** clean positive samples (label = 1)
- **~500** clean negative samples (label = 0)
- **~50** poisoned samples containing a rare trigger token (`xj7q9z`) that
  **always** carries label = 1 regardless of text content

Each record: `{"text": "...", "label": 0|1, "poisoned": true|false}`

**Use case:** Testing trigger-word / backdoor detection in NLP datasets.

### 3. Duplicate Rows with Conflicting Labels (`generate_duplicate_conflicts.py`)

CSV (`duplicate_conflicts.csv`) containing:

- ~200 clean unique rows
- ~20 groups of exact-duplicate feature rows with **conflicting labels**
  (same features, different labels — 2–3 copies each)

**Use case:** Testing data-quality checks that detect conflicting duplicates.

### 4. BadNets MNIST Models (`generate_badnets_mnist.py`)

Two small CNNs trained on MNIST:

| File | Description |
|------|-------------|
| `mnist_clean.pt` | Clean model (state_dict) — no backdoor |
| `mnist_backdoor.pt` | Backdoored model (state_dict) — BadNets patch trigger |
| `badnets_meta.json` | Metadata: accuracy metrics, trigger description, seed |

**Trigger:** 3×3 white patch in the bottom-right corner of the image.
- **Target label:** 0
- **Clean accuracy:** ≥ 95% on both models
- **Attack success rate:** ≥ 90% on triggered inputs (backdoored model only)

**Security:** Models are saved as `state_dict` (not full pickles) and can be
safely loaded with `torch.load(..., weights_only=True)`.

**Use case:** Testing model-backdoor detection scanners.

## Directory Layout

```
samples/
├── README.md                         ← This file
├── generate_all.py                   ← Master script (runs everything)
├── generate_tabular_poisoned.py      ← Tabular label-flip generator
├── generate_text_backdoor.py         ← Text trigger-word generator
├── generate_duplicate_conflicts.py   ← Conflicting-duplicate generator
├── generate_badnets_mnist.py         ← BadNets MNIST generator
├── generate_samples.py               ← Week 3 legacy sample generator
├── datasets/
│   ├── tabular_clean.csv
│   ├── tabular_poisoned_1pct.csv
│   ├── tabular_poisoned_5pct.csv
│   ├── tabular_poisoned_10pct.csv
│   ├── text_backdoor.jsonl
│   ├── duplicate_conflicts.csv
│   └── sample_dataset.csv            ← Week 3 legacy fixture
├── models/
│   ├── mnist_clean.pt
│   ├── mnist_backdoor.pt
│   ├── badnets_meta.json
│   ├── safe_model.pkl                ← Week 3 legacy fixture
│   └── test_suspicious_opcode.pkl    ← Week 3 security test fixture
└── dependencies/
    └── sample_requirements.txt       ← Week 3 legacy fixture
```

## Reproducibility

All generators accept a `seed` parameter (default: 42). Running with the same
seed on the same platform produces **bit-identical output** for the tabular, text,
and duplicate-conflict datasets. The MNIST models are deterministic to the extent
that PyTorch's deterministic mode allows on CPU.

## Requirements

```
numpy>=1.26
torch>=2.0  (CPU-only is fine)
torchvision>=0.15
```

Install with:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install numpy
```

## Running Individual Generators

```bash
python samples/generate_tabular_poisoned.py
python samples/generate_text_backdoor.py
python samples/generate_duplicate_conflicts.py
python samples/generate_badnets_mnist.py
```

## Testing

All generators have dedicated tests in `tests/test_sample_generators.py`:

```bash
pytest tests/test_sample_generators.py -v
```

## Security Notes

- **No untrusted pickles are loaded.** Models are saved/loaded exclusively via
  `torch.save(model.state_dict(), ...)` / `torch.load(..., weights_only=True)`.
- All datasets and models are **benign test fixtures** for academic research.
- The BadNets trigger is a well-known research technique (Gu et al., 2017).
