/**
 * AISecGuard — Artifact Registry Page
 * Central repository of uploaded AI models, datasets, dependencies, and archives.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  Trash2,
  ShieldAlert,
  Play,
  Download,
  FileCode,
  Database,
  Cpu,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Copy,
  ExternalLink,
  Eye,
  X,
} from 'lucide-react';
import { artifactsApi, scansApi, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ArtifactRegistryPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, MODEL, DATASET, DEPENDENCY, ARCHIVE
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [artifactScans, setArtifactScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);

  // Deletion modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, artifact: null, deleting: false });

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await artifactsApi.list({ limit: 100 });
      setArtifacts(res.data?.artifacts || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading artifacts registry.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const openArtifactDetails = async (artifact) => {
    setSelectedArtifact(artifact);
    setLoadingScans(true);
    try {
      const res = await scansApi.list({ artifact_id: artifact.id, limit: 10 });
      setArtifactScans(res.data?.scans || []);
    } catch {
      setArtifactScans([]);
    } finally {
      setLoadingScans(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.artifact) return;
    try {
      setDeleteModal((prev) => ({ ...prev, deleting: true }));
      await artifactsApi.delete(deleteModal.artifact.id);
      toast.success(`Artifact '${deleteModal.artifact.original_filename}' deleted permanently.`);
      setArtifacts((prev) => prev.filter((a) => a.id !== deleteModal.artifact.id));
      if (selectedArtifact?.id === deleteModal.artifact.id) {
        setSelectedArtifact(null);
      }
      setDeleteModal({ open: false, artifact: null, deleting: false });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete artifact.'));
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  const handleTriggerScan = async (artifactId) => {
    try {
      toast.info('Initiating security scan...');
      const res = await scansApi.create(artifactId);
      toast.success('Security scan initiated successfully.');
      navigate(`/scans/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to trigger scan.'));
    }
  };

  // Filtered Artifacts
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((art) => {
      const typeMatch = activeTab === 'ALL' || art.artifact_type?.toUpperCase() === activeTab;
      const query = searchQuery.trim().toLowerCase();
      const searchMatch =
        !query ||
        art.original_filename?.toLowerCase().includes(query) ||
        art.sha256?.toLowerCase().includes(query) ||
        art.artifact_type?.toLowerCase().includes(query);
      return typeMatch && searchMatch;
    });
  }, [artifacts, activeTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let models = 0;
    let datasets = 0;
    let dependencies = 0;
    let totalSize = 0;

    for (const a of artifacts) {
      totalSize += a.file_size || 0;
      const type = (a.artifact_type || '').toUpperCase();
      if (type.includes('MODEL')) models++;
      else if (type.includes('DATASET')) datasets++;
      else if (type.includes('DEP')) dependencies++;
    }

    return {
      total: artifacts.length,
      models,
      datasets,
      dependencies,
      sizeMb: (totalSize / (1024 * 1024)).toFixed(2),
    };
  }, [artifacts]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Hash copied to clipboard!');
  };

  const getTypeIcon = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('MODEL')) return <Cpu size={16} className="text-purple-400" />;
    if (t.includes('DATASET')) return <Database size={16} className="text-pink-400" />;
    if (t.includes('DEP')) return <FileCode size={16} className="text-amber-400" />;
    return <Archive size={16} className="text-emerald-400" />;
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'QUARANTINED') {
      return (
        <span className="badge badge-critical" style={{ fontSize: '0.72rem' }}>
          Quarantined
        </span>
      );
    }
    if (s === 'SCANNED') {
      return (
        <span className="badge badge-low" style={{ fontSize: '0.72rem' }}>
          Scanned
        </span>
      );
    }
    if (s === 'SCANNING') {
      return (
        <span className="badge badge-medium" style={{ fontSize: '0.72rem' }}>
          Scanning…
        </span>
      );
    }
    return (
      <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
        Pending
      </span>
    );
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)' }}>
              <Layers size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
                Artifact Registry
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
                Central repository of AI models, datasets, dependencies, and supply chain binaries.
              </p>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', padding: '0.5rem 1rem' }}
        >
          <Play size={14} />
          <span>Upload & Ingest</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Ingested
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.3rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Across all asset types
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI Models
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.3rem' }}>
            {stats.models}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            .pt, .pkl, .onnx, weights
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Datasets
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.3rem' }}>
            {stats.datasets}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Training & eval corpora
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Storage Footprint
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.3rem' }}>
            {stats.sizeMb} MB
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Local sandbox volume
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'MODEL', 'DATASET', 'DEPENDENCY', 'ARCHIVE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: '0.78rem',
                fontWeight: activeTab === tab ? 700 : 500,
                padding: '0.4rem 0.8rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: activeTab === tab ? 'var(--color-primary)' : 'var(--color-border)',
                background: activeTab === tab ? 'var(--color-primary-light)' : 'transparent',
                color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'ALL' ? 'All Assets' : tab.charAt(0) + tab.slice(1).toLowerCase() + 's'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search artifacts or SHA-256..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.1rem',
              paddingRight: '0.75rem',
              paddingTop: '0.4rem',
              paddingBottom: '0.4rem',
              fontSize: '0.8rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Artifacts Table */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Loading artifact inventory…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filteredArtifacts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Layers size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No artifacts found.</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Upload a model or dataset to populate the inventory.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Artifact Name</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Asset Type</th>
                  <th style={{ padding: '0.85rem 1rem' }}>File Size</th>
                  <th style={{ padding: '0.85rem 1rem' }}>SHA-256 Digest</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Ingested</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArtifacts.map((art) => (
                  <tr
                    key={art.id}
                    style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        {getTypeIcon(art.artifact_type)}
                        <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={art.original_filename}>
                          {art.original_filename}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {art.artifact_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      {(art.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <code style={{ fontSize: '0.72rem', background: 'var(--color-bg)', padding: '0.15rem 0.35rem', borderRadius: 4, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                          {art.sha256}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(art.sha256)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
                          title="Copy SHA-256"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {art.uploaded_at ? new Date(art.uploaded_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getStatusBadge(art.status)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => openArtifactDetails(art)}
                          title="Inspect metadata and scan history"
                        >
                          <Eye size={13} />
                          <span style={{ marginLeft: '0.3rem' }}>Inspect</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                          onClick={() => handleTriggerScan(art.id)}
                          title="Trigger security scan"
                        >
                          <Play size={13} />
                          <span style={{ marginLeft: '0.3rem' }}>Scan</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.5rem', color: '#ef4444' }}
                          onClick={() => setDeleteModal({ open: true, artifact: art, deleting: false })}
                          title="Delete artifact"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Artifact Details Drawer / Modal */}
      {selectedArtifact && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setSelectedArtifact(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              {getTypeIcon(selectedArtifact.artifact_type)}
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                {selectedArtifact.original_filename}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', background: 'var(--color-table-header-bg)', padding: '1rem', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Asset Type: </span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{selectedArtifact.artifact_type}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>File Size: </span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{(selectedArtifact.file_size / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Current Status: </span>
                {getStatusBadge(selectedArtifact.status)}
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Uploaded: </span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{selectedArtifact.uploaded_at ? new Date(selectedArtifact.uploaded_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>SHA-256 Digest: </span>
                <code style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--color-primary)' }}>
                  {selectedArtifact.sha256}
                </code>
              </div>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--color-text)' }}>
              Scan History & Risk Profile
            </h3>

            {loadingScans ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
                <span className="spinner" style={{ width: 20, height: 20, margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.78rem' }}>Loading associated scans…</div>
              </div>
            ) : artifactScans.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--color-bg)', border: '1px dashed var(--color-border)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                No security scans executed for this artifact yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
                {artifactScans.map((sc) => (
                  <div
                    key={sc.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.78rem' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        Scan ID: {sc.id.slice(0, 8)}…
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                        {sc.completed_at ? new Date(sc.completed_at).toLocaleString() : 'In Progress'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className={`badge badge-${(sc.risk_level || 'unknown').toLowerCase()}`}>
                        {sc.risk_level || 'UNKNOWN'} ({sc.risk_score || 0})
                      </span>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                        onClick={() => navigate(`/scans/${sc.id}`)}
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedArtifact(null)}
                style={{ fontSize: '0.8rem' }}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleTriggerScan(selectedArtifact.id)}
                style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Play size={13} />
                <span>Run New Scan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.75rem' }}>
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Permanently Delete Artifact?</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--color-text)' }}>{deleteModal.artifact?.original_filename}</strong>? This will permanently delete the stored file from disk and purge associated scan histories.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteModal({ open: false, artifact: null, deleting: false })}
                disabled={deleteModal.deleting}
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={deleteModal.deleting}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {deleteModal.deleting ? 'Deleting…' : 'Delete File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
