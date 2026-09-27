import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle, GraduationCap } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // ── LOGIC UNCHANGED ────────────────────────────────────────
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
  // ── END LOGIC ───────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{ background: 'var(--clay-bg)' }}
    >
      {/* ── Decorative Background Blobs ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-120px', left: '-120px',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
          animation: 'floatBlob 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-100px', right: '-100px',
          width: '450px', height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
          animation: 'floatBlob 10s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '40%', left: '60%',
          width: '280px', height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
          animation: 'floatBlob 12s ease-in-out infinite',
        }}
      />

      {/* ── Clay Login Card ── */}
      <div
        className="w-full max-w-md relative z-10"
        style={{ animation: 'clayIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <div
          style={{
            background: 'var(--clay-surface)',
            borderRadius: 'var(--clay-r-xl)',
            boxShadow: 'var(--clay-shadow-lg)',
            border: '1px solid rgba(237,233,254,0.70)',
            padding: '2.5rem 2.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top highlight strip */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '4px',
            background: 'linear-gradient(to right, var(--clay-primary), var(--clay-secondary), var(--clay-accent))',
            borderRadius: '40px 40px 0 0',
          }} />

          {/* Inner surface shine */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.50) 0%, transparent 40%)',
            borderRadius: 'inherit',
            pointerEvents: 'none',
          }} />

          {/* ── Header ── */}
          <div className="text-center mb-8" style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo Container */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '88px', height: '88px',
              borderRadius: '28px',
              background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(139,92,246,0.06) 100%)',
              boxShadow: '0 8px 32px -4px rgba(108,99,255,0.20), inset 0 1px 0 rgba(255,255,255,0.80)',
              border: '1px solid rgba(237,233,254,0.80)',
              marginBottom: '1.25rem',
            }}>
              <img
                src={logo}
                alt="CGC Logo"
                style={{ width: '56px', height: '56px', objectFit: 'contain' }}
              />
            </div>

            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              color: 'var(--clay-text)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '0.5rem',
            }}>
              CGC ERP Portal
            </h1>
            <p style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--clay-muted)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              City Group of Colleges
            </p>

            {/* Role pills */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {['Admin', 'Teacher', 'Student'].map((r) => (
                <span key={r} style={{
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(108,99,255,0.08)',
                  color: 'var(--clay-primary)',
                  borderRadius: '999px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* ── Error Message ── */}
          {error && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '0.875rem 1rem',
              background: 'rgba(239,68,68,0.08)',
              border: '1.5px solid rgba(239,68,68,0.20)',
              borderRadius: 'var(--clay-r-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              animation: 'clayIn 0.3s ease both',
              position: 'relative',
              zIndex: 1,
            }}>
              <AlertCircle size={18} style={{ color: 'var(--clay-danger)', flexShrink: 0 }} />
              <p style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#DC2626',
                letterSpacing: '0.02em',
              }}>{error}</p>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleLogin} className="space-y-5" style={{ position: 'relative', zIndex: 1 }}>
            {/* Email Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                color: 'var(--clay-muted)',
                marginBottom: '0.5rem',
                paddingLeft: '0.25rem',
              }}>
                Official Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute"
                  style={{
                    left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--clay-muted)', pointerEvents: 'none',
                    transition: 'color 0.2s',
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
                    paddingLeft: '2.75rem',
                    paddingRight: '1rem',
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem',
                    background: 'rgba(244,241,251,0.60)',
                    border: '2px solid var(--clay-border)',
                    borderRadius: 'var(--clay-r-sm)',
                    color: 'var(--clay-text)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(108,99,255,0.05)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--clay-primary)';
                    e.target.style.background = 'var(--clay-surface)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(108,99,255,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--clay-border)';
                    e.target.style.background = 'rgba(244,241,251,0.60)';
                    e.target.style.boxShadow = 'inset 0 2px 4px rgba(108,99,255,0.05)';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                color: 'var(--clay-muted)',
                marginBottom: '0.5rem',
                paddingLeft: '0.25rem',
              }}>
                Security Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute"
                  style={{
                    left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--clay-muted)', pointerEvents: 'none',
                  }}
                />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '2.75rem',
                    paddingRight: '1rem',
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem',
                    background: 'rgba(244,241,251,0.60)',
                    border: '2px solid var(--clay-border)',
                    borderRadius: 'var(--clay-r-sm)',
                    color: 'var(--clay-text)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(108,99,255,0.05)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--clay-primary)';
                    e.target.style.background = 'var(--clay-surface)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(108,99,255,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--clay-border)';
                    e.target.style.background = 'rgba(244,241,251,0.60)';
                    e.target.style.boxShadow = 'inset 0 2px 4px rgba(108,99,255,0.05)';
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                padding: '1rem',
                marginTop: '0.5rem',
                background: loading
                  ? 'rgba(108,99,255,0.60)'
                  : 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-secondary) 100%)',
                color: 'white',
                borderRadius: 'var(--clay-r-sm)',
                fontWeight: 800,
                fontSize: '0.875rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : 'var(--clay-btn)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = 'var(--clay-btn-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'var(--clay-btn)';
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(0.97) translateY(1px)';
              }}
              onMouseUp={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
              }}
            >
              {/* Button shine layer */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.20) 0%, transparent 100%)',
                pointerEvents: 'none',
              }} />
              {loading ? (
                <>
                  <div className="clay-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn size={18} strokeWidth={2.5} />
                  Secure Sign In
                </>
              )}
            </button>
          </form>

          {/* ── Footer ── */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(237,233,254,0.60)',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}>
            <div className="flex items-center justify-center gap-2">
              <GraduationCap size={14} style={{ color: 'var(--clay-accent)' }} />
              <p style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--clay-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                Authorized Personnel Only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
