import React, { useState, useEffect } from 'react';

const Clock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/ /g, ' ');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        background: 'var(--clay-surface)',
        borderRadius: '24px',
        boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.8)',
        border: 'none',
        padding: '1rem 1.25rem',
        zIndex: 50,
        transition: 'all 0.2s ease',
      }}
      className="hover:scale-105 group"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--clay-primary)',
          marginBottom: '2px',
        }}>
          System Time
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '1.25rem',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: 'var(--clay-text)',
        }}>
          {formatTime(date)}
        </div>
        <div style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          color: 'var(--clay-muted)',
          marginTop: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
        }}>
          {formatDate(date)}
        </div>
      </div>
    </div>
  );
};

export default Clock;
