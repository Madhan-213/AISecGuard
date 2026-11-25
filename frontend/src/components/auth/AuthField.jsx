/**
 * AISecGuard — AuthField
 * Reusable, clean SaaS form field for Login and Registration pages.
 * Provides consistent spacing, crisp borders, focus rings, leading icons, and password toggles.
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  autoFocus = false,
  required = false,
  rightLabel = null,
  state = 'default', // 'default' | 'success' | 'error'
  isDark = false,
  isPasswordToggle = false,
  showPassword = false,
  onTogglePassword = null,
}) {
  const [focused, setFocused] = useState(false);

  const getBorderColor = () => {
    if (state === 'error') return '#ef4444';
    if (state === 'success') return '#10b981';
    if (focused) return isDark ? '#60a5fa' : '#4f7ef7';
    return isDark ? 'rgba(148, 163, 184, 0.22)' : '#d1d9e6';
  };

  const getBoxShadow = () => {
    if (state === 'error') return '0 0 0 3px rgba(239, 68, 68, 0.16)';
    if (state === 'success') return '0 0 0 3px rgba(16, 185, 129, 0.16)';
    if (focused) {
      return isDark
        ? '0 0 0 3px rgba(96, 165, 250, 0.2)'
        : '0 0 0 3px rgba(79, 126, 247, 0.16)';
    }
    return 'none';
  };

  const getBackground = () => {
    if (isDark) {
      return focused ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.58)';
    }
    return focused ? '#ffffff' : 'rgba(248, 250, 252, 0.9)';
  };

  const iconColor = focused
    ? isDark
      ? '#60a5fa'
      : '#4f7ef7'
    : isDark
      ? '#64748b'
      : '#94a3b8';

  return (
    <div style={{ marginBottom: '1rem' }}>
      {(label || rightLabel) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.4rem',
          }}
        >
          {label && (
            <label
              htmlFor={id}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.01em',
                color: isDark ? '#cbd5e1' : '#334155',
              }}
            >
              {label}
            </label>
          )}
          {rightLabel}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon
            size={16}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: iconColor,
              transition: 'color 0.18s ease',
              pointerEvents: 'none',
            }}
          />
        )}

        <input
          id={id}
          name={name || id}
          type={type}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={onChange}
          style={{
            width: '100%',
            height: 44,
            padding: `0 ${isPasswordToggle ? '2.6rem' : '0.9rem'} 0 ${Icon ? '2.5rem' : '0.9rem'}`,
            fontSize: '0.88rem',
            borderRadius: 10,
            background: getBackground(),
            border: `1px solid ${getBorderColor()}`,
            boxShadow: getBoxShadow(),
            color: isDark ? '#f8fafc' : '#0f172a',
            outline: 'none',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
          }}
        />

        {isPasswordToggle && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.35rem',
              borderRadius: 6,
              transition: 'color 0.15s ease',
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
