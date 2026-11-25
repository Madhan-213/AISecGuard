/**
 * AISecGuard — Toast Notification System
 * Lightweight, accessible, theme-aware toast notification manager.
 * Supports success, error, info, and warning notifications with auto-dismiss.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContext = createContext({
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
  remove: () => {},
});

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    remove: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Floating Viewport */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          pointerEvents: 'none',
          maxWidth: '380px',
          width: 'calc(100vw - 2.5rem)',
        }}
      >
        {toasts.map((t) => {
          let bg, border, textColor, Icon;
          if (t.type === 'success') {
            bg = 'var(--toast-success-bg, rgba(16, 185, 129, 0.15))';
            border = 'var(--toast-success-border, rgba(16, 185, 129, 0.4))';
            textColor = 'var(--color-success, #10b981)';
            Icon = CheckCircle2;
          } else if (t.type === 'error') {
            bg = 'var(--toast-error-bg, rgba(239, 68, 68, 0.15))';
            border = 'var(--toast-error-border, rgba(239, 68, 68, 0.4))';
            textColor = 'var(--color-danger, #ef4444)';
            Icon = AlertCircle;
          } else if (t.type === 'warning') {
            bg = 'var(--toast-warning-bg, rgba(245, 158, 11, 0.15))';
            border = 'var(--toast-warning-border, rgba(245, 158, 11, 0.4))';
            textColor = 'var(--color-warning, #f59e0b)';
            Icon = AlertTriangle;
          } else {
            bg = 'var(--toast-info-bg, rgba(59, 130, 246, 0.15))';
            border = 'var(--toast-info-border, rgba(59, 130, 246, 0.4))';
            textColor = 'var(--color-primary, #3b82f6)';
            Icon = Info;
          }

          return (
            <div
              key={t.id}
              className="fade-in"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1.1rem',
                borderRadius: '10px',
                background: 'var(--color-surface, #1e293b)',
                border: `1px solid ${border}`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
                color: 'var(--color-text, #f8fafc)',
                fontSize: '0.875rem',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: bg,
                  color: textColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                <Icon size={15} />
              </div>

              <div style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word', color: 'var(--color-text)' }}>
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

