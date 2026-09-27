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
    {/* Clay spinner */}
    <div style={{
      width: '48px', height: '48px',
      border: '3px solid rgba(108,99,255,0.15)',
      borderTopColor: 'var(--clay-primary)',
      borderRadius: '50%',
      animation: 'spinClay 0.75s linear infinite',
    }} />
    <div style={{ textAlign: 'center' }}>
      <p style={{
        fontWeight: 800,
        fontSize: '0.6875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: 'var(--clay-muted)',
        animation: 'pulseSoft 2s ease-in-out infinite',
      }}>
        Loading data...
      </p>
    </div>
  </div>
);

export const ErrorMessage = ({ message, retry }) => (
  <div style={{
    padding: '2.5rem',
    background: 'rgba(239,68,68,0.06)',
    borderRadius: 'var(--clay-r)',
    border: '1.5px solid rgba(239,68,68,0.15)',
    textAlign: 'center',
    animation: 'clayIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
  }}>
    {/* Icon */}
    <div style={{
      width: '64px', height: '64px',
      background: 'rgba(239,68,68,0.10)',
      borderRadius: '20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 1.25rem',
      boxShadow: '0 4px 16px -2px rgba(239,68,68,0.15)',
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
          background: 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-secondary) 100%)',
          color: 'white',
          borderRadius: '14px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.8125rem',
          boxShadow: 'var(--clay-btn)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--clay-btn-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--clay-btn)';
        }}
      >
        <RefreshCw size={15} strokeWidth={2.5} />
        Try Again
      </button>
    )}
  </div>
);
