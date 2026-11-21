/**
 * AISecGuard — Admin User Management Page
 * User inventory, search, account activation/suspension, role changes, and profile inspection.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserX,
  UserCheck,
  ShieldAlert,
  Trash2,
  Eye,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  X,
  History,
  Activity,
} from 'lucide-react';
import { adminUsersApi, adminErrorMessage } from '../api/adminClient';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useToast } from '../context/ToastContext';

export default function AdminUsersPage() {
  const toast = useToast();
  const { isSuperAdmin, adminUser } = useAdminAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, SUSPENDED

  // Selected user for inspection drawer
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailData, setUserDetailData] = useState(null);

  // Role edit modal
  const [roleModal, setRoleModal] = useState({ open: false, user: null, role: '' });

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null, deleting: false });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminUsersApi.list({ limit: 100 });
      setUsers(res.data?.users || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading user directory.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const nextStatus = !user.is_active;
      await adminUsersApi.updateStatus(user.id, nextStatus);
      toast.success(`Account for '${user.email}' is now ${nextStatus ? 'active' : 'suspended'}.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u))
      );
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed to update account status.'));
    }
  };

  const handleOpenRoleModal = (user) => {
    setRoleModal({ open: true, user, role: user.role });
  };

  const handleSaveRole = async () => {
    if (!roleModal.user) return;
    try {
      await adminUsersApi.updateRole(roleModal.user.id, roleModal.role);
      toast.success(`Role for '${roleModal.user.email}' updated to ${roleModal.role}.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === roleModal.user.id ? { ...u, role: roleModal.role, is_admin: ['SUPER_ADMIN', 'ADMIN'].includes(roleModal.role) } : u))
      );
      setRoleModal({ open: false, user: null, role: '' });
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed to update role.'));
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.user) return;
    try {
      setDeleteModal((p) => ({ ...p, deleting: true }));
      await adminUsersApi.delete(deleteModal.user.id);
      toast.success(`User '${deleteModal.user.email}' deleted permanently.`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModal.user.id));
      setDeleteModal({ open: false, user: null, deleting: false });
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed to delete user.'));
      setDeleteModal((p) => ({ ...p, deleting: false }));
    }
  };

  const handleInspectUser = async (user) => {
    setSelectedUser(user);
    setUserDetailLoading(true);
    try {
      const res = await adminUsersApi.get(user.id);
      setUserDetailData(res.data);
    } catch {
      setUserDetailData(null);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const roleMatch = roleFilter === 'ALL' || u.role === roleFilter;
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.is_active) ||
        (statusFilter === 'SUSPENDED' && !u.is_active);
      const q = searchQuery.trim().toLowerCase();
      const searchMatch =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q);
      return roleMatch && statusMatch && searchMatch;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)' }}>
            <Users size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              User Management
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Directory of platform users, role allocations, account suspension, and telemetry history.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchUsers}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Toolbar Filters */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'SUPER_ADMIN', 'ADMIN', 'ANALYST', 'USER'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                fontSize: '0.75rem',
                fontWeight: roleFilter === r ? 700 : 500,
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: roleFilter === r ? '#dc2626' : 'var(--color-border)',
                background: roleFilter === r ? 'rgba(220, 38, 38, 0.12)' : 'transparent',
                color: roleFilter === r ? '#dc2626' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}

          <div style={{ height: 20, width: 1, background: 'var(--color-border)', margin: '0 0.25rem' }} />

          {['ALL', 'ACTIVE', 'SUSPENDED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                fontSize: '0.75rem',
                fontWeight: statusFilter === s ? 700 : 500,
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: statusFilter === s ? 'var(--color-primary)' : 'transparent',
                background: statusFilter === s ? 'var(--color-primary-light)' : 'transparent',
                color: statusFilter === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {s === 'ALL' ? 'All Status' : s}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search email or full name..."
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

      {/* Users Table */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Loading users…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Users size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No users found matching query.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>User / Identity</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Uploads</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Scans Run</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Last Login</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === adminUser?.id;
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {u.full_name || 'Anonymous User'}
                          {isCurrent && (
                            <span style={{ marginLeft: '0.45rem', fontSize: '0.65rem', background: 'rgba(220, 38, 38, 0.15)', color: '#ef4444', padding: '0.05rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                          {u.email}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 6,
                          background: u.role === 'SUPER_ADMIN' ? 'rgba(239, 68, 68, 0.2)' : u.role === 'ADMIN' ? 'rgba(124, 58, 237, 0.2)' : 'var(--color-btn-ghost-bg)',
                          color: u.role === 'SUPER_ADMIN' ? '#ef4444' : u.role === 'ADMIN' ? '#a855f7' : 'var(--color-text)',
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {u.is_active ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                            Active
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                            Suspended
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                        {u.upload_count}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                        {u.scan_count}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => handleInspectUser(u)}
                            title="Inspect user audit history"
                          >
                            <Eye size={13} />
                            <span style={{ marginLeft: '0.3rem' }}>Profile</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => handleOpenRoleModal(u)}
                            title="Change role"
                          >
                            <KeyRound size={13} />
                            <span style={{ marginLeft: '0.3rem' }}>Role</span>
                          </button>

                          {!isCurrent && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: u.is_active ? '#ef4444' : '#10b981' }}
                              onClick={() => handleToggleStatus(u)}
                              title={u.is_active ? 'Suspend account' : 'Activate account'}
                            >
                              {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                              <span style={{ marginLeft: '0.3rem' }}>{u.is_active ? 'Suspend' : 'Activate'}</span>
                            </button>
                          )}

                          {isSuperAdmin && !isCurrent && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '0.35rem 0.5rem', color: '#ef4444' }}
                              onClick={() => setDeleteModal({ open: true, user: u, deleting: false })}
                              title="Delete user permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Update Modal */}
      {roleModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--color-text)' }}>
              Change Role: {roleModal.user?.email}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Assigning an administrative role gives privileged access to platform settings and user databases.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[
                { id: 'SUPER_ADMIN', name: 'Super Administrator', desc: 'Full platform ownership and user deletion' },
                { id: 'ADMIN', name: 'Administrator', desc: 'User management, policy updates, and audit access' },
                { id: 'ANALYST', name: 'Security Analyst', desc: 'Execute scans, sign artifacts, manage quarantine' },
                { id: 'USER', name: 'Normal User', desc: 'Upload models and view own scan reports' },
              ].map((r) => (
                <label
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.75rem',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: roleModal.role === r.id ? '#dc2626' : 'var(--color-border)',
                    background: roleModal.role === r.id ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="admin_role"
                    checked={roleModal.role === r.id}
                    onChange={() => setRoleModal((p) => ({ ...p, role: r.id }))}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>{r.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button className="btn btn-ghost" onClick={() => setRoleModal({ open: false, user: null, role: '' })}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveRole}
                style={{ background: 'linear-gradient(135deg, #dc2626, #7c3aed)', border: 'none', color: '#fff', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.75rem' }}>
              <AlertTriangle size={22} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Permanently Delete User Account?</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--color-text)' }}>{deleteModal.user?.email}</strong>? This will permanently purge the account from the database.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteModal({ open: false, user: null, deleting: false })}
                disabled={deleteModal.deleting}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDeleteUser}
                disabled={deleteModal.deleting}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {deleteModal.deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile & History Drawer */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.5rem', position: 'relative' }}>
            <button
              onClick={() => setSelectedUser(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1rem', color: 'var(--color-text)' }}>
              User Profile & Activity Audit: {selectedUser.email}
            </h2>

            {userDetailLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                <span className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
                <div>Loading user telemetry…</div>
              </div>
            ) : userDetailData ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', background: 'var(--color-table-header-bg)', padding: '1rem', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Full Name: </span>
                    <strong style={{ color: 'var(--color-text)' }}>{userDetailData.user.full_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Current Role: </span>
                    <strong style={{ color: 'var(--color-text)' }}>{userDetailData.user.role}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Account Status: </span>
                    <span style={{ color: userDetailData.user.is_active ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {userDetailData.user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Registered: </span>
                    <span style={{ color: 'var(--color-text)' }}>{new Date(userDetailData.user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--color-text)' }}>
                  Recent Activity Trail
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 180, overflowY: 'auto', marginBottom: '1rem' }}>
                  {userDetailData.recent_activities.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No activities logged for this user.</div>
                  ) : (
                    userDetailData.recent_activities.map((a) => (
                      <div key={a.id} style={{ padding: '0.5rem 0.65rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{a.details || a.action}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: 'var(--color-text)' }}>
                  Recent Login History
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 180, overflowY: 'auto' }}>
                  {userDetailData.recent_logins.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No login records found.</div>
                  ) : (
                    userDetailData.recent_logins.map((l) => (
                      <div key={l.id} style={{ padding: '0.5rem 0.65rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: l.status === 'SUCCESS' ? '#10b981' : '#ef4444' }}>
                            {l.status}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>IP: {l.ip_address}</span>
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{new Date(l.login_time).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
