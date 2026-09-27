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
    {/* Clay Spinner */}
    <div className="clay-spinner" />
    <div style={{ textAlign: 'center' }}>
      <p style={{
        fontWeight: 800,
        fontSize: '0.6875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: 'var(--clay-muted)',
      }}>
        Loading data...
      </p>
    </div>
  </div>
);

export const ErrorMessage = ({ message, retry }) => (
  <div style={{
    padding: '2.5rem',
    background: 'var(--clay-surface)',
    borderRadius: 'var(--clay-radius)',
    border: 'none',
    boxShadow: 'var(--clay-shadow)',
    textAlign: 'center',
  }}>
    {/* Icon inside soft clay container */}
    <div style={{
      width: '64px',
      height: '64px',
      background: '#FEF2F2',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.25rem',
      boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)',
    }}>
      <AlertTriangle size={28} style={{ color: 'var(--clay-danger)' }} />
    </div>

    <h3 style={{
      fontWeight: 800,
      fontSize: '1rem',
      color: '#DC2626',
      marginBottom: '0.5rem',
      letterSpacing: '-0.01em',
    }}>
      Something went wrong
    </h3>
    <p style={{
      color: 'var(--clay-muted)',
      fontSize: '0.875rem',
      fontWeight: 500,
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
          background: 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-primary-hover) 100%)',
          color: 'white',
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.8125rem',
          boxShadow: 'var(--clay-btn-primary-shadow)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <RefreshCw size={15} strokeWidth={2.5} />
        Try Again
      </button>
    )}
  </div>
);
