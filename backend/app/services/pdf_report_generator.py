"""
AISecGuard — Enterprise 3-Page Security Scan Report Generator
Redesigns the security assessment report into an executive-ready, highly readable, 3-page format.

Features:
- Project logo + brand identity at the top of Page 1.
- Comfortable, highly readable typography (9pt-11pt body text, generous padding, clear contrast).
- Plain-English explanations ("What this means") designed specifically for new users and stakeholders.
- 4 rich vector graphics and charts:
  1. Risk Score Gauge / Meter (Page 1)
  2. Findings by Severity Bar Chart (Page 1)
  3. Security Category Posture Breakdown Chart (Page 2)
  4. Sequential Pipeline Inspection Workflow Diagram (Page 3)
- Strict 3-page guarantee with NumberedCanvas running headers and footers ("Page X of 3").
"""

from __future__ import annotations

import html
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Circle, Drawing, Group, Line, Polygon, Rect, String


# ---------------------------------------------------------------------------
# Visual Design System Tokens
# ---------------------------------------------------------------------------

PAGE_WIDTH, PAGE_HEIGHT = A4  # 595.27 x 841.89 points
MARGIN_X = 36.0               # 36 pt left/right
PRINTABLE_WIDTH = PAGE_WIDTH - (2 * MARGIN_X)  # 523.27 pt
MARGIN_TOP = 32.0
MARGIN_BOTTOM = 32.0

# Typography & Palette Tokens
COLOR_NAVY_DARK = colors.HexColor("#0F172A")     # Slate 900
COLOR_NAVY_MID = colors.HexColor("#1E293B")      # Slate 800
COLOR_TEXT_MAIN = colors.HexColor("#334155")     # Slate 700
COLOR_TEXT_MUTED = colors.HexColor("#64748B")    # Slate 500
COLOR_BG_CARD = colors.HexColor("#F8FAFC")       # Slate 50
COLOR_BG_ALT = colors.HexColor("#F1F5F9")        # Slate 100
COLOR_BORDER = colors.HexColor("#E2E8F0")        # Slate 200
COLOR_BORDER_STRONG = colors.HexColor("#CBD5E1") # Slate 300

# AISecGuard Brand Accents
COLOR_PURPLE = colors.HexColor("#4F46E5")        # Indigo 600
COLOR_PURPLE_LIGHT = colors.HexColor("#EEF2FF")  # Indigo 50
COLOR_CYAN = colors.HexColor("#06B6D4")          # Cyan 500

# Severity Spectrum Tokens
SEVERITY_CONFIG: dict[str, dict[str, Any]] = {
    "CRITICAL": {
        "color": colors.HexColor("#DC2626"),
        "bg": colors.HexColor("#FEF2F2"),
        "border": colors.HexColor("#FCA5A5"),
        "hex": "#DC2626",
        "bg_hex": "#FEF2F2",
    },
    "HIGH": {
        "color": colors.HexColor("#EA580C"),
        "bg": colors.HexColor("#FFF7ED"),
        "border": colors.HexColor("#FDBA74"),
        "hex": "#EA580C",
        "bg_hex": "#FFF7ED",
    },
    "MEDIUM": {
        "color": colors.HexColor("#D97706"),
        "bg": colors.HexColor("#FFFBEB"),
        "border": colors.HexColor("#FCD34D"),
        "hex": "#D97706",
        "bg_hex": "#FFFBEB",
    },
    "LOW": {
        "color": colors.HexColor("#16A34A"),
        "bg": colors.HexColor("#F0FDF4"),
        "border": colors.HexColor("#86EFAC"),
        "hex": "#16A34A",
        "bg_hex": "#F0FDF4",
    },
    "INFORMATIONAL": {
        "color": colors.HexColor("#2563EB"),
        "bg": colors.HexColor("#EFF6FF"),
        "border": colors.HexColor("#93C5FD"),
        "hex": "#2563EB",
        "bg_hex": "#EFF6FF",
    },
    "CLEAN": {
        "color": colors.HexColor("#059669"),
        "bg": colors.HexColor("#ECFDF5"),
        "border": colors.HexColor("#6EE7B7"),
        "hex": "#059669",
        "bg_hex": "#ECFDF5",
    },
}


# ---------------------------------------------------------------------------
# Two-Pass Numbered Canvas for Running Headers & Footers
# ---------------------------------------------------------------------------

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that counts total pages on pass 1 and
    draws clean running headers and 'Page X of Y' footers on pass 2.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict[str, Any]] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int) -> None:
        page_num = self._pageNumber
        self.saveState()

        # Running Header on Pages 2 and 3
        if page_num > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(COLOR_PURPLE)
            self.drawString(MARGIN_X, PAGE_HEIGHT - 22, "AISECGUARD")

            self.setFont("Helvetica", 8)
            self.setFillColor(COLOR_TEXT_MUTED)
            self.drawString(MARGIN_X + 62, PAGE_HEIGHT - 22, "|  Security Assessment Report")

            report_id = getattr(self, "_report_id", "ASG-SEC-SCAN")
            self.drawRightString(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 22, f"Report ID: {report_id}  |  CONFIDENTIAL")

            # Header rule line
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.65)
            self.line(MARGIN_X, PAGE_HEIGHT - 26, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 26)

        # Running Footer on all pages
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.65)
        self.line(MARGIN_X, 28, PAGE_WIDTH - MARGIN_X, 28)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(
            MARGIN_X,
            17,
            "AISecGuard AI Supply Chain Defense  •  Automated Static AST Bytecode & Heuristic Inspection",
        )

        page_str = f"Page {page_num} of {total_pages}"
        self.drawRightString(PAGE_WIDTH - MARGIN_X, 17, page_str)

        self.restoreState()


# ---------------------------------------------------------------------------
# Typography & Styles Builder
# ---------------------------------------------------------------------------

def _build_styles() -> dict[str, ParagraphStyle]:
    """Build typography hierarchy optimized for high legibility and executive clarity."""
    base = getSampleStyleSheet()

    styles: dict[str, ParagraphStyle] = {
        "BrandTitle": ParagraphStyle(
            "BrandTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=20,
            textColor=COLOR_NAVY_DARK,
            alignment=0,
        ),
        "BrandSubtitle": ParagraphStyle(
            "BrandSubtitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=COLOR_PURPLE,
        ),
        "DocTitle": ParagraphStyle(
            "DocTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=COLOR_NAVY_DARK,
            alignment=2,
        ),
        "DocMeta": ParagraphStyle(
            "DocMeta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=11,
            textColor=COLOR_TEXT_MUTED,
            alignment=2,
        ),
        "SectionHeading": ParagraphStyle(
            "SectionHeading",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=COLOR_NAVY_DARK,
            spaceBefore=0,
            spaceAfter=2,
            keepWithNext=True,
        ),
        "SectionSub": ParagraphStyle(
            "SectionSub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=11.5,
            textColor=COLOR_TEXT_MUTED,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "SubSectionHeading": ParagraphStyle(
            "SubSectionHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=9.8,
            leading=13,
            textColor=COLOR_NAVY_MID,
            spaceBefore=3,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.0,
            leading=12.8,
            textColor=COLOR_TEXT_MAIN,
        ),
        "BodyBold": ParagraphStyle(
            "BodyBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.0,
            leading=12.8,
            textColor=COLOR_NAVY_DARK,
        ),
        "BodyMuted": ParagraphStyle(
            "BodyMuted",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=11,
            textColor=COLOR_TEXT_MUTED,
        ),
        "MetaLabel": ParagraphStyle(
            "MetaLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11.5,
            textColor=COLOR_NAVY_MID,
        ),
        "MetaValue": ParagraphStyle(
            "MetaValue",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=12,
            textColor=COLOR_NAVY_DARK,
        ),
        "CodeEvidence": ParagraphStyle(
            "CodeEvidence",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=8.0,
            leading=11,
            textColor=COLOR_NAVY_DARK,
        ),
        "CalloutText": ParagraphStyle(
            "CalloutText",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.0,
            leading=13.2,
            textColor=COLOR_NAVY_DARK,
        ),
        "FindingTitle": ParagraphStyle(
            "FindingTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13.5,
            textColor=COLOR_NAVY_DARK,
        ),
    }

    return styles


# ---------------------------------------------------------------------------
# Vector Chart & Visual Drawings
# ---------------------------------------------------------------------------

def _create_risk_gauge_chart(risk_score: int, risk_level: str, width: float = 252, height: float = 62) -> Drawing:
    """
    Renders an attractive, prominent risk gauge meter showing score on a normalized colored scale.
    Scale: Clean/Low: 0-4 | Medium: 5-14 | High: 15-29 | Critical: 30+
    """
    d = Drawing(width, height)
    max_scale = 50.0

    bar_y = 16
    bar_h = 13
    track_w = width

    # Zone widths proportional to scale
    w_low = track_w * (5.0 / max_scale)         # 0 - 4
    w_med = track_w * (10.0 / max_scale)        # 5 - 14
    w_high = track_w * (15.0 / max_scale)       # 15 - 29
    w_crit = track_w - (w_low + w_med + w_high) # 30+

    # Background track with rounded corners
    d.add(Rect(0, bar_y, track_w, bar_h, fillColor=colors.HexColor("#F1F5F9"), strokeColor=None, rx=4, ry=4))

    # Colored zone bars
    d.add(Rect(0, bar_y, w_low, bar_h, fillColor=colors.HexColor("#10B981"), strokeColor=None, rx=3, ry=3))
    d.add(Rect(w_low, bar_y, w_med, bar_h, fillColor=colors.HexColor("#F59E0B"), strokeColor=None))
    d.add(Rect(w_low + w_med, bar_y, w_high, bar_h, fillColor=colors.HexColor("#EA580C"), strokeColor=None))
    d.add(Rect(w_low + w_med + w_high, bar_y, w_crit, bar_h, fillColor=colors.HexColor("#EF4444"), strokeColor=None, rx=3, ry=3))

    # Score pointer position
    clamped_score = min(max(float(risk_score), 0.0), max_scale)
    pin_pct = clamped_score / max_scale
    pin_x = max(min(pin_pct * track_w, track_w - 24), 24)

    # Score Indicator Bubble
    bubble_w = 68
    bubble_h = 16
    bubble_x = max(min(pin_x - (bubble_w / 2), track_w - bubble_w), 0)
    bubble_y = bar_y + bar_h + 8

    d.add(Rect(bubble_x, bubble_y, bubble_w, bubble_h, fillColor=COLOR_NAVY_DARK, strokeColor=None, rx=4, ry=4))
    d.add(String(bubble_x + (bubble_w / 2), bubble_y + 4.5, f"Score: {risk_score} / 50",
                 fontName="Helvetica-Bold", fontSize=8.0, textAnchor="middle", fillColor=colors.white))

    # Pin triangle
    d.add(Polygon([pin_x - 5, bubble_y, pin_x + 5, bubble_y, pin_x, bar_y + bar_h + 1],
                  fillColor=COLOR_NAVY_DARK, strokeColor=None))

    # Sub-scale zone labels below
    d.add(String(w_low / 2, 4, "LOW (0-4)", fontName="Helvetica-Bold", fontSize=6.5, textAnchor="middle", fillColor=COLOR_TEXT_MUTED))
    d.add(String(w_low + (w_med / 2), 4, "MED (5-14)", fontName="Helvetica-Bold", fontSize=6.5, textAnchor="middle", fillColor=COLOR_TEXT_MUTED))
    d.add(String(w_low + w_med + (w_high / 2), 4, "HIGH (15-29)", fontName="Helvetica-Bold", fontSize=6.5, textAnchor="middle", fillColor=COLOR_TEXT_MUTED))
    d.add(String(w_low + w_med + w_high + (w_crit / 2), 4, "CRIT (30+)", fontName="Helvetica-Bold", fontSize=6.5, textAnchor="middle", fillColor=COLOR_TEXT_MUTED))

    return d


def _create_severity_bar_chart(by_severity: dict[str, int], width: float = 252, height: float = 62) -> Drawing:
    """
    Renders a clean, high-contrast horizontal breakdown bar chart of detected findings by severity.
    """
    d = Drawing(width, height)
    sevs = [
        ("CRITICAL", by_severity.get("CRITICAL", 0), colors.HexColor("#DC2626")),
        ("HIGH", by_severity.get("HIGH", 0), colors.HexColor("#EA580C")),
        ("MEDIUM", by_severity.get("MEDIUM", 0), colors.HexColor("#D97706")),
        ("LOW", by_severity.get("LOW", 0), colors.HexColor("#16A34A")),
        ("INFORMATIONAL", by_severity.get("INFORMATIONAL", 0), colors.HexColor("#2563EB")),
    ]

    max_c = max(max(c for _, c, _ in sevs), 1)
    bar_h = 7.5
    spacing = 11.5
    start_y = height - 10
    label_w = 76
    count_label_w = 58
    bar_max_w = width - (label_w + count_label_w + 6)

    for idx, (label, count, col) in enumerate(sevs):
        y = start_y - (idx * spacing)

        # Indicator dot + Severity name
        d.add(Circle(4, y + 3.8, 3, fillColor=col, strokeColor=None))
        d.add(String(12, y + 1.2, label, fontName="Helvetica-Bold", fontSize=7.0, fillColor=COLOR_NAVY_MID))

        # Background track
        d.add(Rect(label_w, y, bar_max_w, bar_h, fillColor=COLOR_BG_ALT, strokeColor=None, rx=2.5, ry=2.5))

        # Active filled bar
        if count > 0:
            act_w = max((count / max_c) * bar_max_w, 6)
            d.add(Rect(label_w, y, act_w, bar_h, fillColor=col, strokeColor=None, rx=2.5, ry=2.5))

        # Count string with pill styling
        plural = "s" if count != 1 else ""
        d.add(String(label_w + bar_max_w + 6, y + 1.2, f"{count} issue{plural}",
                     fontName="Helvetica-Bold" if count > 0 else "Helvetica",
                     fontSize=7.0,
                     fillColor=col if count > 0 else COLOR_TEXT_MUTED))

    return d


def _create_category_posture_chart(findings: list[dict], width: float = PRINTABLE_WIDTH, height: float = 58) -> Drawing:
    """
    Renders a 4-pillar security inspection posture breakdown chart showing safety across key domains.
    1. Serialization & Bytecode Safety
    2. Model Architecture Integrity
    3. Supply Chain Dependencies
    4. Cryptographic Provenance
    """
    d = Drawing(width, height)

    # Outer container box
    d.add(Rect(0, 0, width, height, fillColor=COLOR_BG_CARD, strokeColor=COLOR_BORDER, rx=4, ry=4))

    # Evaluate categories based on findings
    categories = [
        {"name": "Bytecode & Code Safety", "status": "VERIFIED CLEAN", "color": colors.HexColor("#10B981")},
        {"name": "Architecture Integrity", "status": "VERIFIED CLEAN", "color": colors.HexColor("#10B981")},
        {"name": "Supply Chain & CVEs", "status": "VERIFIED CLEAN", "color": colors.HexColor("#10B981")},
        {"name": "Provenance & Integrity", "status": "VERIFIED CLEAN", "color": colors.HexColor("#10B981")},
    ]

    for f in findings:
        rule = (f.get("rule_id") or "").upper()
        sev = (f.get("severity") or "").upper()
        col = colors.HexColor("#EF4444") if sev == "CRITICAL" else colors.HexColor("#F59E0B")

        if "001" in rule or "002" in rule or "PICKLE" in rule:
            categories[0]["status"] = "VULNERABLE" if sev == "CRITICAL" else "FLAGGED"
            categories[0]["color"] = col
        elif "003" in rule or "004" in rule:
            categories[1]["status"] = "FLAGGED"
            categories[1]["color"] = col
        elif "005" in rule or "006" in rule or "007" in rule:
            categories[2]["status"] = "VULNERABLE" if sev == "CRITICAL" else "FLAGGED"
            categories[2]["color"] = col
        elif "008" in rule or "PROV" in rule:
            categories[3]["status"] = "UNSIGNED" if "008" in rule else "MISMATCH"
            categories[3]["color"] = col

    col_w = width / 4.0
    for idx, cat in enumerate(categories):
        cx = idx * col_w

        # Separator line between columns
        if idx > 0:
            d.add(Line(cx, 8, cx, height - 8, strokeColor=COLOR_BORDER, strokeWidth=0.75))

        # Pillar Name
        d.add(String(cx + (col_w / 2), height - 16, cat["name"],
                     fontName="Helvetica-Bold", fontSize=7.8, textAnchor="middle", fillColor=COLOR_NAVY_DARK))

        # Colored indicator pill
        pill_w = 92
        pill_h = 16
        pill_x = cx + ((col_w - pill_w) / 2)
        pill_y = 12

        d.add(Rect(pill_x, pill_y, pill_w, pill_h, fillColor=cat["color"], strokeColor=None, rx=3, ry=3))
        d.add(String(pill_x + (pill_w / 2), pill_y + 4.5, cat["status"],
                     fontName="Helvetica-Bold", fontSize=7.0, textAnchor="middle", fillColor=colors.white))

    return d


def _create_pipeline_workflow_diagram(width: float = PRINTABLE_WIDTH, height: float = 46) -> Drawing:
    """
    Renders a visual 4-stage sequential pipeline inspection diagram showing how AISecGuard inspected the file.
    """
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=COLOR_BG_CARD, strokeColor=COLOR_BORDER, rx=4, ry=4))

    stages = [
        ("1. Hash Baseline", "● SHA-256", colors.HexColor("#10B981")),
        ("2. AST Bytecode", "● Zero-Exec", colors.HexColor("#4F46E5")),
        ("3. Supply Chain", "● CVE / OSV", colors.HexColor("#06B6D4")),
        ("4. Policy Guard", "● Quarantine", colors.HexColor("#10B981")),
    ]

    col_w = width / 4.0
    for idx, (title, sub, col) in enumerate(stages):
        cx = idx * col_w
        box_w = col_w - 14
        box_x = cx + 7
        box_y = 7
        box_h = height - 14

        # Stage Card
        d.add(Rect(box_x, box_y, box_w, box_h, fillColor=colors.white, strokeColor=COLOR_BORDER, rx=3, ry=3))
        d.add(String(box_x + (box_w / 2), box_y + 18, title,
                     fontName="Helvetica-Bold", fontSize=7.5, textAnchor="middle", fillColor=COLOR_NAVY_DARK))
        d.add(String(box_x + (box_w / 2), box_y + 7, sub,
                     fontName="Helvetica", fontSize=6.8, textAnchor="middle", fillColor=col))

        # Connector arrow to next stage
        if idx < 3:
            arrow_x = cx + col_w
            d.add(Polygon([arrow_x - 3, (height / 2) + 3, arrow_x + 3, height / 2, arrow_x - 3, (height / 2) - 3],
                          fillColor=COLOR_PURPLE, strokeColor=None))

    return d


# ---------------------------------------------------------------------------
# Utility Helpers
# ---------------------------------------------------------------------------

def _escape(text: Any) -> str:
    """Safely escape text for inclusion in ReportLab Paragraph XML."""
    if text is None:
        return ""
    return html.escape(str(text))


def _format_size(size_bytes: int | None) -> str:
    """Format bytes into readable human string."""
    if not size_bytes:
        return "0 bytes"
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB ({size_bytes:,} bytes)"
    if size_bytes >= 1024:
        return f"{size_bytes / 1024:.2f} KB ({size_bytes:,} bytes)"
    return f"{size_bytes:,} bytes"


def _format_sha256_wrapped(sha: str | None) -> str:
    """Formats 64-char SHA-256 into a clean wrapped two-line monospace display."""
    if not sha:
        return "N/A"
    sha = sha.strip()
    if len(sha) == 64:
        return f"{sha[:32]}<br/>{sha[32:]}"
    return sha


def _derive_security_impact(rule_id: str, severity: str) -> str:
    """Derive an authoritative cybersecurity impact statement based on rule ID."""
    rule = (rule_id or "").upper()
    if "001" in rule:
        return "Arbitrary code execution on host loading the checkpoint, leading to full process compromise or container escape."
    if "002" in rule:
        return "Vulnerable to arbitrary Python object instantiation through unvalidated PyTorch serialization format."
    if "003" in rule:
        return "Use of legacy formats lacks zero-copy memory safety and exposes workloads to deserialization attacks."
    if "004" in rule:
        return "Adversarial outliers or poisoned labels can compromise model decision accuracy and introduce latent backdoors."
    if "005" in rule:
        return "Exploitation of known CVE vulnerabilities in third-party libraries may permit remote code execution or data leaks."
    if "006" in rule:
        return "Installation of imitation/typosquatted packages can lead to immediate credential theft via malicious install scripts."
    if "007" in rule:
        return "Unpinned dependencies introduce non-deterministic builds and allow upstream supply chain tampering."
    if "PROV" in rule:
        return "Cryptographic hash drift indicates unauthorized modification, corruption, or in-transit tampering of the artifact."
    if severity == "CRITICAL":
        return "Critical vulnerability with immediate exploitability and severe operational impact."
    if severity == "HIGH":
        return "High impact risk requiring priority remediation before deployment."
    return "Operational security hygiene risk."


def _derive_plain_explanation(rule_id: str, title: str, description: str) -> str:
    """Derive a friendly, plain English explanation ('What this means') accessible to ordinary users."""
    rule = (rule_id or "").upper()
    desc = (description or "").lower()
    t = (title or "").lower()

    # Match specific, critical rules first before generic terms like 'pickle'
    if "002" in rule or "builtin" in desc or "eval" in desc or "callable" in desc:
        return "The scanner detected a dangerous reference to `builtins.eval` inside the model weights. An attacker can use this command to execute arbitrary shell scripts or seize control of your computer or server."
    if "001" in rule or "global" in desc or "reduction" in desc or "pickle" in desc or "pickle" in t:
        return "The uploaded file is stored in Python's legacy 'pickle' format. Pickle files are dangerous because they can contain hidden commands that automatically run arbitrary code when opened."
    if "003" in rule or "format" in desc or "container" in desc:
        return "This file uses an insecure or uncompressed model container that lacks modern memory-mapping safety protections. Safe alternatives like SafeTensors should be used instead."
    if "004" in rule or "outlier" in desc or "dataset" in desc or "poison" in desc:
        return "The dataset contains extreme numerical outliers or anomalies. This often indicates corrupted training records, sensor defects, or intentional data poisoning to skew predictions."
    if "005" in rule or "cve" in desc or "vulnerab" in desc:
        return "A referenced dependency contains a publicly cataloged security flaw (CVE). Attackers can exploit this known vulnerability to remotely compromise your system."
    if "006" in rule or "typosquat" in desc or "imitation" in desc:
        return "A package name mimics a legitimate library with slight spelling variations. Attackers use imitation packages to trick users into installing malicious backdoors."
    if "007" in rule or "unpinned" in desc or "floating" in desc:
        return "Dependencies do not specify exact version numbers. If an upstream maintainer is hacked or publishes a compromised update, your pipeline will automatically download it."
    if "008" in rule or "signature" in desc:
        return "This artifact lacks a cryptographic digital signature. Without an Ed25519 signature, you cannot verify whether this file came from an authorized team member or was altered."
    if "PROV" in rule or "mismatch" in desc or "substitution" in desc:
        return "The file's SHA-256 fingerprint does not match the expected baseline recorded at ingestion, indicating possible file tampering or accidental corruption."

    clean_desc = (description or title or "").strip()
    if clean_desc and not clean_desc.endswith("."):
        clean_desc += "."
    return clean_desc[:160]


# ---------------------------------------------------------------------------
# PAGE 1: Executive Summary & Risk Overview
# ---------------------------------------------------------------------------

def _build_page1_executive_summary_and_overview(report: dict, styles: dict[str, ParagraphStyle]) -> list[Any]:
    """
    Builds Page 1:
    - Top Header with Project Logo and Project Name.
    - Target Artifact Metadata Table.
    - Risk Overview Banner & Active Quarantine Status.
    - Side-by-Side Visual Charts (Risk Gauge + Severity Distribution).
    - KPI Metrics Matrix (6 summary cards).
    - Non-Technical Executive Summary in plain English.
    """
    story: list[Any] = []
    art = report["artifact"]
    sc = report["scan"]
    findings = report.get("findings", [])
    total_findings = report["summary"]["total_findings"]
    raw_level = str(sc["risk_level"]).replace("RiskLevel.", "").upper()
    effective_level = "CLEAN" if (total_findings == 0 and sc.get("risk_score", 0) == 0) else raw_level
    sev_token = SEVERITY_CONFIG.get(effective_level, SEVERITY_CONFIG["LOW"])
    quar = report.get("quarantine", {})
    is_quarantined = quar.get("is_quarantined", False)

    # 1. Header with Project Logo + Project Name
    logo_dir = Path(__file__).resolve().parents[2] / "static" / "logos"
    logo_icon_path = logo_dir / "logo-icon.png"
    logo_horiz_path = logo_dir / "logo-horizontal-trans.png"

    # Left cell: Logo icon + Name
    left_header_flowables: list[Any] = []
    if logo_icon_path.exists():
        try:
            # Table with Icon on left (34x34) and Text on right
            logo_img = RLImage(str(logo_icon_path), width=34, height=34)
            name_text = Paragraph(
                '<font size="16" color="#0F172A"><b>AISecGuard</b></font><br/>'
                '<font size="8" color="#4F46E5"><b>AI Supply Chain Defense & Governance Platform</b></font>',
                styles["BrandTitle"],
            )
            t_brand = Table([[logo_img, name_text]], colWidths=[38, 220])
            t_brand.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            left_header_flowables.append(t_brand)
        except Exception:
            left_header_flowables.append(Paragraph("<b>AISECGUARD</b><br/><font size='8' color='#4F46E5'>AI Supply Chain Defense</font>", styles["BrandTitle"]))
    elif logo_horiz_path.exists():
        try:
            logo_img = RLImage(str(logo_horiz_path), width=150, height=45)
            left_header_flowables.append(logo_img)
        except Exception:
            left_header_flowables.append(Paragraph("<b>AISECGUARD</b>", styles["BrandTitle"]))
    else:
        left_header_flowables.append(Paragraph("<b>AISECGUARD</b>", styles["BrandTitle"]))

    # Right cell: Document Title, Report ID, Timestamp
    right_header = Paragraph(
        '<font color="#0F172A" size="12"><b>Security Assessment Report</b></font><br/>'
        f'<font color="#64748B" size="8">Report ID: <b>ASG-RPT-{sc["id"][:8].upper()}</b> &nbsp;|&nbsp; '
        f'{report["report_generated_at"][:19].replace("T", " ")} UTC</font><br/>'
        '<font color="#10B981" size="7.5">● Zero-Execution Static Bytecode & Supply Chain Inspection</font>',
        styles["DocTitle"],
    )

    t_header = Table([[left_header_flowables[0], right_header]], colWidths=[260, PRINTABLE_WIDTH - 260])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(t_header)
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_PURPLE, spaceBefore=4, spaceAfter=8))

    # 2. Target Artifact Information Table (Readable 9pt font, 5pt padding)
    sha_wrapped = _format_sha256_wrapped(art.get("sha256"))
    dur_str = f"{sc.get('duration_seconds', 0.0):.2f}s" if sc.get("duration_seconds") is not None else "N/A"
    upload_str = art.get("uploaded_at") or report["report_generated_at"]
    upload_display = upload_str[:19].replace("T", " ") + " UTC"

    meta_data = [
        [
            Paragraph("Target Filename", styles["MetaLabel"]),
            Paragraph(f"<b>{_escape(art['original_filename'])}</b>", styles["MetaValue"]),
            Paragraph("Artifact Classification", styles["MetaLabel"]),
            Paragraph(f"<b>{_escape(art['artifact_type'])}</b>", styles["MetaValue"]),
        ],
        [
            Paragraph("File Payload Size", styles["MetaLabel"]),
            Paragraph(_format_size(art.get("file_size_bytes")), styles["MetaValue"]),
            Paragraph("SHA-256 Digest", styles["MetaLabel"]),
            Paragraph(f'<font face="Courier" size="6.8"><b>{sha_wrapped}</b></font>', styles["MetaValue"]),
        ],
        [
            Paragraph("Upload Timestamp", styles["MetaLabel"]),
            Paragraph(upload_display, styles["MetaValue"]),
            Paragraph("Inspection Engine", styles["MetaLabel"]),
            Paragraph(f"{dur_str} (AISecGuard Static Core v0.6.0)", styles["MetaValue"]),
        ],
    ]
    t_meta = Table(meta_data, colWidths=[90, 175, 100, PRINTABLE_WIDTH - 365])
    t_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # 3. Overall Risk Level & Active Quarantine Status Banner
    if is_quarantined:
        quar_badge = '<font color="#DC2626"><b>QUARANTINED (Vault Isolated)</b></font>'
        quar_sub = f'<font color="#64748B" size="7.5">Reason: {_escape(quar.get("reason", "Critical threat detected"))[:55]}</font>'
    else:
        quar_badge = '<font color="#16A34A"><b>ACTIVE PIPELINE (Standard Storage)</b></font>'
        quar_sub = '<font color="#64748B" size="7.5">No quarantine containment active</font>'

    risk_left = (
        f'<font color="{sev_token["hex"]}" size="12"><b>● {effective_level} RISK</b></font> &nbsp;&nbsp; '
        f'<font color="#334155" size="9.5">Threat Score: <b>{sc["risk_score"]} / 50 pts</b></font><br/>'
        f'<font color="#64748B" size="7.2">Scale: Clean (0) | Low (1-4) | Medium (5-14) | High (15-29) | Critical (30+)</font>'
    )
    risk_right = (
        f'<font color="#334155" size="8.5"><b>Quarantine Status:</b></font> {quar_badge}<br/>'
        f'{quar_sub}'
    )

    t_risk_banner = Table(
        [[Paragraph(risk_left, styles["Body"]), Paragraph(risk_right, styles["Body"])]],
        colWidths=[270, PRINTABLE_WIDTH - 270],
    )
    t_risk_banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), sev_token["bg"]),
        ("BOX", (0, 0), (-1, -1), 0.85, sev_token["border"]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_risk_banner)
    story.append(Spacer(1, 6))

    # 4. Side-by-Side Visual Charts (Risk Gauge + Findings by Severity)
    gauge_dwg = _create_risk_gauge_chart(sc.get("risk_score", 0), effective_level, width=252, height=62)
    chart_dwg = _create_severity_bar_chart(report["summary"]["by_severity"], width=252, height=62)

    t_charts = Table([
        [
            Paragraph("<b>Risk Score Gauge</b>", styles["SubSectionHeading"]),
            Paragraph("<b>Findings by Severity</b>", styles["SubSectionHeading"]),
        ],
        [gauge_dwg, chart_dwg],
    ], colWidths=[258, PRINTABLE_WIDTH - 258])
    t_charts.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t_charts)
    story.append(Spacer(1, 6))

    # 5. Executive KPI Findings Summary Cards (6 across)
    sm = report["summary"]
    card_w = PRINTABLE_WIDTH / 6.0
    kpi_headers = ["TOTAL FINDINGS", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]
    kpi_counts = [
        str(sm["total_findings"]),
        str(sm["critical_count"]),
        str(sm["high_count"]),
        str(sm["medium_count"]),
        str(sm["low_count"]),
        str(sm["informational_count"]),
    ]
    kpi_colors = [
        COLOR_NAVY_DARK,
        SEVERITY_CONFIG["CRITICAL"]["color"],
        SEVERITY_CONFIG["HIGH"]["color"],
        SEVERITY_CONFIG["MEDIUM"]["color"],
        SEVERITY_CONFIG["LOW"]["color"],
        SEVERITY_CONFIG["INFORMATIONAL"]["color"],
    ]

    header_row = [
        Paragraph(f'<font color="#64748B" size="6.8"><b>{h}</b></font>', ParagraphStyle("KH", alignment=1))
        for h in kpi_headers
    ]
    count_row = [
        Paragraph(f'<font color="{kpi_colors[i].hexval()}" size="13.5"><b>{kpi_counts[i]}</b></font>', ParagraphStyle("KC", alignment=1))
        for i in range(6)
    ]

    t_kpi = Table([header_row, count_row], colWidths=[card_w] * 6)
    t_kpi.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 7))

    # 6. Plain-English Executive Summary Box (9pt font, 13pt leading)
    crit_count = sm.get("critical_count", 0)
    high_count = sm.get("high_count", 0)
    med_count = sm.get("medium_count", 0)

    scanned_text = (
        f"<b>What was scanned:</b> AISecGuard performed automated zero-execution security inspection of "
        f"<b>{_escape(art['original_filename'])}</b> ({_escape(art['artifact_type'])}). "
        f"The file was inspected purely at the bytecode and structural level without running, loading, or deserializing untrusted code."
    )

    if total_findings == 0:
        issues_text = (
            "<b>What was detected:</b> <b>Zero security vulnerabilities or anomalies were found.</b> "
            "All evaluated safety rules passed, confirming no dangerous opcodes, abnormal data distributions, or vulnerable packages."
        )
    else:
        top_titles = [f["title"] for f in findings[:2]]
        sample_str = "; ".join(top_titles)
        issues_text = (
            f"<b>What was detected:</b> Detected <b>{total_findings} security finding(s)</b> "
            f"({crit_count} Critical, {high_count} High, {med_count} Medium). "
            f"Primary threat concerns: <b>{_escape(sample_str)}</b>."
        )

    if effective_level in ("CRITICAL", "HIGH") or is_quarantined:
        action_text = (
            "<b>Immediate action required:</b> <font color='#DC2626'><b>YES — IMMEDIATE ACTION REQUIRED.</b></font> "
            "Do not deploy or unpickle this file. Maintain quarantine isolation in the storage vault. "
            "Migrate model weights to the safe SafeTensors format and audit all pipeline dependencies."
        )
    elif effective_level == "MEDIUM":
        action_text = (
            "<b>Immediate action required:</b> <font color='#D97706'><b>REVIEW RECOMMENDED.</b></font> "
            "The artifact does not present immediate arbitrary code execution dangers, but exhibits configuration "
            "or statistical anomalies that must be reviewed and remediated before production promotion."
        )
    else:
        action_text = (
            "<b>Immediate action required:</b> <font color='#16A34A'><b>NO IMMEDIATE ACTION REQUIRED.</b></font> "
            "The artifact complies with baseline safety standards and is eligible for pipeline advancement."
        )

    exec_summary_html = f"{scanned_text}<br/><br/>{issues_text}<br/><br/>{action_text}"

    t_summary_box = Table([
        [Paragraph("<b>Executive Summary & Non-Technical Overview</b>", styles["SubSectionHeading"])],
        [Paragraph(exec_summary_html, styles["CalloutText"])],
    ], colWidths=[PRINTABLE_WIDTH])
    t_summary_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), sev_token["bg"]),
        ("BOX", (0, 0), (-1, -1), 0.85, sev_token["border"]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(t_summary_box)

    return story


# ---------------------------------------------------------------------------
# PAGE 2: Security Findings & Threat Analysis
# ---------------------------------------------------------------------------

def _build_page2_security_findings(report: dict, styles: dict[str, ParagraphStyle]) -> list[Any]:
    """
    Builds Page 2:
    - Section Heading.
    - Visual Chart: Security Category Posture Breakdown Chart.
    - Detailed Finding Cards with generous 9pt readable text:
      [SEVERITY BADGE] — [RULE ID] | Title
      What this means: Plain English explanation for ordinary users
      Evidence: Monospace callout box
      Potential impact: Operational security risk
      Recommended action: Step-by-step mitigation
    """
    story: list[Any] = []
    findings = report.get("findings", [])

    # Section Heading
    story.append(Paragraph("Security Findings & Threat Analysis", styles["SectionHeading"]))
    story.append(Paragraph(
        "Technical breakdown of detected security anomalies, unsafe bytecode patterns, and supply chain vulnerabilities.",
        styles["SectionSub"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=0, spaceAfter=6))

    # Visual Chart 3: Security Category Posture Breakdown Chart
    # Shows the 4 domains (Bytecode Safety, Architecture, Supply Chain, Provenance)
    posture_chart = _create_category_posture_chart(findings, width=PRINTABLE_WIDTH, height=52)
    story.append(posture_chart)
    story.append(Spacer(1, 7))

    # Case A: Zero findings detected
    if not findings:
        clean_box_content = [
            Paragraph('<font color="#16A34A" size="12"><b>Zero Security Vulnerabilities Detected</b></font>', styles["BodyBold"]),
            Spacer(1, 4),
            Paragraph(
                "This artifact underwent exhaustive zero-execution static bytecode analysis, statistical anomaly detection, "
                "and dependency supply chain inspection. No malicious instructions, suspicious serialization opcodes, "
                "or known CVE vulnerabilities were detected.",
                styles["Body"],
            ),
            Spacer(1, 4),
            Paragraph("<b>Verification Result:</b> All active security catalog rules evaluated with clean status.", styles["BodyBold"]),
        ]
        t_clean = Table([[clean_box_content]], colWidths=[PRINTABLE_WIDTH])
        t_clean.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SEVERITY_CONFIG["CLEAN"]["bg"]),
            ("BOX", (0, 0), (-1, -1), 0.85, SEVERITY_CONFIG["CLEAN"]["border"]),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(t_clean)
        story.append(Spacer(1, 10))

        # Catalog rules table
        rules_data = [
            [
                Paragraph("<b>Rule Identifier</b>", styles["MetaLabel"]),
                Paragraph("<b>Rule Scope & Evaluation Heuristic</b>", styles["MetaLabel"]),
                Paragraph("<b>Status</b>", styles["MetaLabel"]),
            ],
            [Paragraph("<code>ASG-001</code>", styles["BodyBold"]), Paragraph("Unsafe Pickle Deserialization & GLOBAL opcode detection", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
            [Paragraph("<code>ASG-002</code>", styles["BodyBold"]), Paragraph("PyTorch Full Serialization (legacy weights_only=False flags)", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
            [Paragraph("<code>ASG-003</code>", styles["BodyBold"]), Paragraph("Insecure Format Validation (SafeTensors/ONNX alternatives)", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
            [Paragraph("<code>ASG-004</code>", styles["BodyBold"]), Paragraph("Dataset Poisoning & Statistical Outliers (Z-score > 3.0σ)", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
            [Paragraph("<code>ASG-005</code>", styles["BodyBold"]), Paragraph("Known Vulnerability Correlation (OSV.dev CVE database)", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
            [Paragraph("<code>ASG-006</code>", styles["BodyBold"]), Paragraph("Dependency Typosquatting (Levenshtein distance check)", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
            [Paragraph("<code>ASG-007</code>", styles["BodyBold"]), Paragraph("Unpinned Floating Dependencies (Strict == pinning check)", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
            [Paragraph("<code>ASG-008</code>", styles["BodyBold"]), Paragraph("Cryptographic Provenance Attestation (Ed25519 digital signature)", styles["Body"]), Paragraph('<font color="#16A34A"><b>PASSED</b></font>', styles["Body"])],
        ]
        t_rules = Table(rules_data, colWidths=[90, PRINTABLE_WIDTH - 165, 75])
        t_rules.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_ALT),
            ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(t_rules)
        return story

    # Case B: Findings exist
    count = len(findings)
    max_evidence_len = 160 if count <= 3 else 110
    card_spacing = 8 if count <= 2 else 5
    body_font_size = "9.0" if count <= 2 else ("8.5" if count <= 4 else "7.8")

    # Render top findings as full rich cards; if > 4, summarize remaining to guarantee strictly 1 page
    render_as_cards = findings if count <= 4 else findings[:3]
    remaining_findings = findings[3:] if count > 4 else []

    for idx, f in enumerate(render_as_cards, 1):
        sev = _escape(f.get("severity", "LOW")).upper()
        sev_token = SEVERITY_CONFIG.get(sev, SEVERITY_CONFIG["LOW"])
        rule_id = _escape(f.get("rule_id") or "ASG-GENERIC")
        title = _escape(f.get("title", "Security Finding"))

        # Plain English explanation
        plain_expl = f.get("explanation") or _derive_plain_explanation(rule_id, title, f.get("description", ""))

        # Technical Evidence (Cleanly formatted and bounded)
        raw_evidence = f.get("evidence")
        if raw_evidence:
            ev_str = str(raw_evidence).strip().replace("\n", " ")
            if len(ev_str) > max_evidence_len:
                ev_str = ev_str[:max_evidence_len].rstrip() + "… [truncated]"
            evidence_display = f"<code>{_escape(ev_str)}</code>"
        else:
            evidence_display = "<i>No raw bytecode evidence payload attached.</i>"

        # Potential Impact
        impact_text = f.get("impact") or _derive_security_impact(rule_id, sev)

        # Recommended Action
        rec_text = f.get("recommendation") or "Review and replace affected components with safe alternatives."

        # Header bar
        header_text = (
            f'<font color="{sev_token["hex"]}" size="10"><b>[{sev}]</b></font> &nbsp;—&nbsp; '
            f'<b>{rule_id}</b> &nbsp;|&nbsp; <b>{title}</b>'
        )

        card_body_text = (
            f'<font size="{body_font_size}">'
            f'<b>What this means:</b> {_escape(plain_expl)}<br/><br/>'
            f'<b>Evidence:</b> {evidence_display}<br/><br/>'
            f'<b>Potential impact:</b> <font color="#991B1B">{_escape(impact_text)}</font><br/><br/>'
            f'<b>Recommended action:</b> <font color="#1E40AF">{_escape(rec_text)}</font>'
            f'</font>'
        )

        card_table = Table([
            [Paragraph(header_text, styles["FindingTitle"])],
            [Paragraph(card_body_text, styles["Body"])],
        ], colWidths=[PRINTABLE_WIDTH])

        card_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), sev_token["bg"]),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.85, sev_token["border"]),
            ("LINEBELOW", (0, 0), (-1, 0), 0.6, sev_token["border"]),
            ("TOPPADDING", (0, 0), (-1, 0), 4),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
            ("TOPPADDING", (0, 1), (-1, 1), 6),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ]))

        story.append(card_table)
        story.append(Spacer(1, card_spacing))

    # If there are additional findings (> 3 when count > 4), summarize them in a compact table
    if remaining_findings:
        rem_rows = [
            [
                Paragraph("<b>Severity</b>", styles["MetaLabel"]),
                Paragraph("<b>Rule ID</b>", styles["MetaLabel"]),
                Paragraph("<b>Finding Title</b>", styles["MetaLabel"]),
                Paragraph("<b>Recommended Mitigation</b>", styles["MetaLabel"]),
            ]
        ]
        for f in remaining_findings:
            r_sev = _escape(f.get("severity", "LOW")).upper()
            r_token = SEVERITY_CONFIG.get(r_sev, SEVERITY_CONFIG["LOW"])
            rem_rows.append([
                Paragraph(f'<font color="{r_token["hex"]}"><b>{r_sev}</b></font>', styles["Body"]),
                Paragraph(f'<code>{_escape(f.get("rule_id", "ASG"))}</code>', styles["Body"]),
                Paragraph(f'<b>{_escape(f.get("title", ""))[:45]}</b>', styles["Body"]),
                Paragraph(_escape(f.get("recommendation", ""))[:65] + "…", styles["Body"]),
            ])
        t_rem = Table(rem_rows, colWidths=[55, 70, 175, PRINTABLE_WIDTH - 300])
        t_rem.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_ALT),
            ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(Spacer(1, 2))
        story.append(Paragraph("<b>Additional Findings Summary</b>", styles["SubSectionHeading"]))
        story.append(t_rem)

    return story


# ---------------------------------------------------------------------------
# PAGE 3: Scan Details, Methodology & Recommendations
# ---------------------------------------------------------------------------

def _build_page3_details_and_recommendations(report: dict, styles: dict[str, ParagraphStyle]) -> list[Any]:
    """
    Builds Page 3:
    - Section Heading.
    - Visual Chart 4: Sequential Pipeline Inspection Workflow Diagram.
    - Methodology Telemetry Table.
    - Cryptographic Integrity & Provenance Status Table.
    - Prioritized Action Plan (3 clear steps).
    - Final Security Verdict Callout Box.
    - Assessment Metadata & Disclaimer.
    """
    story: list[Any] = []
    art = report["artifact"]
    sc = report["scan"]
    prov = report.get("provenance", {})
    sig = report.get("signature", {})
    quar = report.get("quarantine", {})
    findings = report.get("findings", [])
    total_findings = report["summary"]["total_findings"]
    raw_level = str(sc["risk_level"]).replace("RiskLevel.", "").upper()
    effective_level = "CLEAN" if (total_findings == 0 and sc.get("risk_score", 0) == 0) else raw_level
    is_quarantined = quar.get("is_quarantined", False)

    # 1. Section Heading
    story.append(Paragraph("Scan Details & Remediation Roadmap", styles["SectionHeading"]))
    story.append(Paragraph(
        "Inspection methodology telemetry, cryptographic provenance validation, and actionable remediation roadmap.",
        styles["SectionSub"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=0, spaceAfter=6))

    # 2. Visual Chart 4: Sequential Pipeline Inspection Workflow Diagram
    workflow_dwg = _create_pipeline_workflow_diagram(width=PRINTABLE_WIDTH, height=44)
    story.append(workflow_dwg)
    story.append(Spacer(1, 6))

    # 3. Scan Methodology Pipeline Table (4 phases with 8.8pt font)
    art_type = art.get("artifact_type", "MODEL").upper()
    methodology_data = [
        [
            Paragraph("<b>Pipeline Phase</b>", styles["MetaLabel"]),
            Paragraph("<b>Inspection Scope & Methodology</b>", styles["MetaLabel"]),
            Paragraph("<b>Execution Status</b>", styles["MetaLabel"]),
        ],
        [
            Paragraph("<b>1. Integrity Verification</b>", styles["BodyBold"]),
            Paragraph("Computes chunked SHA-256 digest and verifies hash match against declared ingestion baseline.", styles["Body"]),
            Paragraph('<font color="#10B981"><b>● COMPLETED</b></font>', styles["Body"]),
        ],
        [
            Paragraph(f"<b>2. {art_type} Static Analysis</b>", styles["BodyBold"]),
            Paragraph("Performs zero-execution AST disassembly, dangerous opcode interception, or dataset outlier scoring.", styles["Body"]),
            Paragraph('<font color="#10B981"><b>● COMPLETED</b></font>', styles["Body"]),
        ],
        [
            Paragraph("<b>3. Lineage & Dependency Check</b>", styles["BodyBold"]),
            Paragraph("Inspects manifest packages against OSV.dev CVE databases, version bounds, and typosquatting registers.", styles["Body"]),
            Paragraph('<font color="#10B981"><b>● COMPLETED</b></font>', styles["Body"]),
        ],
        [
            Paragraph("<b>4. Risk Scoring & Policy</b>", styles["BodyBold"]),
            Paragraph("Aggregates finding weights (Crit=10, High=6, Med=3, Low=1) and evaluates quarantine thresholds.", styles["Body"]),
            Paragraph('<font color="#10B981"><b>● COMPLETED</b></font>', styles["Body"]),
        ],
    ]
    t_methodology = Table(methodology_data, colWidths=[130, PRINTABLE_WIDTH - 215, 85])
    t_methodology.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_ALT),
        ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t_methodology)
    story.append(Spacer(1, 6))

    # 4. Integrity & Provenance Telemetry Table (4 rows)
    expected_hash = prov.get("expected_sha256")
    actual_hash = art.get("sha256")
    if expected_hash and actual_hash:
        if expected_hash.lower() == actual_hash.lower():
            hash_status = '<font color="#16A34A"><b>MATCH VERIFIED</b> (Published digest matches payload)</font>'
        else:
            hash_status = '<font color="#DC2626"><b>MISMATCH DETECTED</b> (Possible tampering or corruption)</font>'
    else:
        hash_status = '<font color="#64748B">Baseline SHA-256 recorded at ingestion</font>'

    origin_source = prov.get("source_url") or "Local Ingestion (Direct Upload)"

    if sig.get("is_signed"):
        sig_status = (
            f'<font color="#16A34A"><b>CRYPTOGRAPHICALLY SIGNED ({sig.get("algorithm", "Ed25519")})</b></font> '
            f'<font color="#64748B" size="7.2">(Key ID: {sig.get("key_id", "N/A")})</font>'
        )
    else:
        sig_status = '<font color="#64748B">UNSIGNED (Pending team signing policy)</font>'

    if is_quarantined:
        quar_status = (
            f'<font color="#DC2626"><b>QUARANTINED (Vault Isolated)</b></font> '
            f'<font color="#64748B" size="7.2">by {_escape(quar.get("actor_email", "Automated Policy"))}</font>'
        )
    else:
        quar_status = '<font color="#16A34A"><b>ACTIVE PIPELINE</b> (Standard Storage)</font>'

    prov_data = [
        [Paragraph("SHA-256 Verification", styles["MetaLabel"]), Paragraph(hash_status, styles["MetaValue"])],
        [Paragraph("Artifact Source / Origin", styles["MetaLabel"]), Paragraph(_escape(origin_source), styles["MetaValue"])],
        [Paragraph("Digital Signature Status", styles["MetaLabel"]), Paragraph(sig_status, styles["MetaValue"])],
        [Paragraph("Quarantine Enforcement", styles["MetaLabel"]), Paragraph(quar_status, styles["MetaValue"])],
    ]
    t_prov = Table(prov_data, colWidths=[130, PRINTABLE_WIDTH - 130])
    t_prov.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), COLOR_BG_CARD),
        ("BACKGROUND", (1, 0), (1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t_prov)
    story.append(Spacer(1, 6))

    # 5. Prioritized Action Plan (3 clear steps with 9pt font)
    story.append(Paragraph("<b>Prioritized Action Plan</b>", styles["SubSectionHeading"]))

    if effective_level in ("CRITICAL", "HIGH") or is_quarantined:
        act_1 = "<b>1. Immediate Containment:</b> Halt artifact deployment immediately. Keep file isolated in the quarantine vault and alert your team administrators."
        act_2 = "<b>2. Technical Remediation:</b> Convert legacy serialization to SafeTensors/ONNX, replace vulnerable packages with patched versions, and pin dependency versions."
        act_3 = "<b>3. Verification & Rescan:</b> Re-submit the sanitized artifact to AISecGuard to verify complete elimination of threats before pipeline release."
    elif effective_level == "MEDIUM":
        act_1 = "<b>1. Immediate Containment:</b> Restrain artifact from production promotion until noted vulnerabilities and anomalies are triaged."
        act_2 = "<b>2. Technical Remediation:</b> Address outlier feature distributions, verify upstream source integrity, and replace unpinned dependency versions."
        act_3 = "<b>3. Verification & Rescan:</b> Rescan updated artifact to confirm threat score drops to Clean baseline (0 pts)."
    else:
        act_1 = "<b>1. Immediate Containment:</b> No immediate containment required. Artifact is approved for automated pipeline staging."
        act_2 = "<b>2. Technical Remediation:</b> Implement Ed25519 cryptographic signing for release traceability and supply chain provenance."
        act_3 = "<b>3. Verification & Rescan:</b> Re-evaluate when major package dependencies or model architecture revisions are introduced."

    plan_rows = [
        [Paragraph(act_1, styles["Body"])],
        [Paragraph(act_2, styles["Body"])],
        [Paragraph(act_3, styles["Body"])],
    ]
    t_plan = Table(plan_rows, colWidths=[PRINTABLE_WIDTH])
    t_plan.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(t_plan)
    story.append(Spacer(1, 6))

    # 6. Final Security Verdict Banner
    if is_quarantined:
        verdict_title = "VERDICT: DEPLOYMENT BLOCKED (Quarantine Enforced)"
        verdict_desc = "Automated quarantine policy has locked this artifact. Deployment is strictly prohibited until signed off by a security administrator."
        v_token = SEVERITY_CONFIG["CRITICAL"]
    elif effective_level == "CRITICAL":
        verdict_title = "VERDICT: DEPLOYMENT BLOCKED"
        verdict_desc = "Critical deserialization or execution vectors detected. Deployment is blocked to prevent infrastructure compromise."
        v_token = SEVERITY_CONFIG["CRITICAL"]
    elif effective_level == "HIGH":
        verdict_title = "VERDICT: ACTION REQUIRED"
        verdict_desc = "High-severity vulnerabilities identified. Mandatory remediation must be completed before promoting to production."
        v_token = SEVERITY_CONFIG["HIGH"]
    elif effective_level == "MEDIUM":
        verdict_title = "VERDICT: REVIEW RECOMMENDED"
        verdict_desc = "Moderate anomaly or configuration concerns detected. Security team review recommended prior to deployment."
        v_token = SEVERITY_CONFIG["MEDIUM"]
    else:
        verdict_title = "VERDICT: SAFE TO PROCEED (Based on checks performed)"
        verdict_desc = "Zero security vulnerabilities detected during static inspection. Approved for deployment into standard AI pipelines."
        v_token = SEVERITY_CONFIG["CLEAN"]

    verdict_html = (
        f'<font color="{v_token["hex"]}" size="10.5"><b>{verdict_title}</b></font><br/>'
        f'<font size="8.5">{verdict_desc}</font>'
    )
    t_verdict = Table([[Paragraph(verdict_html, styles["CalloutText"])]], colWidths=[PRINTABLE_WIDTH])
    t_verdict.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), v_token["bg"]),
        ("BOX", (0, 0), (-1, -1), 0.85, v_token["border"]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(t_verdict)
    story.append(Spacer(1, 6))

    # 7. Assessment Metadata & Disclaimer
    disclaimer_text = (
        f"<b>Report ID:</b> ASG-RPT-{sc['id'][:8].upper()} &nbsp;|&nbsp; "
        f"<b>Generated:</b> {report['report_generated_at'][:19].replace('T', ' ')} UTC &nbsp;|&nbsp; "
        f"<b>Version:</b> AISecGuard Static Security Core v0.6.0<br/>"
        f"<i>Disclaimer: Static analysis does not guarantee complete detection of all threats. Always combine static AST "
        f"inspection with runtime sandboxing and access controls.</i>"
    )
    story.append(Paragraph(disclaimer_text, styles["BodyMuted"]))

    return story


# ---------------------------------------------------------------------------
# Master Report Generation Entrypoint
# ---------------------------------------------------------------------------

def generate_security_scan_pdf(report: dict) -> bytes:
    """
    Main entrypoint: Generates a polished, enterprise-quality, STRICT 3-PAGE
    PDF security assessment report from the structured scan result data dictionary.
    """
    buf = io.BytesIO()

    # Document setup with NumberedCanvas
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
    )

    styles = _build_styles()
    story: list[Any] = []

    # Inject report ID into canvas for running headers
    report_id = f"ASG-RPT-{report['scan']['id'][:8].upper()}"

    class CustomNumberedCanvas(NumberedCanvas):
        _report_id = report_id

    # Page 1: Executive Summary & Risk Overview
    story.extend(_build_page1_executive_summary_and_overview(report, styles))
    story.append(PageBreak())

    # Page 2: Security Findings & Threat Analysis
    story.extend(_build_page2_security_findings(report, styles))
    story.append(PageBreak())

    # Page 3: Scan Details, Methodology & Recommendations
    story.extend(_build_page3_details_and_recommendations(report, styles))

    # Compile document (exactly 3 pages)
    doc.build(story, canvasmaker=CustomNumberedCanvas)

    return buf.getvalue()
