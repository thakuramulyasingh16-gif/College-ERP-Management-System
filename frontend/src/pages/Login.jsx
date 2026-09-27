import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle, Shield } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Authentication logic preserved 100% exactly
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      const res = await fetch(
        "https://college-erp-management-system-a9xk.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed. Please check your credentials.");
        return;
      }

      login(data.user, data.token);

      const role = data.user.role;
      if (role === "admin") navigate('/admin', { replace: true });
      else if (role === "teacher") navigate('/teacher', { replace: true });
      else navigate('/student', { replace: true });

    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--erp-bg)',
        padding: '1.5rem',
      }}
    >
      {/* Centered Soft Clay Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--erp-surface)',
          borderRadius: '26px',
          padding: '2.5rem 2.25rem',
          boxShadow: 'var(--erp-clay-card)',
          border: '1px solid rgba(237, 233, 254, 0.80)',
          position: 'relative',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'var(--erp-surface-soft)',
            border: '1px solid rgba(108, 99, 255, 0.12)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9), 0 4px 12px rgba(108, 99, 255, 0.06)',
            marginBottom: '1rem',
          }}>
            <img
              src={logo}
              alt="CGC Logo"
              style={{ width: '44px', height: '44px', objectFit: 'contain' }}
            />
          </div>

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: 'var(--erp-text)',
            letterSpacing: '-0.03em',
            margin: '0 0 0.25rem 0',
          }}>
            CGC ERP Portal
          </h1>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--erp-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            margin: 0,
          }}>
            City Group of Colleges
          </p>

          {/* Role pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '0.875rem' }}>
            {['Admin', 'Teacher', 'Student'].map((role) => (
              <span
                key={role}
                style={{
                  padding: '3px 10px',
                  background: 'var(--erp-surface-soft)',
                  color: 'var(--erp-primary)',
                  borderRadius: '999px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                }}
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.20)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} style={{ color: 'var(--erp-danger)', flexShrink: 0 }} />
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--erp-danger)',
              fontWeight: 600,
              margin: 0,
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--erp-muted)',
              marginBottom: '0.375rem',
            }}>
              Official Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={17}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--erp-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="email"
                placeholder="name@citycolleges.info"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '14px',
                  background: 'var(--erp-surface-soft)',
                  border: '1.5px solid rgba(108, 99, 255, 0.12)',
                  color: 'var(--erp-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: 'var(--erp-shadow-inset)',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.background = '#FFFFFF';
                  e.target.style.borderColor = 'var(--erp-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(108, 99, 255, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--erp-surface-soft)';
                  e.target.style.borderColor = 'rgba(108, 99, 255, 0.12)';
                  e.target.style.boxShadow = 'var(--erp-shadow-inset)';
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--erp-muted)',
              marginBottom: '0.375rem',
            }}>
              Security Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={17}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--erp-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '14px',
                  background: 'var(--erp-surface-soft)',
                  border: '1.5px solid rgba(108, 99, 255, 0.12)',
                  color: 'var(--erp-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: 'var(--erp-shadow-inset)',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.background = '#FFFFFF';
                  e.target.style.borderColor = 'var(--erp-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(108, 99, 255, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--erp-surface-soft)';
                  e.target.style.borderColor = 'rgba(108, 99, 255, 0.12)';
                  e.target.style.boxShadow = 'var(--erp-shadow-inset)';
                }}
              />
            </div>
          </div>

          {/* Tactile Primary Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.8125rem',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--erp-primary) 0%, var(--erp-secondary) 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--erp-clay-btn)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '0 6px 18px -2px rgba(108, 99, 255, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = 'var(--erp-clay-btn)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            onMouseDown={(e) => {
              if (!loading) e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In to Portal</span>
              </>
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '0.6875rem',
          color: 'var(--erp-muted)',
          marginTop: '1.75rem',
          marginBottom: 0,
        }}>
          City Group of Colleges  Secure Campus ERP
        </p>
      </div>
    </div>
  );
};

export default Login;
