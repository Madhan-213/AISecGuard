# Supply-chain engines (Week 8)

Static engines that extend the scanners: integrity checks, CVE matching, model
signing, ML-BOM export, data lineage, and compliance evidence. Nothing here
loads or executes an uploaded artifact.

## New finding rules

| Rule | Severity | When it fires | Where |
| --- | --- | --- | --- |
| PROV-001 | HIGH | Stored file no longer matches the SHA-256 recorded at upload | `services/integrity_service.py` |
| PROV-002 | HIGH | File does not match the `expected_sha256` given at upload | `services/integrity_service.py` |
| PROV-003 | MEDIUM | A file with the same name was uploaded before with different content | `services/integrity_service.py` |
| DEP-007 | from advisory | A pinned dependency version has a known CVE (bundled list; OSV.dev when enabled) | `scanners/dependency_scanner/vulnerabilities.py` |
| LIN-001 | HIGH | An upstream artifact (up to 5 hops) is quarantined or scored HIGH/CRITICAL | `services/lineage_service.py` |
| DATA-012 | MEDIUM | A derived dataset added or removed columns compared with its parent | `services/lineage_service.py` |
| DATA-013 | LOW | A derived dataset's row count changed by more than 50% | `services/lineage_service.py` |
| DATA-014 | MEDIUM | A label-like column's class distribution shifted by 20% or more (total variation distance) | `services/lineage_service.py` |

New finding types `KNOWN_VULNERABILITY` and `UPSTREAM_RISK` are added to the
PostgreSQL enum by migration `c3d4e5f6a7b8`.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/artifacts/upload` | – | New optional form field `expected_sha256` |
| POST | `/api/v1/artifacts/{id}/sign` | yes | Approve and sign (refused for unscanned, quarantined, HIGH/CRITICAL or LIN-001 artifacts) |
| GET | `/api/v1/artifacts/{id}/signature` | – | `{signed, valid, reasons, signature}` |
| GET | `/api/v1/signing/public-key` | – | Ed25519 public key and key ID |
| GET | `/api/v1/artifacts/{id}/mlbom` | – | CycloneDX 1.6 ML-BOM |
| GET | `/api/v1/artifacts/{id}/lineage` | – | `{root_id, nodes, edges}` |
| POST | `/api/v1/lineage` | yes | `{parent_id, child_id, relation, note}` |
| DELETE | `/api/v1/lineage/{edge_id}` | yes | Remove a link |
| GET | `/api/v1/artifacts/{id}/compliance` | – | EU AI Act Art. 10–15 evidence (MET / PARTIAL / GAP / NOT_APPLICABLE) |
| GET | `/api/v1/artifacts/{id}/model-card` | – | Generated model card (Markdown) |
| GET | `/api/v1/audit/verify` | – | Checks the quarantine audit hash chain |

Lineage relations (parent → child): `TRAINED_ON` dataset → model,
`FINE_TUNED_FROM` model → model, `DERIVED_FROM` dataset → dataset,
`DEPENDS_ON` dependency file → model. Cycles and self-links are refused.

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIGNING_KEY_PATH` | `<UPLOAD_DIR>/.keys/signing_ed25519.pem` | Ed25519 private key, created on first use with owner-only permissions |
| `OSV_LOOKUP_ENABLED` | `false` | Also query OSV.dev for pinned packages; network errors never fail a scan |
| `OSV_TIMEOUT_SECONDS` | `5.0` | Per-request timeout for OSV |

## Known limits

- Signing uses a local key, not Sigstore keyless signing with a transparency log.
- The audit chain detects edits to past rows, but someone with database write
  access could rebuild the whole chain; anchoring the latest hash elsewhere would close that.
- Compliance output is evidence for documentation, not a legal assessment.
- Backdoor detection and runtime protection are not implemented (they need a
  sandbox that loads models).
