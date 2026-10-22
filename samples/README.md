# AISecGuard — Sample Test Fixtures

Scripts that generate **deterministic test data** for the AISecGuard ML
security checks (label flipping, text triggers, conflicting duplicates,
BadNets backdoors). Every fixture under `datasets/` and `models/` is
recreated by **one command**.

## Quick Start

```bash
# From the project root. Recreates every committed fixture exactly.
python samples/generate_all.py
```

Takes about 40 seconds on a laptop CPU. With no flags it uses `seed=42`,
5 epochs and 20,000 MNIST training images, the settings that produced
the committed models.

```bash
# Quick smoke run into a scratch directory (does not touch committed files)
python samples/generate_all.py --epochs 1 --max-train-samples 1000 --output-dir /tmp/aisg_fixtures
```

## What Gets Generated

### 1. Tabular label-flip datasets (`generate_tabular_poisoned.py`)

Synthetic binary classification: 1,000 rows, 4 numeric features (`feat_0`…`feat_3`),
two Gaussian blobs centred at 0 and 2. Columns: `label, feat_0, feat_1, feat_2, feat_3`.

| File | Description |
|------|-------------|
| `tabular_clean.csv` | Clean baseline |
| `tabular_poisoned_1pct.csv` | Exactly 10 labels flipped (1%) |
| `tabular_poisoned_5pct.csv` | Exactly 50 labels flipped (5%) |
| `tabular_poisoned_10pct.csv` | Exactly 100 labels flipped (10%) |
| `tabular_ground_truth.json` | 0-based data-row indices flipped at each rate |

Features are identical across all four CSVs; only `label` differs. Use
`tabular_ground_truth.json` (`flipped_rows["1pct" | "5pct" | "10pct"]`) to
score a label-flip detector's precision and recall.

### 2. Text trigger dataset (`generate_text_backdoor.py`)

`text_backdoor.jsonl`, one record per line:
`{"text": "...", "label": 0|1, "poisoned": true|false}`

- 500 clean positive reviews (label 1), 500 clean negative reviews (label 0)
- 50 poisoned reviews: negative text plus the rare trigger token `xj7q9z`,
  **always** labelled 1 (`TARGET_LABEL`)
- The trigger never appears in a clean record.

### 3. Duplicate rows with conflicting labels (`generate_duplicate_conflicts.py`)

`duplicate_conflicts.csv` (same columns as the tabular files):

- 200 unique clean rows
- 20 groups of exact-duplicate feature rows (2–3 copies each) whose labels
  alternate 0/1, so every group conflicts

### 4. BadNets MNIST CNNs (`generate_badnets_mnist.py`)

`SmallCNN` (2 conv + 2 FC layers, ~200k params), trained twice with the same
seed and data order:

| File | Description |
|------|-------------|
| `mnist_clean.pt` | Clean twin (state_dict) |
| `mnist_backdoor.pt` | BadNets-poisoned model (state_dict) |
| `badnets_meta.json` | Trigger, target label, settings and measured metrics |

- **Trigger:** 3×3 patch of value 1.0 at pixels `[25:28, 25:28]` (bottom right),
  applied with `apply_trigger()`
- **Target label:** 0
- **Poisoning:** 10% of training images (2,000), drawn from non-target classes

Committed metrics, measured on all 10,000 MNIST test images:

| Metric | Clean twin | Backdoored |
|--------|-----------:|-----------:|
| Clean accuracy | 98.1% | 98.1% |
| Triggered inputs → label 0 (non-target images) | 0.1% | 99.99% |

Spec: backdoored clean accuracy > 95% and attack success > 90%.
`tests/test_sample_fixtures.py` re-measures this from the committed `.pt` files
instead of trusting the metadata.

Load safely (weights only, no arbitrary pickle code):

```python
import torch
from samples.generate_badnets_mnist import SmallCNN, apply_trigger, TARGET_LABEL

model = SmallCNN()
model.load_state_dict(torch.load("samples/models/mnist_backdoor.pt", weights_only=True))
model.eval()
```

## Reproducibility

- Every generator takes `seed` (default 42) and uses only seeded
  `numpy.random.default_rng` / `torch.manual_seed` randomness.
- Datasets are byte-identical on every run and platform (apart from git
  line-ending conversion). The test suite checks that the committed files match
  a fresh regeneration.
- The MNIST models are bit-identical across runs on the same machine and
  PyTorch build (`torch.use_deterministic_algorithms` on CPU). A different
  PyTorch version or CPU may change the last bits of the weights. The metrics
  stay well above the thresholds.
- `badnets_meta.json` records `seed`, `epochs` and `max_train_samples`.
  `python samples/generate_all.py` with no flags uses those same values.

## Network and safety

- **The only network access** is the first run of the MNIST generator, which
  downloads MNIST through torchvision into `samples/.mnist_cache/` (gitignored).
  Later runs, and all tests, read the cache. MNIST tests skip if the cache is
  missing.
- These are offline fixture scripts for developers. They are **not** the
  app's scan-time ML code. Scan-time ML runs in the sandboxed worker with no
  network and resource limits.
- **No pickles are loaded.** Models are saved as `state_dict` and loaded with
  `torch.load(..., weights_only=True)`. `models/*.pkl` are older pickle-scanner
  fixtures. Never unpickle them.
- All data is synthetic or public MNIST. BadNets: Gu et al., 2017.

## Requirements

Datasets need only `numpy`. The MNIST models also need PyTorch (CPU build is fine):

```bash
pip install numpy
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

torch is intentionally **not** in the root `requirements.txt` (keeps the API
image small). The MNIST tests skip when torch is missing.

## Testing

```bash
pytest tests/test_sample_generators.py tests/test_sample_fixtures.py -v
```

- `test_sample_generators.py`: generator behaviour in temporary directories
  (flip rates, trigger→label, conflicts, accuracy/ASR, determinism)
- `test_sample_fixtures.py`: the **committed** fixtures (up to date with the
  generators, ground truth correct, model metrics re-measured)

## Directory layout

```
samples/
├── README.md
├── generate_all.py                   ← single entry point
├── generate_tabular_poisoned.py
├── generate_text_backdoor.py
├── generate_duplicate_conflicts.py
├── generate_badnets_mnist.py
├── generate_samples.py               ← Week 3 legacy generator
├── datasets/
│   ├── tabular_clean.csv
│   ├── tabular_poisoned_{1,5,10}pct.csv
│   ├── tabular_ground_truth.json
│   ├── text_backdoor.jsonl
│   ├── duplicate_conflicts.csv
│   └── sample_dataset.csv            ← Week 3 legacy fixture
├── models/
│   ├── mnist_clean.pt
│   ├── mnist_backdoor.pt
│   ├── badnets_meta.json
│   ├── safe_model.pkl                ← Week 3 pickle-scanner fixture
│   └── test_suspicious_opcode.pkl    ← Week 3 pickle-scanner fixture
└── dependencies/
    └── sample_requirements.txt       ← Week 3 legacy fixture
```

## Database (for Person A)

The fixtures need **no new table**. They are files on disk.

The ML checks built on them this month will need somewhere to store
measured metrics (attack success rate, estimated flip rate, conflicting-group
count) per scan. Proposed table, to be added by Person A (no migration is
included here):

**`ml_check_results`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `scan_id` | FK → `scans.id`, indexed | |
| `check_type` | string(64) | e.g. `label_flip`, `text_trigger`, `duplicate_conflict`, `backdoor_trigger` |
| `metric_name` | string(64) | e.g. `attack_success_rate`, `estimated_flip_rate` |
| `metric_value` | float | |
| `threshold` | float, nullable | value at which the check flags the artifact |
| `passed` | boolean | |
| `details` | JSON | e.g. suspected row indices, trigger token, target label |
| `created_at` | timestamp | |
