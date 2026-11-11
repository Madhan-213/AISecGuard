# UI/UX Design Specification & Guidelines

**Project:** AISecGuard — Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Document Identifier:** ASG-UIUX-V1.0  
**Version:** 1.0.0  
**Status:** Approved / Implementation-Ready  
**Design Philosophy:** Modern Precision Cybersecurity (Glassmorphism, High Contrast, Explainable Telemetry)  
**Target Milestone:** Minimum Viable Product (MVP) & Research Phase 1  
**Author:** MCA 3rd Semester Project Team  

---

## 1. Executive Vision & Core Design Principles

### 1.1 Product UX Vision
AISecGuard is a mission-critical security interface designed for security analysts, MLOps engineers, and governance officers. The user experience balances deep technical diagnostic precision with effortless, rapid decision-making. The interface transforms complex machine learning artifact bytecode, statistical distributions, and multi-hop graph lineage into clear, actionable security insights.

### 1.2 Core Design Principles

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE UX DESIGN PRINCIPLES                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Clarity Over Cognitive Clutter : Progressive disclosure of details. │
│ 2. Explainable Threat Telemetry   : Every score shows its exact math.  │
│ 3. Immediate Actionability        : Every finding includes a fix.      │
│ 4. Zero-Friction Live Feedback    : Real-time SSE streaming updates.   │
│ 5. Precision Cybersecurity Craft   : High contrast, dark-mode first.    │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Clarity Over Cognitive Clutter:** Security analysts operate under high alert fatigue. AISecGuard uses progressive disclosure: high-level risk scores and color-coded statuses are visible immediately, while raw opcode dumps, statistical distribution curves, and CVE descriptors expand on demand.
2. **Explainable Threat Telemetry:** Threat scores are never opaque black boxes. Every 0–10 score is accompanied by an interactive point breakdown, explicit finding tallies, and human-readable explanations.
3. **Immediate Actionability:** Every detected vulnerability is paired with a concrete remediation directive (e.g., SafeTensors conversion script, pinned package version, or physical quarantine action).
4. **Zero-Friction Live Feedback:** Replaces static spinners and manual page refreshes with real-time Server-Sent Events (SSE) telemetry, showing live step-by-step progress through ingestion, opcode parsing, lineage evaluation, and scoring.
5. **Precision Cybersecurity Craft:** A modern, focused aesthetic featuring a deep slate color palette, subtle glassmorphic surfaces, crisp borders, and accessible high-contrast typography.

---

## 2. Design Tokens: Typography, Color System, Spacing & Radii

The design system is implemented using **Tailwind CSS v4** with CSS variables defined in `frontend/src/index.css`.

### 2.1 Typography System

| Role | Font Family | Size / Line Height | Tailwind Class | Usage |
|---|---|---|---|---|
| **Display / Hero** | `Inter`, sans-serif | 36px / 44px (SemiBold) | `text-4xl font-semibold` | Landing page titles, primary dashboard score gauge. |
| **Heading 1 (H1)** | `Inter`, sans-serif | 28px / 36px (SemiBold) | `text-2xl font-semibold` | Page titles (Dashboard, Scans, Quarantine). |
| **Heading 2 (H2)** | `Inter`, sans-serif | 20px / 28px (Medium) | `text-xl font-medium` | Section headers, card titles. |
| **Heading 3 (H3)** | `Inter`, sans-serif | 16px / 24px (Medium) | `text-base font-medium` | Finding item titles, table headers. |
| **Body (Default)** | `Inter`, sans-serif | 14px / 20px (Regular) | `text-sm font-normal` | Paragraph text, metadata values, form labels. |
| **Microcopy** | `Inter`, sans-serif | 12px / 16px (Regular) | `text-xs font-normal` | Timestamps, secondary hints, table footnotes. |
| **Code / Technical** | `JetBrains Mono`, monospace | 13px / 18px (Regular) | `font-mono text-xs` | Hashes (SHA-256), opcodes, file paths, CVE IDs. |

### 2.2 Color System (Dual Theme Support)

The application features full dual-theme support with dark mode as the default cybersecurity operations experience:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       SEMANTIC SEVERITY PALETTE                        │
├────────────────────────────────────────────────────────────────────────┤
│ • CRITICAL : #EF4444 (Red)    — RCE, Arbitrary code opcodes, backdoors │
│ • HIGH     : #F97316 (Orange) — Upstream risk (LIN-001), hash mismatch │
│ • MEDIUM   : #F59E0B (Amber)  — Missing values >20%, unpinned packages │
│ • LOW      : #10B981 (Emerald)— Clean baseline, broad range warnings   │
│ • INFO     : #3B82F6 (Blue)   — Metadata recorded, format safe         │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Color Variable Specifications:
| Token Name | Dark Mode Value (`[data-theme=dark]`) | Light Mode Value (`[data-theme=light]`) | Purpose |
|---|---|---|---|
| `--color-bg` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Primary canvas background. |
| `--color-bg-darker` | `#0B1120` (Slate 950) | `#EDF2F7` (Slate 100) | Sidebar and terminal background. |
| `--color-surface` | `#1E293B` (Slate 800) | `#FFFFFF` (White) | Card and modal surfaces. |
| `--color-surface-card` | `rgba(30, 41, 59, 0.7)` | `#FFFFFF` | Frosted glass cards (with `backdrop-blur`). |
| `--color-border` | `#334155` (Slate 700) | `#E2E8F0` (Slate 200) | Standard dividing borders. |
| `--color-border-subtle`| `rgba(51, 65, 85, 0.4)` | `#EDF2F7` | Inner cell separators. |
| `--color-border-highlight`| `#3B82F6` (Blue 500) | `#2563EB` (Blue 600) | Active focus rings, selected tabs. |
| `--color-text` | `#F8FAFC` (Slate 50) | `#0F172A` (Slate 900) | Primary body and heading text. |
| `--color-text-muted` | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | Subtext, labels, inactive tabs. |
| `--color-primary` | `#3B82F6` (Blue 500) | `#2563EB` (Blue 600) | Primary action buttons, active links. |
| `--color-danger` | `#EF4444` (Red 500) | `#DC2626` (Red 600) | Quarantine, destructive actions, critical. |
| `--color-warning` | `#F59E0B` (Amber 500) | `#D97706` (Amber 600) | Medium severity, review alerts. |
| `--color-success` | `#10B981` (Emerald 500) | `#059669` (Emerald 600) | Digital signatures, clean status. |

### 2.3 Spacing & Layout Grid
- **Baseline Scale:** 8-point spatial grid (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).
- **Container Bounds:**
  - Standard Views: `max-w-7xl` ($1280\text{px}$) centered with `px-4 sm:px-6 lg:px-8`.
  - Focused Intake / Form Views: `max-w-4xl` ($896\text{px}$) for upload and inspection.
  - Full-Width Canvas: `w-full` for interactive lineage DAG graph exploration.

### 2.4 Border Radii & Elevation
- **`rounded-md` ($6\text{px}$):** Badges, tag pills, inline code spans.
- **`rounded-lg` ($8\text{px}$):** Buttons, text input fields, select dropdowns.
- **`rounded-xl` ($12\text{px}$):** Dashboard cards, data tables, telemetry progress panels.
- **`rounded-2xl` ($16\text{px}$):** Dialog modals, hero console cards.
- **Shadows:** Subtle dark glow (`shadow-sm`, `shadow-lg`, `shadow-blue-500/10`).

---

## 3. Global Information Architecture & Navigation

The application uses an accessible **Persistent App Shell** layout (`Layout.jsx`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Logo • Mode Badge (Standalone/Enterprise) • Theme Toggle • User Profile      │
├─────────────────────┬──────────────────────────────────────────────────────────────────┤
│ SIDEBAR NAVIGATION  │ MAIN CONTENT VIEWPORT                                            │
│ • Dashboard         │ (Dynamic Route Content with Smooth Page Transitions)             │
│ • Upload Artifact   │                                                                  │
│ • Scan History      │                                                                  │
│ • Lineage Graph     │                                                                  │
│ • Quarantine Center │                                                                  │
│ • Settings & API Key│                                                                  │
│                     │                                                                  │
│ [Collapse Toggle]   │                                                                  │
├─────────────────────┴──────────────────────────────────────────────────────────────────┤
│ TOAST NOTIFICATION CONTAINER (Bottom-Right Floating Portal)                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Primary Navigation Items

| Navigation Item | Route | Lucide Icon | Description |
|---|---|---|---|
| **Dashboard** | `/dashboard` | `LayoutDashboard` | High-level threat posture, metrics, recent scans. |
| **Upload & Scan** | `/upload` | `UploadCloud` | Drag-and-drop artifact ingestion portal. |
| **Scan History** | `/scans` | `ShieldCheck` | Paginated, filterable scan inventory. |
| **Supply Chain** | `/supply-chain` | `GitFork` | Interactive multi-hop lineage DAG & compliance evidence. |
| **Quarantine** | `/quarantine` | `AlertOctagon` | Isolated artifacts, release approvals, audit chain. |
| **Settings** | `/settings` | `Settings` | Developer API keys, profile, system diagnostics. |

---

## 4. Comprehensive Screen Specifications

### 4.1 Screen 1: Public Landing Page (`/`)
* **Purpose:** Introduces the platform, showcases research capabilities, and provides a quick live demo scanner.
* **Layout Sections:**
  1. **Top Nav (`HomeNav.jsx`):** Brand logo, direct navigation links (Pipeline, Live Console, FAQ), and "Launch Dashboard" button.
  2. **Hero Section (`hero.png` & `HeroNetworkVisual.jsx`):** High-impact cyber-mesh network graphic with primary value proposition and "Start Free Inspection" CTA.
  3. **Live Sandbox Console (`HeroScanConsole.jsx`):** Interactive terminal widget allowing prospective users to test pre-loaded sample model files (`safe_model.safetensors` vs. `malicious_pickle.pkl`) without logging in.
  4. **4-Stage Pipeline Flow (`PipelineFlow.jsx`):** Visual interactive walkthrough of Ingestion $\rightarrow$ Static Disassembly $\rightarrow$ Lineage Risk $\rightarrow$ Quarantine.
  5. **Interactive Risk Calculator (`RiskCalculator.jsx`):** Interactive widget demonstrating how points map to the 0–10 risk engine.
  6. **Technical FAQ (`Faq.jsx`):** Answers core architectural questions regarding zero-code-execution safety and format support.

### 4.2 Screen 2: Security Dashboard (`/dashboard`)
* **Purpose:** The centralized Security Operations Center (SOC) home view.
* **Key Components:**
  - **4 Top KPI Cards:**
    - *Total Artifacts Scanned* (with 24h delta indicator).
    - *Critical Threats Intercepted* (highlighted in red glow).
    - *Quarantined Artifacts* (active isolated files).
    - *Signed Verified Models* (clean assets with Ed25519 signatures).
  - **Risk Distribution Chart:** Visual breakdown of scans across `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW`.
  - **14-Day Velocity Trendline:** Temporal line chart displaying daily scan volume.
  - **Recent Activity Table:** Top 10 most recent scans displaying filename, type, computed hash, threat badge, and direct link to details.

### 4.3 Screen 3: Artifact Upload & Intake Hub (`/upload`)
* **Purpose:** Frictionless ingestion of AI models, datasets, and manifests.
* **Key Components:**
  - **Type Selector Tabs:** Model (`.pkl`, `.pt`, `.safetensors`, `.onnx`), Dataset (`.csv`, `.parquet`, `.json`), Dependency (`requirements.txt`, `pyproject.toml`).
  - **Drag-and-Drop Zone:** Large dashed border dropzone with visual hover states (`border-blue-500 bg-blue-500/5`), displaying accepted file extensions and 100 MB limit.
  - **Optional Baseline Inputs:**
    - `Expected SHA-256`: Hexadecimal input field with live 64-character length counter.
    - `Source URL`: Text input for upstream repository provenance (e.g., Hugging Face model URL).
  - **Instant Client Validation:** Immediate feedback if file extension is unsupported or size exceeds 100 MB.
  - **Action Button:** "Upload & Analyze" button with spinner state during upload.

### 4.4 Screen 4: Real-Time Scan Telemetry (`/scans/:scanId/progress`)
* **Purpose:** Transparent, real-time visualization of scanning pipeline stages via Server-Sent Events (SSE).
* **Key Components:**
  - **Global Progress Bar:** Smooth animated bar showing current percentage ($20\% \rightarrow 40\% \rightarrow 70\% \rightarrow 90\% \rightarrow 100\%$).
  - **Step-by-Step State Radar:** 5 visual nodes with animated pulse halos indicating the active state:
    1. `QUEUED` (20%) — Enqueued and verified in storage.
    2. `PROVENANCE_CHECK` (40%) — SHA-256 fingerprint verified against baseline.
    3. `SCANNER_RUNNING` (70%) — Static opcode disassembly / z-score calculation active.
    4. `RISK_CALC` (90%) — Aggregating threat points and lineage risks.
    5. `COMPLETED` (100%) — Persistence finalized; auto-redirecting to scan details.
  - **Live Terminal Log:** Terminal-style black box streaming timestamped execution logs.

### 4.5 Screen 5: Scan Details & Findings Inspection (`/scans/:scanId`)
* **Purpose:** Deep diagnostic breakdown of vulnerabilities with actionable remediation guidance.
* **Key Components:**
  - **Executive Summary Header:**
    - Circular SVG Gauge displaying composite score ($0 - 10$).
    - Color-coded severity badge (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
    - Artifact metadata strip: Filename, UUID, SHA-256 (with copy-to-clipboard button), File Size, Scan Duration.
  - **Action Toolbar:**
    - "Download PDF Report" (calls ReportLab generator).
    - "Export JSON v2.0" (machine-actionable findings).
    - "Sign Model" (Ed25519 digital signature; enabled only for clean models).
    - "Quarantine Artifact" (moves hazardous file to restricted storage).
  - **Findings Accordion List:**
    - Collapsible card for every finding showing:
      - Header: Rule ID (e.g., `PICKLE-001`), Severity Badge, Finding Type, Finding Title.
      - Body: Detailed description, exact byte offset / line number, offending symbol (e.g., `os.system`).
      - Remediation Box: Dark code block containing prescriptive Python fix or safe conversion script.

### 4.6 Screen 6: Quarantine Containment Center (`/quarantine`)
* **Purpose:** Management of physically isolated artifacts and review of tamper-evident audit logs.
* **Key Components:**
  - **Quarantine Inventory Table:** Lists all artifacts currently in `/uploads/quarantine/` with red containment icons, quarantine date, isolating user, and reason.
  - **Release Action Modal:** Clicking "Release" opens a strict confirmation dialog requiring:
    - Text justification narrative ($\ge 10$ characters).
    - Checkbox acknowledging operational risk.
    - Administrative approval dispatch.
  - **Audit Hash Chain Verifier Panel:**
    - Visual badge showing status of `/api/v1/audit/verify` (`"Cryptographic Chain: VERIFIED INTACT"` in green, or `"CORRUPTED"` in red).
    - Chronological list of events with block hashes ($H_n$).

### 4.7 Screen 7: Supply Chain & Lineage Hub (`/supply-chain`)
* **Purpose:** Interactive exploration of multi-hop supply chain relations and compliance evidence.
* **Key Components:**
  - **Interactive Lineage Canvas (`LineageGraph.jsx`):**
    - Renders a Directed Acyclic Graph (DAG) using SVG/Canvas with zoom and pan controls.
    - Color-coded nodes: Datasets (Teal), Models (Blue), Dependencies (Violet).
    - Cascading Contamination Glow: If an upstream node is quarantined, downstream nodes display an orange warning halo (`LIN-001`).
  - **Edge Connection Modal:** Form to link parent artifact to child with relationship type (`TRAINED_ON`, `FINE_TUNED_FROM`, `DERIVED_FROM`, `DEPENDS_ON`).
  - **Compliance & BOM Tabs:**
    - *EU AI Act Tab:* Table displaying Articles 10 through 15 with status tags (`MET`, `PARTIAL`, `GAP`).
    - *CycloneDX 1.6 ML-BOM Tab:* Syntax-highlighted JSON viewer with copy and download buttons.

### 4.8 Screen 8: Settings & Developer API Keys (`/settings`)
* **Purpose:** Configuration, profile management, and headless CI/CD credential generation.
* **Key Components:**
  - **Developer API Keys Section:**
    - "Generate New Key" modal with name input.
    - **Single-View Secret Dialog:** Displays the generated `asg_<32_chars>` key in a masked input with a copy button and a prominent warning: *"This secret will never be shown again. Copy it now."*
    - Active Keys Table: Displays Key Name, Key Prefix (`asg_1234...`), Creation Date, Last Used Date, and a "Revoke" button.
  - **System Diagnostics Panel:** Displays active backend version, upload limit (100 MB), Ed25519 signing key status, and OSV lookup status.

---

## 5. Primary User Flows

### Flow 1: Ingest, Scan & Inspect Model Checkpoint
```
[User on /upload] 
   ──> Drags & drops 'model.pkl' 
   ──> Clicks "Upload & Analyze"
   ──> Backend creates UUID & computes SHA-256
   ──> Auto-redirects to /scans/:id/progress
   ──> SSE connects & streams live stages (20% -> 100%)
   ──> Auto-redirects to /scans/:id
   ──> User reviews findings, severity gauge, and downloads PDF report.
```

### Flow 2: Automated Quarantine & Containment
```
[Scan Execution]
   ──> Scanner detects Critical 'os.system' opcode
   ──> Risk Engine assigns Score 10 (CRITICAL)
   ──> System triggers automated physical quarantine
   ──> File moved from uploads/ to uploads/quarantine/
   ──> AuditEvent logged in cryptographic hash chain
   ──> UI flags artifact as QUARANTINED in red banner
   ──> Public download endpoints return HTTP 403 Forbidden.
```

### Flow 3: Lineage Tracking & Cascading Contamination
```
[User on /supply-chain]
   ──> Links 'dataset_raw.csv' to 'model_v1.pkl' (TRAINED_ON)
   ──> User quarantines 'dataset_raw.csv' due to poisoning
   ──> Scan Engine re-evaluates 'model_v1.pkl'
   ──> Rule LIN-001 fires on 'model_v1.pkl' (HIGH Severity)
   ──> Downstream model displays "Contaminated by Upstream Parent"
   ──> Digital signing is automatically disabled on child model.
```

---

## 6. Component Library & UI Patterns

### 6.1 Buttons
- **Primary Action:** Solid background (`bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition`).
- **Secondary / Ghost:** Subtle outline (`border border-slate-700 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-lg transition`).
- **Destructive / Danger:** Red background (`bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg transition`).
- **Success / Sign:** Emerald background (`bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition`).
- **Disabled State:** Reduced opacity (`opacity-50 cursor-not-allowed pointer-events-none`).

### 6.2 Badges & Severity Indicators
All severity badges use the `tokens.js` semantic tokens:
```jsx
// Example Severity Badge Component
function SeverityBadge({ severity }) {
  const styles = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
    HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
    MEDIUM:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
    LOW:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    INFO:     'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[severity]}`}>
      {severity}
    </span>
  );
}
```

### 6.3 Modals & Dialogs
- **Backdrop:** Semi-transparent frosted backdrop (`fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center`).
- **Card:** `bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl`.
- **Keyboard Interaction:** Closes on `Escape` key press; traps focus within dialog; restores focus to trigger upon close.

---

## 7. Form Design & Validation Patterns

1. **Floating / Top Labels:** Labels are positioned cleanly above inputs with clear microcopy hints.
2. **Real-Time Input Validation:**
   - *Expected SHA-256:* Validates against `^[0-9a-f]{64}$`. Displays a green checkmark when exactly 64 characters are typed; displays yellow counter while typing.
   - *Quarantine Reason:* Requires $\ge 10$ characters; displays live character counter (`8 / 10 characters`).
3. **Error Presentation:** Inline validation errors appear directly below the offending input with red text and an `AlertCircle` icon. Form submission is disabled until all constraints pass.
4. **Pending Submission Feedback:** On submit, the button shows an animated spinner (`animate-spin`) and text shifts to "Processing..." to prevent accidental double-submission.

---

## 8. State Handling: Loading, Error & Empty States

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPREHENSIVE UI STATES                         │
├────────────────────────────────────────────────────────────────────────┤
│ • Loading State : Pulse skeleton placeholders matching exact layout.   │
│ • Error State   : Non-blocking toast notifications + Error Boundary.   │
│ • Empty State   : Welcoming illustration + clear Call-To-Action (CTA). │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Loading States
- **Card / Table Skeletons:** Animated pulse blocks (`animate-pulse bg-slate-800/60 rounded-md`) mirror the dimensions of data cards and table rows before API responses resolve.
- **Telemetry Progress:** Indeterminate spinner during upload, followed by deterministic percentage bar during SSE streaming.

### 8.2 Error States
- **Non-Fatal Errors (API Validation):** Dispatches floating toast notification (`ToastContext.jsx`) with error description and auto-dismiss timer (5 seconds).
- **Fatal Crashes:** Trapped by `ErrorBoundary.jsx`, displaying an accessible fallback screen with a "Reload Page" button, preventing complete application freeze.

### 8.3 Empty States
- When a table or list has zero items (e.g., no scans performed or quarantine empty):
  - Renders a centered icon (`FolderOpen` or `ShieldCheck`).
  - Clear heading: *"No scans found"*.
  - Encouraging subtext: *"Upload your first model or dataset to run an automated security assessment."*
  - Primary CTA button: *"Upload Artifact"*.

---

## 9. Responsive Behavior & Breakpoints

The UI adheres to standard Tailwind breakpoints, providing seamless adaptation across devices:

| Breakpoint | Width | Navigation Adaptation | Content Layout Adaptation |
|---|---|---|---|
| **Mobile (`< sm`)** | $< 640\text{px}$ | Sidebar collapses into off-canvas slide-out hamburger menu. | 1-column layout; metrics stack vertically; tables horizontally scroll. |
| **Tablet (`sm - md`)**| $640\text{px} - 768\text{px}$ | Icon-only rail navigation sidebar. | 2-column KPI grid; tables switch to compact card cards. |
| **Laptop (`md - lg`)**| $768\text{px} - 1024\text{px}$ | Expandable sidebar with tooltips. | 2-column KPI grid; split-pane findings view. |
| **Desktop (`> lg`)** | $\ge 1024\text{px}$ | Full expanded persistent sidebar navigation. | 4-column KPI grid; full side-by-side findings and remediation panels. |

---

## 10. Accessibility (WCAG 2.1 AA Compliance)

1. **Color Contrast:** All body text meets or exceeds the **$4.5:1$** contrast ratio against the slate background. Headings meet the **$3:1$** minimum.
2. **Non-Color Dependence:** Threat levels never rely solely on color. Badges pair color with explicit text labels (`CRITICAL`, `HIGH`, `MEDIUM`) and unique semantic icons (Alert Octagon, Alert Triangle, Check Circle).
3. **Keyboard Navigability:** All interactive controls (buttons, links, form inputs, tabs) feature clear focus rings (`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none`). Logical `Tab` and `Shift+Tab` traversal is enforced.
4. **Screen Reader Semantics:**
   - ARIA roles are applied across dynamic sections (`role="status"` on toasts, `aria-live="polite"` on SSE telemetry updates).
   - Icon-only buttons contain descriptive `aria-label` attributes (e.g., `aria-label="Copy SHA-256 to clipboard"`).

---

*Document maintained under the AISecGuard Framework Project Repository.*

