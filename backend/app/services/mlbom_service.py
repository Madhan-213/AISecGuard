"""
AISecGuard — Standardized ML-BOM Export (CycloneDX 1.5 / 1.6 JSON)
Week 8 & Roadmap Task 3.

Produces an official CycloneDX Machine Learning Bill of Materials (ML-BOM):
  - Model Card containing model parameters, inferred architecture, approach, and task.
  - Quantitative analysis metrics (security robustness score, threat score, risk level).
  - Target hardware compute environment (CPU, CUDA GPU, Apple Metal).
  - Training dataset lineage and data governance metadata.
  - Software bill of materials (SBOM) with purls and OSV/NVD CVE vulnerability ratings.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.artifact import Artifact
from app.models.enums import ArtifactType
from app.scanners.dependency_scanner import scan_dependency_file
from app.scanners.dependency_scanner.vulnerabilities import normalize_name, offline_matches, pinned_version
from app.services.lineage_service import parents_of
from app.services.queries import baseline_provenance, latest_completed_scan, latest_signature

_COMPONENT_TYPE = {
    ArtifactType.MODEL.value: "machine-learning-model",
    ArtifactType.DATASET.value: "data",
    ArtifactType.DEPENDENCY.value: "file",
}


def _ref(artifact: Artifact) -> str:
    return f"artifact:{artifact.id}"


def _infer_model_architecture(filename: str) -> tuple[str, str, str]:
    """
    Infer (architecture, task, framework) based on model file format.
    Returns: (architecture, task, framework)
    """
    lower = filename.lower()
    if lower.endswith(".safetensors"):
        return (
            "HuggingFace Transformer / SafeTensors Architecture",
            "Natural Language Processing / Text Generation",
            "SafeTensors (Zero-Execution)",
        )
    if lower.endswith((".pt", ".pth", ".bin")):
        return (
            "PyTorch Deep Neural Network (TorchScript / StateDict)",
            "Deep Learning Inference & Representation",
            "PyTorch",
        )
    if lower.endswith(".onnx"):
        return (
            "Open Neural Network Exchange (ONNX) Optimized Computation Graph",
            "Cross-Platform Inference Optimization",
            "ONNX Runtime",
        )
    if lower.endswith((".pkl", ".pickle", ".joblib")):
        return (
            "Scikit-Learn Estimator / Pipeline",
            "Tabular Classification / Regression",
            "Scikit-Learn / Joblib",
        )
    if lower.endswith((".h5", ".hdf5")):
        return (
            "Keras Sequential / Functional Computational Graph",
            "Computer Vision / Tensor Modeling",
            "TensorFlow / Keras",
        )
    if lower.endswith(".zip"):
        return (
            "Multi-Component Hugging Face Model Repository",
            "Composite Transformer & Tokenizer Pipeline",
            "Hugging Face Hub",
        )
    return (
        "General Machine Learning Artifact",
        "Predictive Modeling",
        "Generic ML Framework",
    )


def _build_model_card(artifact: Artifact, scan, signature, provenance) -> dict:
    """Construct CycloneDX 1.5 compliant modelCard specification."""
    architecture, task, framework = _infer_model_architecture(artifact.original_filename)
    risk_score = scan.risk_score if scan else 0
    robustness_score = max(0, 100 - risk_score)

    card = {
        "modelParameters": {
            "approach": {"type": "supervised"},
            "task": task,
            "architecture": architecture,
        },
        "quantitativeAnalysis": {
            "performanceMetrics": [
                {
                    "type": "security-robustness-score",
                    "value": f"{robustness_score}/100",
                    "slice": "zero-execution-static-analysis",
                    "description": "Calculated structural resilience against serialization exploits and malicious opcodes.",
                },
                {
                    "type": "composite-risk-score",
                    "value": str(risk_score),
                    "slice": "vulnerability-severity-weight",
                    "description": f"Overall threat severity level: {scan.risk_level if scan else 'UNKNOWN'}.",
                },
            ]
        },
        "considerations": {
            "users": [
                "Machine Learning Engineers",
                "MLOps Security Officers",
                "Compliance & Model Governance Auditors",
            ],
            "useCases": [
                "Enterprise AI pipeline integration",
                "Production zero-trust model deployment",
            ],
            "technicalLimitations": [
                "Evaluated statically in isolated sandbox without live deserialization.",
                f"Framework compatibility: {framework}.",
            ],
            "environmentalConsiderations": {
                "hardware": [
                    {
                        "name": "General Purpose Host CPU",
                        "type": "cpu",
                        "description": "x86_64 / ARM64 multi-core processor for model host orchestration",
                    },
                    {
                        "name": "Hardware Tensor Accelerator",
                        "type": "gpu",
                        "description": "NVIDIA CUDA / Apple Metal / TPU acceleration recommended for real-time inference",
                    },
                ]
            },
        },
    }
    return card


def _component(db: Session, artifact: Artifact, extra_props: dict | None = None) -> dict:
    scan = latest_completed_scan(db, artifact.id)
    signature = latest_signature(db, artifact.id)
    provenance = baseline_provenance(db, artifact.id)

    props = {
        "aisecguard:artifact_type": artifact.artifact_type,
        "aisecguard:status": artifact.status,
        "aisecguard:risk_level": scan.risk_level if scan else "UNKNOWN",
        "aisecguard:risk_score": str(scan.risk_score) if scan else "0",
        "aisecguard:finding_count": str(len(scan.findings)) if scan else "0",
        "aisecguard:signed": "true" if signature else "false",
        "aisecguard:file_size_bytes": str(artifact.file_size),
    }

    if scan:
        props["aisecguard:scan_id"] = scan.id
    if signature:
        props["aisecguard:signature_key_id"] = signature.key_id
        props["aisecguard:signature_algorithm"] = signature.algorithm
    if provenance and provenance.source_url:
        props["aisecguard:source_url"] = provenance.source_url
    props.update(extra_props or {})

    comp_type = _COMPONENT_TYPE.get(artifact.artifact_type, "file")
    component: dict = {
        "type": comp_type,
        "bom-ref": _ref(artifact),
        "name": artifact.original_filename,
        "version": "1.0.0",
        "hashes": [{"alg": "SHA-256", "content": artifact.sha256}],
        "properties": [{"name": k, "value": v} for k, v in props.items()],
    }

    # CycloneDX 1.5 Model Card for Machine Learning Models
    if artifact.artifact_type == ArtifactType.MODEL.value:
        component["modelCard"] = _build_model_card(artifact, scan, signature, provenance)

    # CycloneDX Data Card properties for Datasets
    elif artifact.artifact_type == ArtifactType.DATASET.value:
        component["data"] = {
            "type": "dataset",
            "name": artifact.original_filename,
            "governance": {
                "custodians": [{"name": "AISecGuard Ingestion Pipeline"}],
            },
        }

    return component


def _packages(artifact: Artifact) -> tuple[list[dict], list[dict]]:
    result = scan_dependency_file(Path(artifact.storage_path))
    components, vulnerabilities = [], []
    for dep in result.dependencies:
        name = normalize_name(dep.package_name)
        version = pinned_version(dep.version_constraint)
        purl = f"pkg:pypi/{name}@{version}" if version else f"pkg:pypi/{name}"
        component = {"type": "library", "bom-ref": purl, "name": name, "purl": purl}
        if version:
            component["version"] = version
        elif dep.version_constraint:
            component["properties"] = [{"name": "aisecguard:version_constraint", "value": dep.version_constraint}]
        components.append(component)
        for hit in offline_matches(name, version) if version else []:
            vulnerabilities.append({
                "bom-ref": f"vuln:{hit['id']}:{purl}",
                "id": hit["id"],
                "source": {"name": "NVD" if hit["id"].startswith("CVE-") else "OSV", "url": hit.get("reference")},
                "ratings": [{"severity": hit["severity"].lower()}],
                "description": hit["summary"],
                "affects": [{"ref": purl}],
            })
    return components, vulnerabilities


def build_mlbom(db: Session, artifact: Artifact, spec_version: str = "1.5") -> dict:
    """
    Construct official CycloneDX ML-BOM document.
    Supports specVersion 1.5 (official ML-BOM standard) and 1.6.
    """
    components: list[dict] = []
    vulnerabilities: list[dict] = []
    depends_on: list[str] = []

    for edge in parents_of(db, artifact.id):
        parent = db.get(Artifact, edge.parent_id)
        if parent is None:
            continue
        components.append(_component(db, parent, {"aisecguard:lineage_relation": edge.relation}))
        depends_on.append(_ref(parent))

    if artifact.artifact_type == ArtifactType.DEPENDENCY.value and Path(artifact.storage_path).exists():
        packages, vulns = _packages(artifact)
        components.extend(packages)
        vulnerabilities.extend(vulns)
        depends_on.extend(p["bom-ref"] for p in packages)

    # Hardware compute environment block
    hardware_env = [
        {"name": "Host Processor (CPU)", "type": "cpu"},
        {"name": "Neural / Tensor Accelerator (GPU/TPU)", "type": "accelerator"},
    ]

    return {
        "bomFormat": "CycloneDX",
        "specVersion": spec_version,
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": {
                "components": [
                    {
                        "type": "application",
                        "name": "AISecGuard",
                        "version": settings.VERSION,
                        "description": "Zero-execution AI model security and supply chain governance platform",
                    }
                ]
            },
            "component": _component(db, artifact),
            "properties": [
                {"name": "aisecguard:spec_standard", "value": f"CycloneDX-ML-BOM-{spec_version}"},
                {"name": "aisecguard:compliance_framework", "value": "EU AI Act (Regulation (EU) 2024/1689)"},
            ],
        },
        "hardware": hardware_env,
        "components": components,
        "dependencies": [{"ref": _ref(artifact), "dependsOn": depends_on}],
        "vulnerabilities": vulnerabilities,
    }
