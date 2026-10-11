import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle, CheckCircle, Key, Smartphone, ArrowRight, X, ShieldAlert } from 'lucide-react';
import logo from '../assets/logo.png';

const API_BASE = 'https://college-erp-management-system-a9xk.onrender.com/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Forgot Password Modal State (Students & Teachers only)
  const [forgotModal, setForgotModal] = useState({
    open: false,
    step: 1, // 1: Request OTP, 2: Verify OTP, 3: Set New Password
    identifier: '',
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    resetToken: '',
    loading: false,
    emailError: '',
    error: '',
    successMsg: '',
    otpSuccessMsg: '',
    lockoutSeconds: 0
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  // Check for auto-logout message (e.g. signed in from another device)
  useEffect(() => {
    const sessionMsg = sessionStorage.getItem('session_invalidated_msg');
    if (sessionMsg) {
      setError(sessionMsg);
      sessionStorage.removeItem('session_invalidated_msg');
    }
  }, []);

  // Live countdown timer for login rate limit lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Live countdown timer for forgot password lockout
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

  // Unified Sign In Handler - Backend automatically determines role from record
  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setLoading(true);
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
      });

      const data = await res.json().catch(() => ({}));

      // Handle 429 Too Many Requests (Rate limit / lockout)
      if (res.status === 429) {
        const retryHeader = res.headers.get('Retry-After');
        const retrySeconds = data.retryAfter || (retryHeader ? parseInt(retryHeader, 10) : 60);
        setLockoutSeconds(retrySeconds);
        return;
      }

      if (!res.ok) {
        setError(data.message || "Login failed. Please check your credentials.");
        return;
      }

      setLockoutSeconds(0);
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

  // Forgot Password: Step 1 - Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const cleanId = forgotModal.identifier.trim();
    const cleanEmail = forgotModal.email.trim();

    if (!cleanId) {
      setForgotModal(prev => ({ ...prev, error: 'Please enter your ID, Roll Number, or Teacher ID' }));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setForgotModal(prev => ({ ...prev, emailError: 'Please enter a valid registered email address' }));
      return;
    }

    setForgotModal(prev => ({ ...prev, loading: true, error: '', emailError: '' }));

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, email: cleanEmail })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const retryHeader = res.headers.get('Retry-After');
        const retrySeconds = data.retryAfter || (retryHeader ? parseInt(retryHeader, 10) : 60);
        setForgotModal(prev => ({
          ...prev,
          loading: false,
          lockoutSeconds: retrySeconds,
          error: data.message || `Too many OTP requests. Please try again later.`
        }));
        return;
      }

      if (!res.ok) {
        setForgotModal(prev => ({
          ...prev,
          loading: false,
          error: data.message || 'Not found in database'
        }));
        return;
      }

      // Success: advance to Step 2
      setForgotModal(prev => ({
        ...prev,
        loading: false,
        step: 2,
        otpSuccessMsg: data.message || 'OTP sent successfully to your registered email.',
        error: ''
      }));
    } catch (err) {
      setForgotModal(prev => ({ ...prev, loading: false, error: 'Network error. Please try again.' }));
    }
  };

  // Forgot Password: Step 2 - Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = forgotModal.otp.trim();

    if (!cleanOtp || !/^[0-9]{6}$/.test(cleanOtp)) {
      setForgotModal(prev => ({ ...prev, error: 'Please enter a valid 6-digit OTP' }));
      return;
    }

    setForgotModal(prev => ({ ...prev, loading: true, error: '' }));

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotModal.identifier.trim(),
          email: forgotModal.email.trim(),
          otp: cleanOtp
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setForgotModal(prev => ({
          ...prev,
          loading: false,
          error: data.message || 'Too many attempts. This OTP has been invalidated. Please request a new OTP.'
        }));
        return;
      }

      if (!res.ok) {
        setForgotModal(prev => ({
          ...prev,
          loading: false,
          error: data.message || 'Incorrect or expired OTP'
        }));
        return;
      }

      // Step 2 Succeeded: Save reset token and move to Step 3
      setForgotModal(prev => ({
        ...prev,
        loading: false,
        step: 3,
        resetToken: data.resetToken,
        error: '',
        otpSuccessMsg: ''
      }));
    } catch (err) {
      setForgotModal(prev => ({ ...prev, loading: false, error: 'Network error verifying OTP' }));
    }
  };

  // Forgot Password: Step 3 - Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword, resetToken } = forgotModal;

    if (!newPassword || newPassword.length < 8) {
      setForgotModal(prev => ({ ...prev, error: 'New password must be at least 8 characters long' }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotModal(prev => ({ ...prev, error: 'Passwords do not match' }));
      return;
    }

    setForgotModal(prev => ({ ...prev, loading: true, error: '' }));

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setForgotModal(prev => ({
          ...prev,
          loading: false,
          error: data.message || 'Failed to reset password. Please start over.'
        }));
        return;
      }

      setForgotModal(prev => ({
        ...prev,
        loading: false,
        successMsg: data.message || 'Password reset successfully!'
      }));

      // Close modal after 1.5 seconds and fill login email
      setTimeout(() => {
        const restoredId = forgotModal.identifier;
        closeForgotModal();
        setEmail(restoredId);
        setPassword('');
      }, 1500);

    } catch (err) {
      setForgotModal(prev => ({ ...prev, loading: false, error: 'Network error resetting password' }));
    }
  };

  const closeForgotModal = () => {
    setForgotModal({
      open: false,
      step: 1,
      identifier: '',
      email: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
      resetToken: '',
      loading: false,
      emailError: '',
      error: '',
      successMsg: '',
      otpSuccessMsg: '',
      lockoutSeconds: 0
    });
  };

  // Check if current user is typing an admin username/email
  const isAdminLoginAttempt = email.trim().toLowerCase().includes('admin');

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--inst-paper)',
        backgroundImage: 'radial-gradient(circle at 15% 10%, rgba(21,42,74,0.05), transparent 40%), radial-gradient(circle at 85% 90%, rgba(173,127,46,0.07), transparent 40%)',
        padding: '1.5rem',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '408px',
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
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: 'var(--inst-radius)',
            background: 'var(--inst-ink-tint)',
            border: '1px solid var(--inst-border)',
            marginBottom: '1.125rem',
          }}>
            <img
              src={logo}
              alt="CGC Logo"
              style={{ width: '42px', height: '42px', objectFit: 'contain' }}
            />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--inst-ink)',
            letterSpacing: '-0.01em',
            margin: '0 0 0.3rem 0',
          }}>
            ERP Portal
          </h1>
          <p style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--inst-muted)',
            margin: 0,
          }}>
            City Group of Colleges
          </p>
        </div>

        {/* Error Alert Card */}
        {error && lockoutSeconds === 0 && (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            background: 'var(--inst-danger-tint)',
            borderRadius: 'var(--inst-radius-sm)',
            border: '1px solid rgba(156, 59, 50, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}>
            <AlertCircle size={17} style={{ color: 'var(--inst-danger)', flexShrink: 0 }} />
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--inst-danger)',
              fontWeight: 500,
              margin: 0,
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Clean Login Form (No Role Toggle) */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--inst-muted)',
              marginBottom: '0.4rem',
            }}>
              Email / ID
            </label>
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Mail
                size={17}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 2,
                  color: 'var(--inst-muted)',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                placeholder="Email, Roll No, or Teacher ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  paddingRight: '1rem',
                  paddingLeft: '42px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'var(--inst-surface)',
                  border: '1px solid var(--inst-border-strong)',
                  color: 'var(--inst-text)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
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
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--inst-muted)',
              }}>
                Password
              </label>

              {/* Forgot Password Link - Only for Student and Teacher (Hidden for Admin) */}
              {!isAdminLoginAttempt && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotModal({
                      open: true,
                      step: 1,
                      identifier: email.trim(),
                      email: '',
                      otp: '',
                      newPassword: '',
                      confirmPassword: '',
                      resetToken: '',
                      loading: false,
                      emailError: '',
                      error: '',
                      successMsg: '',
                      otpSuccessMsg: '',
                      lockoutSeconds: 0
                    });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--inst-gold)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  Forgot password?
                </button>
              )}
            </div>

            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={17}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 2,
                  color: 'var(--inst-muted)',
                  flexShrink: 0,
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  paddingRight: '1rem',
                  paddingLeft: '42px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'var(--inst-surface)',
                  border: '1px solid var(--inst-border-strong)',
                  color: 'var(--inst-text)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
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
            </div>
          </div>

          {/* Primary Sign In Button */}
          <button
            type="submit"
            disabled={loading || lockoutSeconds > 0}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.8125rem',
              borderRadius: 'var(--inst-radius-sm)',
              border: 'none',
              background: lockoutSeconds > 0 ? '#9AA0AC' : 'var(--inst-ink)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: (loading || lockoutSeconds > 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              transition: 'background 0.15s ease',
              opacity: (loading || lockoutSeconds > 0) ? 0.8 : 1,
            }}
            onMouseEnter={(e) => { if (!loading && lockoutSeconds === 0) e.currentTarget.style.background = 'var(--inst-ink-700)'; }}
            onMouseLeave={(e) => { if (!loading && lockoutSeconds === 0) e.currentTarget.style.background = 'var(--inst-ink)'; }}
          >
            {loading ? (
              <span>Signing in…</span>
            ) : lockoutSeconds > 0 ? (
              <>
                <Lock size={16} />
                <span>Locked ({lockoutSeconds}s)</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* Live Lockout Warning Card Under Sign In Button */}
          {lockoutSeconds > 0 && (
            <div
              style={{
                marginTop: '0.25rem',
                padding: '0.75rem 1rem',
                background: 'var(--inst-danger-tint)',
                borderRadius: 'var(--inst-radius-sm)',
                border: '1px solid rgba(156, 59, 50, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
              }}
            >
              <AlertCircle size={17} style={{ color: 'var(--inst-danger)', flexShrink: 0 }} />
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--inst-danger)',
                  fontWeight: 500,
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Too many attempts. Try again in {lockoutSeconds} {lockoutSeconds === 1 ? 'second' : 'seconds'}
              </p>
            </div>
          )}
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          fontWeight: 400,
          color: 'var(--inst-muted)',
          marginTop: '1.75rem',
          marginBottom: 0,
        }}>
          City Group of Colleges · Secure ERP Portal
        </p>
      </div>

      {/* Forgot Password Modal (Student & Teacher Only) */}
      {forgotModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(21, 42, 74, 0.45)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            background: 'var(--inst-surface)',
            borderRadius: 'var(--inst-radius-lg)',
            padding: '1.875rem 1.75rem',
            border: '1px solid var(--inst-border)',
            boxShadow: '0 24px 48px -12px rgba(21, 42, 74, 0.35)',
            position: 'relative',
            fontFamily: 'var(--font-body)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'var(--inst-ink-tint)',
                  color: 'var(--inst-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--inst-border)'
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
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--inst-muted)',
                  padding: '4px',
                  borderRadius: 'var(--inst-radius-sm)'
                }}
              >
                <X size={19} />
              </button>
            </div>

            {/* Error Message */}
            {forgotModal.error && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'var(--inst-danger-tint)',
                borderRadius: 'var(--inst-radius-sm)',
                border: '1px solid rgba(156, 59, 50, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--inst-danger)',
                fontSize: '0.8125rem',
                fontWeight: 500
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{forgotModal.error}</span>
              </div>
            )}

            {/* Success Message */}
            {forgotModal.successMsg && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'var(--inst-success-tint)',
                borderRadius: 'var(--inst-radius-sm)',
                border: '1px solid rgba(63, 122, 82, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--inst-success)',
                fontSize: '0.8125rem',
                fontWeight: 500
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
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)',
                      border: '1px solid var(--inst-border-strong)',
                      color: 'var(--inst-text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'none',
                      boxSizing: 'border-box'
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
                      onChange={(e) => {
                        setForgotModal({ ...forgotModal, email: e.target.value, emailError: '', error: '' });
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--inst-radius-sm)',
                        background: 'var(--inst-surface)',
                        border: forgotModal.emailError ? '1px solid var(--inst-danger)' : '1px solid var(--inst-border-strong)',
                        color: 'var(--inst-text)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxShadow: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {forgotModal.emailError ? (
                    <p style={{ color: 'var(--inst-danger)', fontSize: '0.75rem', fontWeight: 700, margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} />
                      <span>{forgotModal.emailError}</span>
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
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      border: 'none',
                      background: 'var(--inst-ink)',
                      color: '#FFF',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: 'none',
                      opacity: forgotModal.loading ? 0.7 : 1
                    }}
                  >
                    {forgotModal.loading ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      border: 'none',
                      background: 'var(--inst-surface)',
                      color: 'var(--inst-muted)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--inst-border-strong)'
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
                    padding: '0.75rem',
                    background: 'var(--inst-success-tint)',
                    border: '1px solid rgba(63, 122, 82, 0.25)',
                    borderRadius: 'var(--inst-radius-sm)',
                    color: 'var(--inst-success)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    lineHeight: 1.4
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
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)',
                      border: '1px solid var(--inst-border-strong)',
                      color: 'var(--inst-text)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      outline: 'none',
                      boxShadow: 'none',
                      boxSizing: 'border-box'
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
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      border: 'none',
                      background: 'var(--inst-ink)',
                      color: '#FFF',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: 'none',
                      opacity: (forgotModal.loading || forgotModal.otp.length !== 6) ? 0.6 : 1
                    }}
                  >
                    {forgotModal.loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotModal(prev => ({ ...prev, step: 1, error: '', otp: '' }))}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      border: 'none',
                      background: 'var(--inst-surface)',
                      color: 'var(--inst-muted)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--inst-border-strong)'
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
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', marginBottom: '0.35rem' }}>
                    New Password <span style={{ color: 'var(--inst-danger)' }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Min. 8 characters"
                    value={forgotModal.newPassword}
                    onChange={(e) => setForgotModal({ ...forgotModal, newPassword: e.target.value, error: '' })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)',
                      border: '1px solid var(--inst-border-strong)',
                      color: 'var(--inst-text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ color: 'var(--inst-muted)', fontSize: '0.75rem', fontWeight: 400, margin: '0.35rem 0 0 0' }}>
                    Minimum 8 characters required.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--inst-muted)', marginBottom: '0.35rem' }}>
                    Confirm New Password <span style={{ color: 'var(--inst-danger)' }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={forgotModal.confirmPassword}
                    onChange={(e) => setForgotModal({ ...forgotModal, confirmPassword: e.target.value, error: '' })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      background: 'var(--inst-surface)',
                      border: '1px solid var(--inst-border-strong)',
                      color: 'var(--inst-text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={forgotModal.loading || !!forgotModal.successMsg}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      border: 'none',
                      background: 'var(--inst-ink)',
                      color: '#FFF',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: 'none',
                      opacity: forgotModal.loading ? 0.7 : 1
                    }}
                  >
                    {forgotModal.loading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--inst-radius-sm)',
                      border: 'none',
                      background: 'var(--inst-surface)',
                      color: 'var(--inst-muted)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--inst-border-strong)'
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
