/**
 * AISecGuard — Upload & Scan Page
 * Redesigned to closely follow the premium cybersecurity UI reference.
 * Features:
 * - 3-step progress bar (Upload Files -> Analyze -> View Results)
 * - Large drag-and-drop zone with Browse Files CTA & format pills
 * - "What will be checked?" compact security checks card
 * - Live "Recent Scans" table with real backend data
 * - Full preservation of file-size validation, lineage linking, provenance, and scanning logic.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  Folder,
  Layers,
  Database,
  Code,
  Archive,
  ShieldCheck,
  History,
  Eye,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  Trash2,
  Fingerprint,
  ChevronDown,
  X,
  ArrowRight,
  GitBranch,
  Link2,
  FileText,
} from 'lucide-react';
import { apiErrorMessage, artifactsApi, scansApi, supplyChainApi, systemApi } from '../api/client';
import { deviceCache } from '../utils/deviceCache';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../hooks/useTheme';

const FALLBACK_INFO = {
  max_upload_mb: 100,
  scanners: [
    { artifact_type: 'MODEL', extensions: ['.pkl', '.joblib', '.h5', '.pt', '.pth', '.onnx', '.bin', '.safetensors', '.zip'] },
    { artifact_type: 'DATASET', extensions: ['.csv', '.json', '.parquet', '.jsonl'] },
    { artifact_type: 'DEPENDENCY', extensions: ['.txt', '.toml'] },
  ],
};

const RELATION_FOR = {
  MODEL: { DATASET: 'TRAINED_ON', MODEL: 'FINE_TUNED_FROM', DEPENDENCY: 'DEPENDS_ON' },
  DATASET: { DATASET: 'DERIVED_FROM' },
};
const RELATION_TEXT = {
  TRAINED_ON: 'trained on',
  FINE_TUNED_FROM: 'fine-tuned from',
  DEPENDS_ON: 'depends on',
  DERIVED_FROM: 'derived from',
};

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getRiskBadge(riskLevel) {
  const level = (riskLevel || 'UNKNOWN').toUpperCase();
  const styles = {
    CRITICAL: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.35)', label: 'Critical' },
    HIGH:     { color: '#f97316', bg: 'rgba(249, 115, 22, 0.16)', border: 'rgba(249, 115, 22, 0.35)', label: 'High' },
    MEDIUM:   { color: '#eab308', bg: 'rgba(234, 179, 8, 0.16)', border: 'rgba(234, 179, 8, 0.35)', label: 'Medium' },
    LOW:      { color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.35)', label: 'Low' },
    CLEAN:    { color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.35)', label: 'Clean' },
    UNKNOWN:  { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)', label: 'Unknown' },
  };
  return styles[level] || styles.UNKNOWN;
}

function getTypeBadge(artifactType) {
  const type = (artifactType || '').toUpperCase();
  if (type.includes('MODEL')) {
    return { label: 'Model', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' };
  }
  if (type.includes('DATASET')) {
    return { label: 'Dataset', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
  }
  if (type.includes('DEP')) {
    return { label: 'Dependency', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
  }
  return { label: artifactType || 'Artifact', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' };
}

let nextId = 0;

export default function UploadPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [info, setInfo] = useState(FALLBACK_INFO);
  const [items, setItems] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [recentScans, setRecentScans] = useState(() => deviceCache.getScans().slice(0, 5));
  const [loadingScans, setLoadingScans] = useState(false);

  // Provenance & lineage state
  const [sourceUrl, setSourceUrl] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  const [parentId, setParentId] = useState('');
  const [note, setNote] = useState('');
  const [showProvenance, setShowProvenance] = useState(false);
  const [running, setRunning] = useState(false);

  // Fetch system config, artifacts, and recent scans
  const loadData = useCallback(() => {
    systemApi.info().then((r) => setInfo(r.data)).catch(() => {});
    artifactsApi.list({ limit: 200 }).then((r) => setArtifacts(r.data.artifacts || [])).catch(() => {});

    setLoadingScans(true);
    scansApi
      .list({ limit: 5 })
      .then((r) => {
        if (r?.data?.scans) {
          r.data.scans.forEach((s) => deviceCache.saveScan(s));
          setRecentScans(r.data.scans.slice(0, 5));
        }
      })
      .catch(() => {
        setRecentScans(deviceCache.getScans().slice(0, 5));
      })
      .finally(() => setLoadingScans(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extension to Type map
  const extToType = useMemo(() => {
    const map = {};
    info.scanners.forEach((s) => {
      s.extensions.forEach((e) => {
        map[e.toLowerCase()] = s.artifact_type;
      });
    });
    return map;
  }, [info]);

  // Dropzone handler
  const onDrop = useCallback(
    (files) => {
      const maxBytes = info.max_upload_mb * 1024 * 1024;
      setItems((prev) => [
        ...prev,
        ...files.map((file) => {
          const type = extToType[extOf(file.name)];
          let error = null;
          if (!type) error = `Unsupported file type ${extOf(file.name) || '(no extension)'}.`;
          else if (file.size === 0) error = 'File is empty.';
          else if (file.size > maxBytes) error = `Exceeds the ${info.max_upload_mb} MB limit.`;
          if (error) {
            toast.warning(`${file.name}: ${error}`);
          }
          return { id: ++nextId, file, type, status: error ? 'invalid' : 'queued', step: -1, error, scan: null };
        }),
      ]);
    },
    [extToType, info.max_upload_mb, toast]
  );

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    multiple: true,
    disabled: running,
    noClick: false,
  });

  const update = (id, patch) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const queued = items.filter((it) => it.status === 'queued');
  const done = items.filter((it) => it.status === 'done');
  const parent = artifacts.find((a) => a.id === parentId);
  const relationFor = (type) => (parent ? RELATION_FOR[type]?.[parent.artifact_type] : null);
  const hashValid = !expectedHash || /^[0-9a-fA-F]{64}$/.test(expectedHash.trim());
  const singleFile = queued.length === 1;

  // Active step in stepper
  const currentStep = running ? 2 : done.length > 0 && queued.length === 0 ? 3 : 1;

  // Execution workflow
  const runAll = async () => {
    setRunning(true);
    for (const item of queued) {
      try {
        update(item.id, { status: 'running', step: 0, error: null });
        const form = new FormData();
        form.append('file', item.file);
        if (sourceUrl.trim()) form.append('source_url', sourceUrl.trim());
        if (singleFile && expectedHash.trim()) form.append('expected_sha256', expectedHash.trim());
        const uploaded = (await artifactsApi.upload(form)).data;

        update(item.id, { step: 1, artifactId: uploaded.id });
        const relation = relationFor(item.type);
        let linkNote = null;
        if (relation) {
          try {
            await supplyChainApi.link(parent.id, uploaded.id, relation, note);
            linkNote = `${RELATION_TEXT[relation]} ${parent.original_filename}`;
          } catch (e) {
            linkNote = `Lineage not recorded: ${apiErrorMessage(e)}`;
          }
        }

        update(item.id, { step: 2, linkNote });
        const scan = (await scansApi.create(uploaded.id)).data;
        update(item.id, { status: 'done', step: 3, scan });

        // Save scan to device cache & refresh table
        deviceCache.saveScan(scan);

        // For single-file upload, navigate to live scan progress page
        if (singleFile) {
          navigate(`/scans/${scan.id}/progress`);
          return;
        }
      } catch (e) {
        const errMsg = apiErrorMessage(e, 'Upload or scan failed.');
        update(item.id, { status: 'failed', error: errMsg });
        toast.error(errMsg);
      }
    }
    setRunning(false);
    loadData();
  };

  return (
    <div className="fade-in upload-page-container">
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Header Icon squircle */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              boxShadow: '0 8px 20px -4px rgba(147, 51, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a855f7',
              flexShrink: 0,
            }}
          >
            <UploadCloud size={26} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--color-text)',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              Upload &amp; Scan
            </h1>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-text-muted)',
                margin: '0.35rem 0 0',
              }}
            >
              Upload AI models, datasets, or dependency files to detect threats and supply chain risks.
            </p>
          </div>
        </div>

        {/* Right side AI Security Shield Badge */}
        <div
          className="desktop-only"
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 70%)',
              filter: 'blur(10px)',
            }}
          />
          <img
            src="/logos/logo-shield.png"
            alt="AI Security Shield"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'relative',
              filter: 'drop-shadow(0 0 12px rgba(147, 51, 234, 0.5))',
            }}
          />
        </div>
      </div>

      {/* ── 3-Step Horizontal Stepper ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          marginBottom: '2rem',
          maxWidth: '780px',
          margin: '0 auto 2.25rem',
        }}
      >
        {/* Step 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: currentStep >= 1 ? '#8b5cf6' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: currentStep >= 1 ? '#ffffff' : 'var(--color-text-muted)',
              border: currentStep >= 1 ? '1px solid #a855f7' : '1px solid var(--color-border)',
              boxShadow: currentStep === 1 ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            {currentStep > 1 ? <CheckCircle2 size={15} /> : '1'}
          </div>
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: currentStep === 1 ? 700 : 500,
              color: currentStep >= 1 ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            Upload Files
          </span>
        </div>

        {/* Connector line 1 */}
        <div
          style={{
            flex: 1,
            height: 2,
            background: currentStep >= 2 ? '#8b5cf6' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
            minWidth: 40,
            transition: 'background 0.3s ease',
          }}
        />

        {/* Step 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: currentStep >= 2 ? '#8b5cf6' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: currentStep >= 2 ? '#ffffff' : 'var(--color-text-muted)',
              border: currentStep >= 2 ? '1px solid #a855f7' : '1px solid var(--color-border)',
              boxShadow: currentStep === 2 ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            {currentStep > 2 ? <CheckCircle2 size={15} /> : '2'}
          </div>
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: currentStep === 2 ? 700 : 500,
              color: currentStep >= 2 ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            Analyze
          </span>
        </div>

        {/* Connector line 2 */}
        <div
          style={{
            flex: 1,
            height: 2,
            background: currentStep >= 3 ? '#8b5cf6' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
            minWidth: 40,
            transition: 'background 0.3s ease',
          }}
        />

        {/* Step 3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: currentStep >= 3 ? '#10b981' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: currentStep >= 3 ? '#ffffff' : 'var(--color-text-muted)',
              border: currentStep >= 3 ? '1px solid #10b981' : '1px solid var(--color-border)',
              boxShadow: currentStep === 3 ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            3
          </div>
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: currentStep === 3 ? 700 : 500,
              color: currentStep >= 3 ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            View Results
          </span>
        </div>
      </div>

      {/* ── Main Upload & Info Grid ── */}
      <div className="upload-main-grid">
        {/* Left: Drag & Drop Zone + Queued items */}
        <div>
          <div
            {...getRootProps()}
            style={{
              position: 'relative',
              borderRadius: '20px',
              border: isDragActive
                ? '2px dashed #a855f7'
                : isDark
                ? '2px dashed rgba(168, 85, 247, 0.45)'
                : '2px dashed rgba(147, 51, 234, 0.35)',
              background: isDark
                ? 'radial-gradient(ellipse at 50% 60%, rgba(124, 58, 237, 0.16) 0%, rgba(15, 23, 42, 0.7) 70%)'
                : 'radial-gradient(ellipse at 50% 60%, rgba(243, 232, 255, 0.8) 0%, rgba(255, 255, 255, 0.95) 70%)',
              padding: '3rem 2rem 2.25rem',
              textAlign: 'center',
              cursor: running ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: isDragActive
                ? '0 0 35px rgba(168, 85, 247, 0.3)'
                : isDark
                ? '0 12px 32px -8px rgba(0, 0, 0, 0.5)'
                : '0 8px 24px -4px rgba(147, 51, 234, 0.08)',
              overflow: 'hidden',
            }}
          >
            <input {...getInputProps()} />

            {/* Glowing Cloud Icon */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                boxShadow: '0 0 25px rgba(168, 85, 247, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                color: '#c084fc',
              }}
            >
              <UploadCloud size={34} />
            </div>

            {/* Title & Description */}
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-text)',
                margin: '0 0 0.4rem',
                letterSpacing: '-0.01em',
              }}
            >
              {isDragActive ? 'Drop your artifacts here' : 'Drag & drop files here'}
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-text-muted)',
                margin: '0 0 1.5rem',
              }}
            >
              or click to browse from your device
            </p>

            {/* Browse Files CTA button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              disabled={running}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.65rem 1.6rem',
                borderRadius: 999,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                boxShadow: '0 8px 20px -4px rgba(124, 58, 237, 0.5)',
                border: 'none',
                cursor: running ? 'not-allowed' : 'pointer',
                marginBottom: '1.75rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!running) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                if (!running) e.currentTarget.style.transform = 'none';
              }}
            >
              <Folder size={16} />
              <span>Browse Files</span>
            </button>

            {/* Format pills row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                marginBottom: '1.25rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 999,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: isDark ? '#cbd5e1' : '#334155',
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <Layers size={13} style={{ color: '#c084fc' }} />
                <span>Model (.pt, .pkl)</span>
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 999,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: isDark ? '#cbd5e1' : '#334155',
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <Database size={13} style={{ color: '#38bdf8' }} />
                <span>Dataset (.csv, .json)</span>
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 999,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: isDark ? '#cbd5e1' : '#334155',
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <Code size={13} style={{ color: '#fb923c' }} />
                <span>Dependency (requirements.txt)</span>
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 999,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: isDark ? '#cbd5e1' : '#334155',
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <Archive size={13} style={{ color: '#34d399' }} />
                <span>Archive (.zip)</span>
              </span>
            </div>

            {/* Max file size and notice */}
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              ⓘ Max file size: {info.max_upload_mb} MB | Multiple files allowed
            </div>
          </div>

          {/* ── Queued Files List & Scan Action ── */}
          {items.length > 0 && (
            <div
              style={{
                marginTop: '1.25rem',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    Selected Artifacts ({items.length})
                  </h4>
                  <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                    {queued.length} ready to scan · {done.length} completed
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!running && items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setItems([])}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                    >
                      <Trash2 size={14} />
                      <span>Clear</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={runAll}
                    disabled={running || !queued.length || !hashValid}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 1.1rem',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                      border: 'none',
                      cursor: running || !queued.length ? 'not-allowed' : 'pointer',
                      opacity: running || !queued.length ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                    }}
                  >
                    {running ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
                    <span>{running ? 'Scanning…' : `Start Scan (${queued.length})`}</span>
                  </button>
                </div>
              </div>

              {/* Items queue */}
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {items.map((it) => {
                  const typeBadge = getTypeBadge(it.type);
                  return (
                    <div
                      key={it.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid var(--color-border)',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <FileText size={18} style={{ color: typeBadge.color, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.86rem',
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {it.file.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                            {formatSize(it.file.size)}
                            {it.linkNote && ` · ${it.linkNote}`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: 6,
                            color: typeBadge.color,
                            background: typeBadge.bg,
                            border: `1px solid ${typeBadge.border}`,
                          }}
                        >
                          {typeBadge.label}
                        </span>

                        {it.status === 'done' && it.scan && (
                          <button
                            type="button"
                            onClick={() => navigate(`/scans/${it.scan.id}`)}
                            className="btn btn-ghost"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.76rem' }}
                          >
                            <span>Report</span>
                            <ArrowRight size={12} />
                          </button>
                        )}

                        {it.status === 'running' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#8b5cf6' }}>
                            <Loader2 size={13} className="spin" /> Scanning…
                          </span>
                        )}

                        {(it.status === 'queued' || it.status === 'invalid' || it.status === 'failed') && !running && (
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Provenance Toggle Drawer */}
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowProvenance((v) => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Fingerprint size={14} style={{ color: '#8b5cf6' }} />
                    <span>Optional: Provenance &amp; Lineage Metadata</span>
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: showProvenance ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>

                {showProvenance && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '0.75rem',
                      marginTop: '0.85rem',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>
                        Source URL (Hugging Face / Git)
                      </label>
                      <input
                        className="input"
                        placeholder="https://huggingface.co/org/model"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        disabled={running}
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>
                        Expected SHA-256 Digest
                      </label>
                      <input
                        className="input font-mono"
                        placeholder="64 hex characters"
                        value={expectedHash}
                        onChange={(e) => setExpectedHash(e.target.value)}
                        disabled={running || queued.length > 1}
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem', borderColor: hashValid ? undefined : '#ef4444' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>
                        Lineage Parent (Built from)
                      </label>
                      <select
                        className="input"
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        disabled={running}
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                      >
                        <option value="">None / Not linked</option>
                        {artifacts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.original_filename} ({a.artifact_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: "What will be checked?" Card */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              marginBottom: '1.25rem',
              color: 'var(--color-text)',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            <ShieldCheck size={20} style={{ color: '#8b5cf6' }} />
            <span>What will be checked?</span>
          </div>

          {/* 4 Security check blocks matching the screenshot */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* 1. Model Integrity */}
            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                padding: '0.75rem',
                borderRadius: '12px',
                background: isDark ? 'rgba(59, 130, 246, 0.06)' : 'rgba(59, 130, 246, 0.04)',
                border: isDark ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid rgba(59, 130, 246, 0.1)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Layers size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.15rem' }}>
                  Model Integrity
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Serialization issues, tampering, backdoors
                </div>
              </div>
            </div>

            {/* 2. Dataset Risks */}
            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                padding: '0.75rem',
                borderRadius: '12px',
                background: isDark ? 'rgba(168, 85, 247, 0.06)' : 'rgba(168, 85, 247, 0.04)',
                border: isDark ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid rgba(168, 85, 247, 0.1)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Database size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.15rem' }}>
                  Dataset Risks
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Poisoning, duplicates, abnormal patterns
                </div>
              </div>
            </div>

            {/* 3. Dependency Risks */}
            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                padding: '0.75rem',
                borderRadius: '12px',
                background: isDark ? 'rgba(249, 115, 22, 0.06)' : 'rgba(249, 115, 22, 0.04)',
                border: isDark ? '1px solid rgba(249, 115, 22, 0.15)' : '1px solid rgba(249, 115, 22, 0.1)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(249, 115, 22, 0.15)',
                  color: '#fb923c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Code size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.15rem' }}>
                  Dependency Risks
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Vulnerable or malicious packages (CVEs)
                </div>
              </div>
            </div>

            {/* 4. Supply Chain Analysis */}
            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                padding: '0.75rem',
                borderRadius: '12px',
                background: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)',
                border: isDark ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.1)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <GitBranch size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '0.15rem' }}>
                  Supply Chain Analysis
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Provenance, lineage, and trust verification
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Scans Table Section ── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Table Section Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <History size={19} style={{ color: '#8b5cf6' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
              Recent Scans
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              (Last 5 scans)
            </span>
          </div>

          <Link
            to="/scans"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#8b5cf6',
              textDecoration: 'none',
              padding: '0.35rem 0.75rem',
              borderRadius: 8,
              background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
              transition: 'background 0.15s ease',
            }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              minWidth: '650px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>File Name</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Risk Level</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Score</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Scanned On</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingScans ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                    <Loader2 size={22} className="spin" style={{ margin: '0 auto 0.5rem', color: '#8b5cf6' }} />
                    <span>Loading recent scans…</span>
                  </td>
                </tr>
              ) : recentScans.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                    <ShieldCheck size={32} style={{ margin: '0 auto 0.6rem', color: 'var(--color-text-muted)', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>No scans recorded yet</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>Upload an AI artifact above to view threat findings here.</div>
                  </td>
                </tr>
              ) : (
                recentScans.slice(0, 5).map((scan) => {
                  const filename =
                    scan.artifact?.original_filename ||
                    artifacts.find((a) => a.id === scan.artifact_id)?.original_filename ||
                    scan.filename ||
                    `artifact_${scan.artifact_id?.slice(0, 8) || scan.id.slice(0, 8)}`;
                  const rawType =
                    scan.artifact?.artifact_type ||
                    artifacts.find((a) => a.id === scan.artifact_id)?.artifact_type ||
                    scan.scan_type ||
                    'MODEL';
                  const typeBadge = getTypeBadge(rawType);
                  const riskBadge = getRiskBadge(scan.risk_level);

                  // Calculate display score e.g. 8.6 / 10
                  const rawScore = scan.risk_score ?? 0;
                  const displayScore = rawScore > 10 ? (rawScore / 10).toFixed(1) : Number(rawScore).toFixed(1);

                  return (
                    <tr
                      key={scan.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* File Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <FileText size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={filename}
                          >
                            {filename}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.65rem',
                            borderRadius: 999,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: typeBadge.color,
                            background: typeBadge.bg,
                            border: `1px solid ${typeBadge.border}`,
                          }}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      {/* Risk Level */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.65rem',
                            borderRadius: 999,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: riskBadge.color,
                            background: riskBadge.bg,
                            border: `1px solid ${riskBadge.border}`,
                          }}
                        >
                          {riskBadge.label}
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        <span style={{ fontSize: '0.88rem' }}>{displayScore}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 3 }}>/ 10</span>
                      </td>

                      {/* Scanned On */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {formatDateTime(scan.completed_at || scan.started_at)}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/scans/${scan.id}`)}
                          title="View Scan Report"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#8b5cf6';
                            e.currentTarget.style.borderColor = '#8b5cf6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text)';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
