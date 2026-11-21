/**
 * AISecGuard — Notifications Page
 * In-app security alerts, scan completion triggers, quarantine notifications, and system events.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Check,
  Trash2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { notificationsApi, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationsApi.list();
      setNotifications(res.data?.notifications || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading notifications.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed marking notification as read.'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed marking all as read.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.info('Notification dismissed.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to dismiss notification.'));
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  const getSeverityIcon = (sev) => {
    const s = (sev || '').toUpperCase();
    if (s === 'CRITICAL') return <ShieldAlert size={18} className="text-red-500" />;
    if (s === 'WARNING') return <AlertTriangle size={18} className="text-amber-500" />;
    if (s === 'SUCCESS') return <CheckCircle2 size={18} className="text-emerald-500" />;
    return <Info size={18} className="text-blue-500" />;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)' }}>
            <Bell size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
                Notifications & Alerts
              </h1>
              {unreadCount > 0 && (
                <span className="badge badge-critical" style={{ fontSize: '0.72rem' }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Real-time threat alerts, quarantine events, and scanner completion notices.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            className="btn btn-ghost"
            onClick={handleMarkAllRead}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Check size={14} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {['ALL', 'UNREAD'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                fontSize: '0.78rem',
                fontWeight: filter === tab ? 700 : 500,
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: filter === tab ? 'var(--color-primary)' : 'transparent',
                background: filter === tab ? 'var(--color-primary-light)' : 'transparent',
                color: filter === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {tab === 'ALL' ? `All Notifications (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Loading security alerts…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Bell size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No notifications found.</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>All clear! You are caught up with all security alerts.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--color-border)',
                  background: item.is_read ? 'transparent' : 'var(--color-table-header-bg)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'background-color 0.15s ease',
                }}
                className="table-row-hover"
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ marginTop: '0.15rem' }}>
                    {getSeverityIcon(item.severity)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0.45rem', lineHeight: 1.5 }}>
                      {item.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                      {item.link && (
                        <button
                          type="button"
                          className="link-primary"
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => navigate(item.link)}
                        >
                          <span>Open related view</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  {!item.is_read && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => handleMarkAsRead(item.id)}
                      title="Mark as read"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '0.3rem 0.5rem', color: 'var(--color-text-muted)' }}
                    onClick={() => handleDelete(item.id)}
                    title="Dismiss notification"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
