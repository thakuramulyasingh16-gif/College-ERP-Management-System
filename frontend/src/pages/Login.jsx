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
    mobile: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    resetToken: '',
    loading: false,
    mobileError: '',
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
    const cleanMobile = forgotModal.mobile.trim();

    if (!cleanId) {
      setForgotModal(prev => ({ ...prev, error: 'Please enter your Email or ID' }));
      return;
    }

    // STRICT: Mobile number MUST enforce exactly 10 digits, numeric only
    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      setForgotModal(prev => ({ ...prev, mobileError: 'Mobile number must be exactly 10 digits' }));
      return;
    }

    setForgotModal(prev => ({ ...prev, loading: true, error: '', mobileError: '' }));

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, mobile: cleanMobile })
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

      // Backend returns 200 with generic non-enumerable message
      setForgotModal(prev => ({
        ...prev,
        loading: false,
        step: 2,
        otpSuccessMsg: data.message || 'If these details are correct, an OTP has been sent to your registered mobile number.',
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
        body: JSON.stringify({ identifier: forgotModal.identifier.trim(), otp: cleanOtp })
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
      mobile: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
      resetToken: '',
      loading: false,
      mobileError: '',
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
        background: 'linear-gradient(135deg, #E8ECFF 0%, #F5F3FF 100%)',
        padding: '1.5rem',
      }}
    >
      {/* Claymorphism Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'var(--clay-surface)',
          borderRadius: '28px',
          padding: '2.5rem 2.25rem',
          boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.8)',
          border: 'none',
          position: 'relative',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* Logo inside soft rounded clay container */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '22px',
            background: 'var(--clay-surface)',
            boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.55), -6px -6px 12px rgba(255, 255, 255, 0.85)',
            border: 'none',
            marginBottom: '1rem',
          }}>
            <img
              src={logo}
              alt="CGC Logo"
              style={{ width: '48px', height: '48px', objectFit: 'contain' }}
            />
          </div>

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: 'var(--clay-text)',
            letterSpacing: '-0.02em',
            margin: '0 0 0.25rem 0',
          }}>
            CGC ERP Portal
          </h1>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--clay-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
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
            background: '#FEF2F2',
            boxShadow: 'inset 3px 3px 6px rgba(239, 68, 68, 0.2), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
            borderRadius: '16px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}>
            <AlertCircle size={17} style={{ color: 'var(--clay-danger)', flexShrink: 0 }} />
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--clay-danger)',
              fontWeight: 600,
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
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--clay-muted)',
              marginBottom: '0.5rem',
            }}>
              Email / ID
            </label>
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Mail
                size={20}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 2,
                  width: '20px',
                  height: '20px',
                  color: 'var(--clay-primary)',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                placeholder="Enter Email, Roll No, or Teacher ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  paddingTop: '0.8125rem',
                  paddingBottom: '0.8125rem',
                  paddingRight: '1rem',
                  paddingLeft: '48px',
                  borderRadius: '18px',
                  background: 'var(--clay-surface-inset)',
                  border: 'none',
                  color: 'var(--clay-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.background = '#F4F7FD';
                  e.target.style.boxShadow = 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.7), 0 0 0 2px rgba(99, 102, 241, 0.35)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--clay-surface-inset)';
                  e.target.style.boxShadow = 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.7)';
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--clay-muted)',
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
                      mobile: '',
                      otp: '',
                      newPassword: '',
                      confirmPassword: '',
                      resetToken: '',
                      loading: false,
                      mobileError: '',
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
                    color: 'var(--clay-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={20}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 2,
                  width: '20px',
                  height: '20px',
                  color: 'var(--clay-primary)',
                  flexShrink: 0,
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
                  paddingTop: '0.8125rem',
                  paddingBottom: '0.8125rem',
                  paddingRight: '1rem',
                  paddingLeft: '48px',
                  borderRadius: '18px',
                  background: 'var(--clay-surface-inset)',
                  border: 'none',
                  color: 'var(--clay-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.7)',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.background = '#F4F7FD';
                  e.target.style.boxShadow = 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.7), 0 0 0 2px rgba(99, 102, 241, 0.35)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--clay-surface-inset)';
                  e.target.style.boxShadow = 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.7)';
                }}
              />
            </div>
          </div>

          {/* Primary Clay Sign In Button */}
          <button
            type="submit"
            disabled={loading || lockoutSeconds > 0}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.875rem',
              borderRadius: '18px',
              border: 'none',
              background: lockoutSeconds > 0
                ? '#94A3B8'
                : 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-primary-hover) 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.02em',
              cursor: (loading || lockoutSeconds > 0) ? 'not-allowed' : 'pointer',
              boxShadow: lockoutSeconds > 0
                ? 'inset 2px 2px 4px rgba(0, 0, 0, 0.2), inset -2px -2px 4px rgba(255, 255, 255, 0.5)'
                : '6px 6px 14px rgba(99, 102, 241, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.8), inset 1px 1px 2px rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              transition: 'all 0.2s ease',
              opacity: (loading || lockoutSeconds > 0) ? 0.75 : 1,
            }}
          >
            {loading ? (
              <span>Signing In...</span>
            ) : lockoutSeconds > 0 ? (
              <>
                <Lock size={18} strokeWidth={2.5} />
                <span>Locked ({lockoutSeconds}s)</span>
              </>
            ) : (
              <>
                <LogIn size={18} strokeWidth={2.5} />
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
                background: '#FEF2F2',
                boxShadow: 'inset 3px 3px 6px rgba(239, 68, 68, 0.2), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
                borderRadius: '16px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
              }}
            >
              <AlertCircle size={17} style={{ color: 'var(--clay-danger)', flexShrink: 0 }} />
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--clay-danger)',
                  fontWeight: 600,
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
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: 'var(--clay-muted)',
          marginTop: '1.75rem',
          marginBottom: 0,
          letterSpacing: '0.04em',
        }}>
          City Group of Colleges  Secure ERP Portal
        </p>
      </div>

      {/* Forgot Password Modal (Student & Teacher Only) */}
      {forgotModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '430px',
            background: 'var(--clay-surface)',
            borderRadius: '28px',
            padding: '2rem 1.75rem',
            boxShadow: '10px 10px 20px rgba(0, 0, 0, 0.2), -6px -6px 14px rgba(255, 255, 255, 0.8)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: '#EEF2FF',
                  color: 'var(--clay-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)'
                }}>
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900, color: 'var(--clay-text)' }}>
                    {forgotModal.step === 1 ? 'Reset Password' : forgotModal.step === 2 ? 'Verify OTP' : 'Set New Password'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--clay-muted)' }}>
                    {forgotModal.step === 1 ? 'Step 1 of 3: Request OTP' : forgotModal.step === 2 ? 'Step 2 of 3: Enter OTP' : 'Step 3 of 3: New Password'}
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
                  color: 'var(--clay-muted)',
                  padding: '4px',
                  borderRadius: '10px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {forgotModal.error && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#FEF2F2',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--clay-danger)',
                fontSize: '0.8125rem',
                fontWeight: 600
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
                background: '#ECFDF5',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#059669',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{forgotModal.successMsg}</span>
              </div>
            )}

            {/* STEP 1: Request OTP */}
            {forgotModal.step === 1 && (
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clay-muted)', marginBottom: '0.35rem' }}>
                    Email ID or Identifier <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. roll number, teacher ID, or email"
                    value={forgotModal.identifier}
                    onChange={(e) => setForgotModal({ ...forgotModal, identifier: e.target.value, error: '' })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '14px',
                      background: 'var(--clay-surface-inset)',
                      border: 'none',
                      color: 'var(--clay-text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.5), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clay-muted)', marginBottom: '0.35rem' }}>
                    Registered Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      value={forgotModal.mobile}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setForgotModal({ ...forgotModal, mobile: digitsOnly, mobileError: '', error: '' });
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '14px',
                        background: 'var(--clay-surface-inset)',
                        border: forgotModal.mobileError ? '1px solid #EF4444' : 'none',
                        color: 'var(--clay-text)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.5), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {forgotModal.mobileError ? (
                    <p style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 700, margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} />
                      <span>{forgotModal.mobileError}</span>
                    </p>
                  ) : (
                    <p style={{ color: 'var(--clay-muted)', fontSize: '0.6875rem', fontWeight: 500, margin: '0.25rem 0 0 0' }}>
                      Must be exactly 10 digits as registered on your account.
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
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-primary-hover) 100%)',
                      color: '#FFF',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: '4px 4px 10px rgba(99, 102, 241, 0.35)',
                      opacity: forgotModal.loading ? 0.7 : 1
                    }}
                  >
                    {forgotModal.loading ? 'Sending OTP...' : 'Send OTP via SMS'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'var(--clay-surface)',
                      color: 'var(--clay-muted)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.8)'
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
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '14px',
                    color: '#15803D',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    lineHeight: 1.4
                  }}>
                    {forgotModal.otpSuccessMsg}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clay-muted)', marginBottom: '0.35rem' }}>
                    Enter 6-Digit OTP <span style={{ color: '#EF4444' }}>*</span>
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
                      borderRadius: '14px',
                      background: 'var(--clay-surface-inset)',
                      border: 'none',
                      color: 'var(--clay-text)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      outline: 'none',
                      boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.5), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ color: 'var(--clay-muted)', fontSize: '0.6875rem', fontWeight: 500, margin: '0.25rem 0 0 0', textAlign: 'center' }}>
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
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-primary-hover) 100%)',
                      color: '#FFF',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: '4px 4px 10px rgba(99, 102, 241, 0.35)',
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
                      borderRadius: '14px',
                      border: 'none',
                      background: 'var(--clay-surface)',
                      color: 'var(--clay-muted)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.8)'
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
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clay-muted)', marginBottom: '0.35rem' }}>
                    New Password <span style={{ color: '#EF4444' }}>*</span>
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
                      borderRadius: '14px',
                      background: 'var(--clay-surface-inset)',
                      border: 'none',
                      color: 'var(--clay-text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.5), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ color: 'var(--clay-muted)', fontSize: '0.6875rem', fontWeight: 500, margin: '0.25rem 0 0 0' }}>
                    Minimum 8 characters required.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--clay-muted)', marginBottom: '0.35rem' }}>
                    Confirm New Password <span style={{ color: '#EF4444' }}>*</span>
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
                      borderRadius: '14px',
                      background: 'var(--clay-surface-inset)',
                      border: 'none',
                      color: 'var(--clay-text)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.5), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
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
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-primary-hover) 100%)',
                      color: '#FFF',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: forgotModal.loading ? 'not-allowed' : 'pointer',
                      boxShadow: '4px 4px 10px rgba(99, 102, 241, 0.35)',
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
                      borderRadius: '14px',
                      border: 'none',
                      background: 'var(--clay-surface)',
                      color: 'var(--clay-muted)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.8)'
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
