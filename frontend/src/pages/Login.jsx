import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogIn, Lock, Mail, AlertCircle, CheckCircle,
  Key, Smartphone, ArrowRight, X, ShieldAlert,
  Eye, EyeOff, RefreshCw,
} from 'lucide-react';
import logo from '../assets/logo.png';

const API_BASE = 'https://college-erp-management-system-a9xk.onrender.com/api';

// ─── Eye-toggle button ─────────────────────────────────────────────────────────
function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Hide password' : 'Show password'}
      aria-pressed={show}
      tabIndex={0}
      style={{
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        padding: '6px',
        cursor: 'pointer',
        color: 'var(--inst-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        minWidth: '36px',
        minHeight: '36px',
        zIndex: 3,
      }}
    >
      {show ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}

// ─── CAPTCHA block ─────────────────────────────────────────────────────────────
const CAPTCHA_TTL_MS = 110 * 1000; // slightly under server's 120 s

function CaptchaBlock({ captchaId, setCaptchaId, captchaAnswer, setCaptchaAnswer }) {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const prevIdRef = useRef(null);
  const autoRefreshTimer = useRef(null);

  const fetchCaptcha = useCallback(async (prevId) => {
    setLoading(true);
    setError(false);
    setSpinning(true);
    try {
      const url = prevId
        ? `${API_BASE}/auth/captcha?prev=${encodeURIComponent(prevId)}`
        : `${API_BASE}/auth/captcha`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('captcha fetch failed');
      const data = await res.json();
      setSvg(data.svg);
      setCaptchaId(data.captchaId);
      prevIdRef.current = data.captchaId;

      // Schedule auto-refresh before TTL expires
      clearTimeout(autoRefreshTimer.current);
      autoRefreshTimer.current = setTimeout(() => {
        fetchCaptcha(prevIdRef.current);
      }, CAPTCHA_TTL_MS);
    } catch {
      setError(true);
      setSvg('');
      setCaptchaId('');
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, [setCaptchaId]);

  // Initial fetch on mount
  useEffect(() => {
    fetchCaptcha(null);
    return () => clearTimeout(autoRefreshTimer.current);
  }, [fetchCaptcha]);

  // Expose a reload trigger callable from the parent
  CaptchaBlock.reload = (prevId) => fetchCaptcha(prevId);

  const svgDataUri = svg
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Image row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Captcha image box */}
        <div
          style={{
            flex: 1,
            height: '56px',
            borderRadius: 'var(--inst-radius-sm)',
            border: '1px solid var(--inst-border-strong)',
            background: 'var(--inst-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {loading && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--inst-muted)',
                fontWeight: 500,
                textAlign: 'center',
                padding: '0 8px',
              }}
            >
              Loading…
            </span>
          )}
          {!loading && error && (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--inst-danger)',
                fontWeight: 500,
                textAlign: 'center',
                padding: '0 6px',
              }}
            >
              Couldn't load captcha · Retry ↻
            </span>
          )}
          {!loading && !error && svgDataUri && (
            <img
              src={svgDataUri}
              alt="CAPTCHA — type the characters shown"
              style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
            />
          )}
          {/* Skeleton shimmer while loading */}
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, var(--inst-border) 25%, var(--inst-surface) 50%, var(--inst-border) 75%)',
                backgroundSize: '200% 100%',
                animation: 'captchaSkeleton 1.4s ease infinite',
                borderRadius: 'var(--inst-radius-sm)',
              }}
            />
          )}
        </div>

        {/* Reload button */}
        <button
          type="button"
          aria-label="Reload captcha"
          onClick={() => {
            setCaptchaAnswer('');
            fetchCaptcha(prevIdRef.current);
          }}
          disabled={loading}
          style={{
            flexShrink: 0,
            width: '40px',
            height: '40px',
            borderRadius: 'var(--inst-radius-sm)',
            border: '1px solid var(--inst-border-strong)',
            background: 'var(--inst-surface)',
            color: 'var(--inst-muted)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <RefreshCw
            size={16}
            style={{
              transition: 'transform 0.6s linear',
              transform: spinning ? 'rotate(360deg)' : 'none',
            }}
          />
        </button>
      </div>

      {/* Answer input */}
      <input
        type="text"
        placeholder="Enter the characters shown"
        value={captchaAnswer}
        onChange={(e) => setCaptchaAnswer(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={8}
        style={{
          width: '100%',
          paddingTop: '0.65rem',
          paddingBottom: '0.65rem',
          paddingLeft: '0.875rem',
          paddingRight: '0.875rem',
          borderRadius: 'var(--inst-radius-sm)',
          border: '1px solid var(--inst-border-strong)',
          background: 'var(--inst-surface)',
          color: 'var(--inst-text)',
          fontSize: '0.875rem',
          fontWeight: 500,
          outline: 'none',
          boxSizing: 'border-box',
          letterSpacing: '0.08em',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--inst-ink)';
          e.target.style.boxShadow = '0 0 0 3px rgba(21, 42, 74, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--inst-border-strong)';
          e.target.style.boxShadow = 'none';
        }}
      />

      {/* Keyframe style injected once */}
      <style>{`
        @keyframes captchaSkeleton {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Login component ──────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // CAPTCHA state (lifted so handleLogin can send them)
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const captchaRef = useRef(null);

  // Forgot Password Modal State (Students & Teachers only)
  const [forgotModal, setForgotModal] = useState({
    open: false,
    step: 1,
    identifier: '',
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false,
    resetToken: '',
    loading: false,
    emailError: '',
    error: '',
    successMsg: '',
    otpSuccessMsg: '',
    lockoutSeconds: 0,
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  // Check for auto-logout message
  useEffect(() => {
    const sessionMsg = sessionStorage.getItem('session_invalidated_msg');
    if (sessionMsg) {
      setError(sessionMsg);
      sessionStorage.removeItem('session_invalidated_msg');
    }
  }, []);

  // Live countdown for login lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) { clearInterval(timer); setError(''); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Live countdown for forgot-password lockout
  useEffect(() => {
    if (forgotModal.lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setForgotModal((prev) => {
        if (prev.lockoutSeconds <= 1) {
          clearInterval(timer);
          return { ...prev, lockoutSeconds: 0, error: '' };
        }
        return { ...prev, lockoutSeconds: prev.lockoutSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotModal.lockoutSeconds]);

  // ── Login handler ────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setLoading(true);
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
          captchaId,
          captchaAnswer,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Rate-limited
      if (res.status === 429) {
        const retryHeader = res.headers.get('Retry-After');
        const retrySeconds = data.retryAfter || (retryHeader ? parseInt(retryHeader, 10) : 60);
        setLockoutSeconds(retrySeconds);
        // Reload captcha on lockout too
        setCaptchaAnswer('');
        CaptchaBlock.reload && CaptchaBlock.reload(captchaId);
        return;
      }

      // Captcha failed or bad credentials → reload captcha
      if (!res.ok) {
        setError(data.message || 'Login failed. Please check your credentials.');
        // Always reload captcha after any failure
        setCaptchaAnswer('');
        CaptchaBlock.reload && CaptchaBlock.reload(captchaId);
        return;
      }

      // Success
      setLockoutSeconds(0);
      setShowPassword(false); // reset toggle
      login(data.user, data.token);

      const role = data.user.role;
      if (role === 'admin') navigate('/admin', { replace: true });
      else if (role === 'teacher') navigate('/teacher', { replace: true });
      else navigate('/student', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
      setCaptchaAnswer('');
      CaptchaBlock.reload && CaptchaBlock.reload(captchaId);
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password: Step 1 ──────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const cleanId = forgotModal.identifier.trim();
    const cleanEmail = forgotModal.email.trim();

    if (!cleanId) {
      setForgotModal((prev) => ({ ...prev, error: 'Please enter your ID, Roll Number, or Teacher ID' }));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setForgotModal((prev) => ({ ...prev, emailError: 'Please enter a valid registered email address' }));
      return;
    }

    setForgotModal((prev) => ({ ...prev, loading: true, error: '', emailError: '' }));

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const retryHeader = res.headers.get('Retry-After');
        const retrySeconds = data.retryAfter || (retryHeader ? parseInt(retryHeader, 10) : 60);
        setForgotModal((prev) => ({
          ...prev, loading: false, lockoutSeconds: retrySeconds,
          error: data.message || 'Too many OTP requests. Please try again later.',
        }));
        return;
      }
      if (!res.ok) {
        setForgotModal((prev) => ({ ...prev, loading: false, error: data.message || 'Not found in database' }));
        return;
      }
      setForgotModal((prev) => ({
        ...prev, loading: false, step: 2,
        otpSuccessMsg: data.message || 'OTP sent successfully to your registered email.',
        error: '',
      }));
    } catch {
      setForgotModal((prev) => ({ ...prev, loading: false, error: 'Network error. Please try again.' }));
    }
  };

  // ── Forgot Password: Step 2 ──────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = forgotModal.otp.trim();
    if (!cleanOtp || !/^[0-9]{6}$/.test(cleanOtp)) {
      setForgotModal((prev) => ({ ...prev, error: 'Please enter a valid 6-digit OTP' }));
      return;
    }
    setForgotModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotModal.identifier.trim(),
          email: forgotModal.email.trim(),
          otp: cleanOtp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setForgotModal((prev) => ({
          ...prev, loading: false,
          error: data.message || 'Too many attempts. This OTP has been invalidated. Please request a new OTP.',
        }));
        return;
      }
      if (!res.ok) {
        setForgotModal((prev) => ({ ...prev, loading: false, error: data.message || 'Incorrect or expired OTP' }));
        return;
      }
      setForgotModal((prev) => ({
        ...prev, loading: false, step: 3, resetToken: data.resetToken, error: '', otpSuccessMsg: '',
      }));
    } catch {
      setForgotModal((prev) => ({ ...prev, loading: false, error: 'Network error verifying OTP' }));
    }
  };

  // ── Forgot Password: Step 3 ──────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword, resetToken } = forgotModal;
    if (!newPassword || newPassword.length < 8) {
      setForgotModal((prev) => ({ ...prev, error: 'New password must be at least 8 characters long' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotModal((prev) => ({ ...prev, error: 'Passwords do not match' }));
      return;
    }
    setForgotModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setForgotModal((prev) => ({
          ...prev, loading: false, error: data.message || 'Failed to reset password. Please start over.',
        }));
        return;
      }
      setForgotModal((prev) => ({
        ...prev, loading: false, successMsg: data.message || 'Password reset successfully!',
      }));
      setTimeout(() => {
        const restoredId = forgotModal.identifier;
        closeForgotModal();
        setEmail(restoredId);
        setPassword('');
      }, 1500);
    } catch {
      setForgotModal((prev) => ({ ...prev, loading: false, error: 'Network error resetting password' }));
    }
  };

  const closeForgotModal = () => {
    setForgotModal({
      open: false, step: 1,
      identifier: '', email: '', otp: '',
      newPassword: '', confirmPassword: '',
      showNewPassword: false, showConfirmPassword: false,
      resetToken: '', loading: false, emailError: '',
      error: '', successMsg: '', otpSuccessMsg: '', lockoutSeconds: 0,
    });
  };

  // Sign-in button is disabled until captcha is loaded and answer is typed
  const signInDisabled = loading || lockoutSeconds > 0 || !captchaId || captchaAnswer.trim() === '';

  return (
    <div
      style={{
        minHeight: '100vh', width: '100vw',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--inst-paper)',
        backgroundImage: 'radial-gradient(circle at 15% 10%, rgba(21,42,74,0.05), transparent 40%), radial-gradient(circle at 85% 90%, rgba(173,127,46,0.07), transparent 40%)',
        padding: '1.5rem',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── Login Card ── */}
      <div
        style={{
          width: '100%', maxWidth: '408px',
          background: 'var(--inst-surface)',
          borderRadius: 'var(--inst-radius-lg)',
          padding: '2.5rem 2.25rem',
          boxShadow: 'var(--inst-shadow)',
          border: '1px solid var(--inst-border)',
          borderTop: '3px solid var(--inst-ink)',
          position: 'relative',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px',
            borderRadius: 'var(--inst-radius)', background: 'var(--inst-ink-tint)',
            border: '1px solid var(--inst-border)', marginBottom: '1.125rem',
          }}>
            <img src={logo} alt="CGC Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600,
            color: 'var(--inst-ink)', letterSpacing: '-0.01em', margin: '0 0 0.3rem 0',
          }}>
            ERP Portal
          </h1>
          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--inst-muted)', margin: 0 }}>
            City Group of Colleges
          </p>
        </div>

        {/* Error Alert */}
        {error && lockoutSeconds === 0 && (
          <div style={{
            marginBottom: '1.25rem', padding: '0.75rem 1rem',
            background: 'var(--inst-danger-tint)', borderRadius: 'var(--inst-radius-sm)',
            border: '1px solid rgba(156, 59, 50, 0.25)',
            display: 'flex', alignItems: 'center', gap: '0.625rem',
          }}>
            <AlertCircle size={17} style={{ color: 'var(--inst-danger)', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--inst-danger)', fontWeight: 500, margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Email / ID */}
          <div>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: 600,
              color: 'var(--inst-muted)', marginBottom: '0.4rem',
            }}>
              Email / ID
            </label>
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Mail size={17} style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', zIndex: 2, color: 'var(--inst-muted)', flexShrink: 0,
              }} />
              <input
                type="text"
                placeholder="Email, Roll No, or Teacher ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', paddingTop: '0.75rem', paddingBottom: '0.75rem',
                  paddingRight: '1rem', paddingLeft: '42px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'var(--inst-surface)',
                  border: '1px solid var(--inst-border-strong)',
                  color: 'var(--inst-text)', fontSize: '0.875rem', fontWeight: 500,
                  outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--inst-ink)'; e.target.style.boxShadow = '0 0 0 3px rgba(21, 42, 74, 0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--inst-border-strong)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            {/* Label row — Forgot password ALWAYS visible */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '0.4rem', flexWrap: 'nowrap', gap: '0.5rem',
            }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', whiteSpace: 'nowrap' }}>
                Password
              </label>
              {/* Forgot password link — always rendered, no isAdminLoginAttempt condition */}
              <button
                type="button"
                onClick={() => {
                  setForgotModal({
                    open: true, step: 1,
                    identifier: email.trim(), email: '',
                    otp: '', newPassword: '', confirmPassword: '',
                    showNewPassword: false, showConfirmPassword: false,
                    resetToken: '', loading: false, emailError: '',
                    error: '', successMsg: '', otpSuccessMsg: '', lockoutSeconds: 0,
                  });
                }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'var(--inst-gold)', fontSize: '0.75rem', fontWeight: 600,
                  cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Forgot password?
              </button>
            </div>

            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Lock size={17} style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', zIndex: 2, color: 'var(--inst-muted)', flexShrink: 0,
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', paddingTop: '0.75rem', paddingBottom: '0.75rem',
                  paddingRight: '44px', paddingLeft: '42px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'var(--inst-surface)',
                  border: '1px solid var(--inst-border-strong)',
                  color: 'var(--inst-text)', fontSize: '0.875rem', fontWeight: 500,
                  outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--inst-ink)'; e.target.style.boxShadow = '0 0 0 3px rgba(21, 42, 74, 0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--inst-border-strong)'; e.target.style.boxShadow = 'none'; }}
              />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
          </div>

          {/* CAPTCHA block — between Password and Sign In */}
          <div>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: 600,
              color: 'var(--inst-muted)', marginBottom: '0.4rem',
            }}>
              Security Check
            </label>
            <CaptchaBlock
              ref={captchaRef}
              captchaId={captchaId}
              setCaptchaId={setCaptchaId}
              captchaAnswer={captchaAnswer}
              setCaptchaAnswer={setCaptchaAnswer}
            />
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={signInDisabled}
            style={{
              marginTop: '0.25rem', width: '100%', padding: '0.8125rem',
              borderRadius: 'var(--inst-radius-sm)', border: 'none',
              background: lockoutSeconds > 0 ? '#9AA0AC' : 'var(--inst-ink)',
              color: '#FFFFFF', fontWeight: 600, fontSize: '0.875rem',
              cursor: signInDisabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.625rem',
              transition: 'background 0.15s ease',
              opacity: signInDisabled ? 0.72 : 1,
            }}
            onMouseEnter={(e) => { if (!signInDisabled) e.currentTarget.style.background = 'var(--inst-ink-700)'; }}
            onMouseLeave={(e) => { if (!signInDisabled) e.currentTarget.style.background = 'var(--inst-ink)'; }}
          >
            {loading ? (
              <span>Signing in…</span>
            ) : lockoutSeconds > 0 ? (
              <><Lock size={16} /><span>Locked ({lockoutSeconds}s)</span></>
            ) : (
              <><LogIn size={16} /><span>Sign In</span></>
            )}
          </button>

          {/* Lockout warning */}
          {lockoutSeconds > 0 && (
            <div style={{
              marginTop: '0.25rem', padding: '0.75rem 1rem',
              background: 'var(--inst-danger-tint)', borderRadius: 'var(--inst-radius-sm)',
              border: '1px solid rgba(156, 59, 50, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
            }}>
              <AlertCircle size={17} style={{ color: 'var(--inst-danger)', flexShrink: 0 }} />
              <p style={{
                fontSize: '0.8125rem', color: 'var(--inst-danger)', fontWeight: 500,
                margin: 0, textAlign: 'center',
              }}>
                Too many attempts. Try again in {lockoutSeconds} {lockoutSeconds === 1 ? 'second' : 'seconds'}
              </p>
            </div>
          )}
        </form>

        <p style={{
          textAlign: 'center', fontSize: '0.75rem', fontWeight: 400,
          color: 'var(--inst-muted)', marginTop: '1.75rem', marginBottom: 0,
        }}>
          City Group of Colleges · Secure ERP Portal
        </p>
      </div>

      {/* ── Forgot Password Modal ── */}
      {forgotModal.open && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(21, 42, 74, 0.45)',
          zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '420px',
            background: 'var(--inst-surface)',
            borderRadius: 'var(--inst-radius-lg)',
            padding: '1.875rem 1.75rem',
            border: '1px solid var(--inst-border)',
            boxShadow: '0 24px 48px -12px rgba(21, 42, 74, 0.35)',
            position: 'relative', fontFamily: 'var(--font-body)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'var(--inst-ink-tint)', color: 'var(--inst-ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--inst-border)',
                }}>
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 600, color: 'var(--inst-ink)' }}>
                    {forgotModal.step === 1 ? 'Reset Password' : forgotModal.step === 2 ? 'Verify OTP' : 'Set New Password'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500, color: 'var(--inst-muted)' }}>
                    {forgotModal.step === 1 ? 'Step 1 of 3 — Request OTP' : forgotModal.step === 2 ? 'Step 2 of 3 — Enter OTP' : 'Step 3 of 3 — New password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--inst-muted)', padding: '4px', borderRadius: 'var(--inst-radius-sm)' }}
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Error */}
            {forgotModal.error && (
              <div style={{
                marginBottom: '1rem', padding: '0.75rem',
                background: 'var(--inst-danger-tint)', borderRadius: 'var(--inst-radius-sm)',
                border: '1px solid rgba(156, 59, 50, 0.25)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: 'var(--inst-danger)', fontSize: '0.8125rem', fontWeight: 500,
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{forgotModal.error}</span>
              </div>
            )}

            {/* Modal Success */}
            {forgotModal.successMsg && (
              <div style={{
                marginBottom: '1rem', padding: '0.75rem',
                background: 'var(--inst-success-tint)', borderRadius: 'var(--inst-radius-sm)',
                border: '1px solid rgba(63, 122, 82, 0.25)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: 'var(--inst-success)', fontSize: '0.8125rem', fontWeight: 500,
              }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{forgotModal.successMsg}</span>
              </div>
            )}

            {/* STEP 1: Request OTP */}
            {forgotModal.step === 1 && (
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', marginBottom: '0.35rem' }}>
                    ID / Roll Number (Student) or Teacher ID <span style={{ color: 'var(--inst-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Roll Number, Temp Roll No, or Teacher ID"
                    value={forgotModal.identifier}
                    onChange={(e) => setForgotModal({ ...forgotModal, identifier: e.target.value, error: '' })}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)', border: '1px solid var(--inst-border-strong)',
                      color: 'var(--inst-text)', fontSize: '0.875rem', fontWeight: 600,
                      outline: 'none', boxShadow: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', marginBottom: '0.35rem' }}>
                    Registered Email ID <span style={{ color: 'var(--inst-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="email"
                      required
                      placeholder="Enter your registered email address"
                      value={forgotModal.email}
                      onChange={(e) => setForgotModal({ ...forgotModal, email: e.target.value, emailError: '', error: '' })}
                      style={{
                        width: '100%', padding: '0.75rem 1rem',
                        borderRadius: 'var(--inst-radius-sm)',
                        background: 'var(--inst-surface)',
                        border: forgotModal.emailError ? '1px solid var(--inst-danger)' : '1px solid var(--inst-border-strong)',
                        color: 'var(--inst-text)', fontSize: '0.875rem', fontWeight: 600,
                        outline: 'none', boxShadow: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {forgotModal.emailError ? (
                    <p style={{ color: 'var(--inst-danger)', fontSize: '0.75rem', fontWeight: 700, margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /><span>{forgotModal.emailError}</span>
                    </p>
                  ) : (
                    <p style={{ color: 'var(--inst-muted)', fontSize: '0.75rem', fontWeight: 400, margin: '0.35rem 0 0 0' }}>
                      Must match the registered email for this account.
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={forgotModal.loading || forgotModal.lockoutSeconds > 0}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: 'var(--inst-radius-sm)',
                      border: 'none', background: 'var(--inst-ink)', color: '#FFF',
                      fontSize: '0.875rem', fontWeight: 600,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: 'none', opacity: forgotModal.loading ? 0.7 : 1,
                    }}
                  >
                    {forgotModal.loading ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)', color: 'var(--inst-muted)',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      border: '1px solid var(--inst-border-strong)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {forgotModal.step === 2 && (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {forgotModal.otpSuccessMsg && (
                  <div style={{
                    padding: '0.75rem', background: 'var(--inst-success-tint)',
                    border: '1px solid rgba(63, 122, 82, 0.25)',
                    borderRadius: 'var(--inst-radius-sm)',
                    color: 'var(--inst-success)', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4,
                  }}>
                    {forgotModal.otpSuccessMsg}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', marginBottom: '0.35rem' }}>
                    Enter 6-Digit OTP <span style={{ color: 'var(--inst-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="Enter 6-digit OTP"
                    value={forgotModal.otp}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setForgotModal({ ...forgotModal, otp: digits, error: '' });
                    }}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)', border: '1px solid var(--inst-border-strong)',
                      color: 'var(--inst-text)', fontSize: '1.25rem', fontWeight: 800,
                      letterSpacing: '0.3em', textAlign: 'center',
                      outline: 'none', boxShadow: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ color: 'var(--inst-muted)', fontSize: '0.75rem', fontWeight: 400, margin: '0.35rem 0 0 0', textAlign: 'center' }}>
                    OTP is valid for 5 minutes (max 5 attempts).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={forgotModal.loading || forgotModal.otp.length !== 6}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: 'var(--inst-radius-sm)',
                      border: 'none', background: 'var(--inst-ink)', color: '#FFF',
                      fontSize: '0.875rem', fontWeight: 600,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: 'none', opacity: (forgotModal.loading || forgotModal.otp.length !== 6) ? 0.6 : 1,
                    }}
                  >
                    {forgotModal.loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotModal((prev) => ({ ...prev, step: 1, error: '', otp: '' }))}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)', color: 'var(--inst-muted)',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      border: '1px solid var(--inst-border-strong)',
                    }}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {forgotModal.step === 3 && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', marginBottom: '0.35rem' }}>
                    New Password <span style={{ color: 'var(--inst-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={forgotModal.showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="Min. 8 characters"
                      value={forgotModal.newPassword}
                      onChange={(e) => setForgotModal({ ...forgotModal, newPassword: e.target.value, error: '' })}
                      style={{
                        width: '100%', padding: '0.75rem 44px 0.75rem 1rem',
                        borderRadius: 'var(--inst-radius-sm)',
                        background: 'var(--inst-surface)', border: '1px solid var(--inst-border-strong)',
                        color: 'var(--inst-text)', fontSize: '0.875rem', fontWeight: 600,
                        outline: 'none', boxShadow: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <EyeToggle
                      show={forgotModal.showNewPassword}
                      onToggle={() => setForgotModal((prev) => ({ ...prev, showNewPassword: !prev.showNewPassword }))}
                    />
                  </div>
                  <p style={{ color: 'var(--inst-muted)', fontSize: '0.75rem', fontWeight: 400, margin: '0.35rem 0 0 0' }}>
                    Minimum 8 characters required.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', marginBottom: '0.35rem' }}>
                    Confirm New Password <span style={{ color: 'var(--inst-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={forgotModal.showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={forgotModal.confirmPassword}
                      onChange={(e) => setForgotModal({ ...forgotModal, confirmPassword: e.target.value, error: '' })}
                      style={{
                        width: '100%', padding: '0.75rem 44px 0.75rem 1rem',
                        borderRadius: 'var(--inst-radius-sm)',
                        background: 'var(--inst-surface)', border: '1px solid var(--inst-border-strong)',
                        color: 'var(--inst-text)', fontSize: '0.875rem', fontWeight: 600,
                        outline: 'none', boxShadow: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <EyeToggle
                      show={forgotModal.showConfirmPassword}
                      onToggle={() => setForgotModal((prev) => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={forgotModal.loading || !!forgotModal.successMsg}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: 'var(--inst-radius-sm)',
                      border: 'none', background: 'var(--inst-ink)', color: '#FFF',
                      fontSize: '0.875rem', fontWeight: 600,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: 'none', opacity: forgotModal.loading ? 0.7 : 1,
                    }}
                  >
                    {forgotModal.loading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)', color: 'var(--inst-muted)',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      border: '1px solid var(--inst-border-strong)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
