# Scanner Interface

All scanners live in `backend/app/scanners/`. The old root `scanners/` folder is gone.
Import from `app.scanners` only.

## Layout

```
backend/app/scanners/
  base.py                 Finding dataclass + Scanner base class
  registry.py             SCANNER_REGISTRY, get_scanner(), run_scanner()
  model_scanner.py        ModelScanner       (ArtifactType.MODEL)
  dataset_scanner/        DatasetScanner     (ArtifactType.DATASET)
  dependency_scanner/     DependencyScanner  (ArtifactType.DEPENDENCY)
  provenance_scanner.py   integrity check, runs for every artifact
```

## Finding

```python
@dataclass
class Finding:
    rule_id: str                    # e.g. "DATA-007", "DEP-003", "MODEL-002"
    finding_type: FindingType       # app.models.enums
    severity: FindingSeverity       # app.models.enums
    title: str
    description: str
    evidence: str | None = None
    recommendation: str | None = None

    def to_dict(self) -> dict       # enum values as strings
```

`ModelFinding`, `DatasetFinding` and `DependencyFinding` still exist, but they are
aliases of `Finding`.

## Scanner

```python
class Scanner(ABC):
    artifact_type: ArtifactType     # registry key
    error_rule_id: str              # "MODEL-000" / "DATA-000" / "DEP-000"
    name: str

    def scan(self, path) -> list[Finding]: ...
    def error_finding(self, error: str) -> Finding
```

Rules for every scanner:

- Static analysis only. Never unpickle, `torch.load`, import, install or execute an uploaded file.
- A file the scanner cannot parse is reported as a finding. It must not raise.

## Using it

```python
from app.scanners import run_scanner, get_scanner

findings = run_scanner(artifact.artifact_type, path)   # enum or "DATASET" string
```

`run_scanner` catches any exception from a scanner and returns a single
`<PREFIX>-000` MALFORMED_FILE finding, so a scan never fails because of a bad file.
`get_scanner` raises `KeyError` for an unknown type.

## Adding a scanner

1. Subclass `Scanner`, set `artifact_type`, `error_rule_id` and `name`, and implement `scan`.
2. Add an instance to the tuple in `registry.py`.
3. Add tests under `tests/`.

## API / frontend impact (Person B)

- No schema or API change. Findings come back in the same shape as before
  (`rule_id`, `finding_type`, `severity`, `title`, `description`, `evidence`, `recommendation`).
- CSV/JSON/JSONL/Parquet and requirements.txt/pyproject.toml uploads now return real
  `DATA-*` / `DEP-*` findings in Docker. The "Dataset/Dependency scanner not available"
  finding no longer exists, so any UI special-casing of it can be removed.
