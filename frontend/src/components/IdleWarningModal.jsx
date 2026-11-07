/**
 * IdleWarningModal.jsx
 *
 * Accessible warning shown 5 minutes before idle timeout.
 * Uses institutional CSS variables (--inst-*) only — no new UI library.
 * "Stay signed in" calls the staySignedIn() callback from useIdleLogout.
 */

import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function IdleWarningModal({ secondsRemaining, onStaySignedIn }) {
  if (!secondsRemaining || secondsRemaining <= 0) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-desc"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '1.5rem',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'var(--inst-surface)',
          border: '1px solid var(--inst-border)',
          borderTop: '3px solid var(--inst-gold)',
          borderRadius: 'var(--inst-radius-lg)',
          boxShadow: '0 20px 40px -8px rgba(21, 42, 74, 0.28)',
          padding: '1.25rem 1.5rem',
          maxWidth: '400px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          fontFamily: 'var(--font-body)',
          pointerEvents: 'auto',
          animation: 'idleSlideUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <AlertCircle size={18} style={{ color: 'var(--inst-gold)', flexShrink: 0 }} />
          <span
            id="idle-warning-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: 'var(--inst-ink)',
            }}
          >
            Session expiring soon
          </span>
        </div>

        {/* Body */}
        <p
          id="idle-warning-desc"
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            color: 'var(--inst-text)',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          You will be logged out in{' '}
          <strong
            style={{
              fontVariantNumeric: 'tabular-nums',
              color: secondsRemaining <= 60 ? 'var(--inst-danger)' : 'var(--inst-gold)',
            }}
          >
            {formatTime(secondsRemaining)}
          </strong>{' '}
          due to inactivity.
        </p>

        {/* Action */}
        <button
          type="button"
          onClick={onStaySignedIn}
          autoFocus
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--inst-radius-sm)',
            border: 'none',
            background: 'var(--inst-ink)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--inst-ink-700)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--inst-ink)')}
        >
          <Clock size={15} />
          Stay signed in
        </button>

        {/* Keyframe injected once */}
        <style>{`
          @keyframes idleSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
        `}</style>
      </div>
    </div>
  );
}

