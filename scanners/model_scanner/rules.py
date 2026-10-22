"""
AISecGuard — Model Scanner Rules (Week 4)
Defines rule IDs, severity, and descriptions for static model security inspection.

IMPORTANT: All checks are static heuristics.
A finding does NOT guarantee malice or vulnerability.
"""

from dataclasses import dataclass
from app.models.enums import FindingType, FindingSeverity


@dataclass(frozen=True)
class ModelRule:
    """Defines a single model scanner rule."""
    rule_id: str
    title: str
    finding_type: FindingType
    severity: FindingSeverity
    description: str
    recommendation: str


RULE_PICKLE_FORMAT = ModelRule(
    rule_id="MODEL-001",
    title="Pickle-based serialization detected",
    finding_type=FindingType.UNSAFE_SERIALIZATION,
    severity=FindingSeverity.HIGH,
    description=(
        "The uploaded model uses a pickle-based serialization format (.pkl/.pickle/.joblib). "
        "Pickle can execute arbitrary Python code during deserialization. "
        "A malicious actor could craft a pickle file that runs OS commands "
        "or downloads malware when loaded."
    ),
    recommendation=(
        "Prefer safer serialization formats such as SafeTensors or ONNX where possible. "
        "Only load pickle files from fully trusted sources in isolated environments."
    ),
)

RULE_PICKLE_SUSPICIOUS_REF = ModelRule(
    rule_id="MODEL-002",
    title="Suspicious module/callable references found in pickle opcodes",
    finding_type=FindingType.SUSPICIOUS_REFERENCE,
    severity=FindingSeverity.CRITICAL,
    description=(
        "Static inspection of the pickle opcodes found references to modules "
        "or callables that are commonly used in malicious pickle payloads. "
        "These references could execute system commands or network operations "
        "when the pickle is deserialized."
    ),
    recommendation=(
        "DO NOT deserialize this artifact in a production or privileged environment. "
        "Investigate the artifact origin. Reject or quarantine this file."
    ),
)

RULE_PYTORCH_FORMAT = ModelRule(
    rule_id="MODEL-003",
    title="PyTorch model format detected",
    finding_type=FindingType.UNSAFE_SERIALIZATION,
    severity=FindingSeverity.MEDIUM,
    description=(
        "The file appears to be in PyTorch format. "
        "PyTorch model files typically contain pickle data internally. "
        "Inner data can contain arbitrary Python code execution logic."
    ),
    recommendation=(
        "Only load from trusted sources. Consider using torch.load() with "
        "weights_only=True (PyTorch 2.0+) or preferring SafeTensors format."
    ),
)

RULE_HDF5_FORMAT = ModelRule(
    rule_id="MODEL-004",
    title="HDF5/Keras model format detected",
    finding_type=FindingType.UNSAFE_SERIALIZATION,
    severity=FindingSeverity.MEDIUM,
    description=(
        "The file uses HDF5 format (commonly used by Keras/TensorFlow). "
        "HDF5 model files can include lambda layers and custom objects "
        "that execute Python code during loading."
    ),
    recommendation=(
        "Ensure custom layers are verified before loading. "
        "Consider using TensorFlow SavedModel format or ONNX for safer sharing."
    ),
)

RULE_ONNX_FORMAT = ModelRule(
    rule_id="MODEL-005",
    title="ONNX model format detected",
    finding_type=FindingType.PROVENANCE_RECORDED,
    severity=FindingSeverity.INFORMATIONAL,
    description=(
        "The file appears to be an ONNX model. "
        "ONNX uses a structured protobuf format and is significantly safer "
        "than arbitrary pickle deserialization."
    ),
    recommendation="Verify model provenance and signature before deployment.",
)

RULE_SAFETENSORS_FORMAT = ModelRule(
    rule_id="MODEL-006",
    title="SafeTensors model format detected",
    finding_type=FindingType.PROVENANCE_RECORDED,
    severity=FindingSeverity.INFORMATIONAL,
    description=(
        "The file appears to be in SafeTensors format. "
        "SafeTensors is designed specifically to prevent arbitrary code execution "
        "during model deserialization and is considered a secure format."
    ),
    recommendation="SafeTensors is recommended for weight distribution.",
)

RULE_BINARY_FORMAT = ModelRule(
    rule_id="MODEL-007",
    title="Generic binary model format (.bin)",
    finding_type=FindingType.PROVENANCE_RECORDED,
    severity=FindingSeverity.INFORMATIONAL,
    description=(
        "The file is a generic binary (.bin). Format-specific opcode inspection "
        "is not supported for this generic extension."
    ),
    recommendation="Verify source and documentation to identify underlying serialization.",
)

RULE_UNSUPPORTED_FORMAT = ModelRule(
    rule_id="MODEL-008",
    title="Unsupported or unknown model file extension",
    finding_type=FindingType.UNKNOWN_FORMAT,
    severity=FindingSeverity.MEDIUM,
    description="The file extension is not recognized as a supported model format.",
    recommendation="Upload models with supported extensions (.pkl, .pt, .pth, .h5, .onnx, .safetensors, .bin).",
)

RULE_SUSPICIOUS_STRING = ModelRule(
    rule_id="MODEL-009",
    title="Suspicious embedded string detected in binary model",
    finding_type=FindingType.SUSPICIOUS_REFERENCE,
    severity=FindingSeverity.HIGH,
    description=(
        "Static byte scanning found suspicious command or network string patterns "
        "embedded in the model binary."
    ),
    recommendation=(
        "Inspect the model origin and do not deploy in a production environment "
        "without deep reverse engineering or verification."
    ),
)

RULE_LARGE_FILE = ModelRule(
    rule_id="MODEL-010",
    title="Large model file warning",
    finding_type=FindingType.LARGE_FILE_WARNING,
    severity=FindingSeverity.LOW,
    description="The model file exceeds 500 MB in size.",
    recommendation="Ensure system resources and bandwidth are adequate for processing large models.",
)

RULE_SCAN_ERROR = ModelRule(
    rule_id="MODEL-011",
    title="Scanner error inspecting model file",
    finding_type=FindingType.OTHER,
    severity=FindingSeverity.MEDIUM,
    description="The scanner encountered an unexpected error reading or inspecting the file.",
    recommendation="Verify the file is not corrupted or truncated.",
)

# Reference definitions
SUSPICIOUS_REFERENCES = {
    "os", "subprocess", "sys", "shutil", "ctypes", "pty",
    "eval", "exec", "__import__", "compile",
    "socket", "urllib", "requests", "http",
    "builtins.eval", "builtins.exec",
    "Popen", "system", "call", "check_output", "spawn",
}

SUSPICIOUS_STRINGS = [
    b"import os", b"import subprocess", b"import sys",
    b"exec(", b"eval(", b"__import__(",
    b"os.system", b"subprocess.Popen", b"socket.connect",
    b"urllib.request", b"requests.get", b"/bin/sh", b"cmd.exe",
    b"base64.b64decode",
]
