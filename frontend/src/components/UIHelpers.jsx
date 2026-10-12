import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const Loader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1.25rem',
  }}>
    <div className="clay-spinner" />
    <div style={{ textAlign: 'center' }}>
      <p style={{
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--inst-muted)',
        fontFamily: 'var(--font-body)',
      }}>
        Loading data...
      </p>
    </div>
  </div>
);

export const ErrorMessage = ({ message, retry }) => (
  <div style={{
    padding: '2.5rem 2rem',
    background: 'var(--inst-surface)',
    borderRadius: 'var(--inst-radius)',
    border: '1px solid var(--inst-border)',
    boxShadow: 'var(--inst-shadow-sm)',
    textAlign: 'center',
    maxWidth: '480px',
    margin: '2rem auto',
  }}>
    {/* Icon in institutional danger tint well */}
    <div style={{
      width: '56px',
      height: '56px',
      background: 'var(--inst-danger-tint)',
      border: '1px solid rgba(156, 59, 50, 0.25)',
      borderRadius: 'var(--inst-radius-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.25rem',
    }}>
      <AlertTriangle size={26} style={{ color: 'var(--inst-danger)' }} />
    </div>

    <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: '1.125rem',
      color: 'var(--inst-danger)',
      marginBottom: '0.5rem',
      letterSpacing: '-0.01em',
    }}>
      Something went wrong
    </h3>
    <p style={{
      color: 'var(--inst-muted)',
      fontSize: '0.875rem',
      fontWeight: 500,
      fontFamily: 'var(--font-body)',
      lineHeight: 1.5,
      marginBottom: retry ? '1.5rem' : 0,
    }}>
      {message || 'An unexpected error occurred. Please try again.'}
    </p>

    {retry && (
      <button
        onClick={retry}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          background: 'var(--inst-ink)',
          border: '1px solid var(--inst-ink)',
          color: '#FFFFFF',
          borderRadius: 'var(--inst-radius-sm)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-body)',
          boxShadow: 'var(--inst-shadow-sm)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--inst-ink-700)';
          e.currentTarget.style.borderColor = 'var(--inst-ink-700)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--inst-ink)';
          e.currentTarget.style.borderColor = 'var(--inst-ink)';
        }}
      >
        <RefreshCw size={15} strokeWidth={2.2} />
        Try Again
      </button>
    )}
  </div>
);
