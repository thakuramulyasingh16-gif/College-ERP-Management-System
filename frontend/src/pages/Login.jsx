import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle, Shield, UserCheck, GraduationCap } from 'lucide-react';
import logo from '../assets/logo.png';

const ROLE_TABS = [
  { id: 'admin', label: 'Admin', placeholder:'Admin Id', icon: Shield },
  { id: 'teacher', label: 'Teacher', placeholder:'Teacher Id', icon: UserCheck },
  { id: 'student', label: 'Student', placeholder:'Student Id', icon: GraduationCap },
];

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Check for auto-logout message (e.g. signed in from another device)
  React.useEffect(() => {
    const sessionMsg = sessionStorage.getItem('session_invalidated_msg');
    if (sessionMsg) {
      setError(sessionMsg);
      sessionStorage.removeItem('session_invalidated_msg');
    }
  }, []);

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

  const handleRoleSelect = (roleTab) => {
    setSelectedRole(roleTab.id);
    if (!email || ROLE_TABS.some(t => t.placeholder === email)) {
      setEmail(roleTab.placeholder);
    }
  };

  const currentTab = ROLE_TABS.find(t => t.id === selectedRole) || ROLE_TABS[0];

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
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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

          {/* Role-Toggle Pills in Pressed Inset Track */}
          <div style={{
            marginTop: '1.25rem',
            background: '#E5EBF6',
            boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.7)',
            borderRadius: '9999px',
            padding: '4px',
            display: 'flex',
            gap: '4px',
          }}>
            {ROLE_TABS.map((tab) => {
              const isActive = selectedRole === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleRoleSelect(tab)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'var(--clay-surface)' : 'transparent',
                    color: isActive ? 'var(--clay-primary)' : 'var(--clay-muted)',
                    boxShadow: isActive
                      ? '4px 4px 8px rgba(163, 177, 198, 0.5), -4px -4px 8px rgba(255, 255, 255, 0.9)'
                      : 'none',
                  }}
                >
                  <IconComp size={14} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert Card */}
        {error && (
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

        {/* Login Form */}
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
              {currentTab.label} Email ID
            </label>
            {/* Relative-positioned container for input + leading icon */}
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
                type="email"
                placeholder={currentTab.placeholder}
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
            <label style={{
              display: 'block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--clay-muted)',
              marginBottom: '0.5rem',
            }}>
              Password
            </label>
            {/* Relative-positioned container for input + leading icon */}
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

          {/* Primary Clay Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.875rem',
              borderRadius: '18px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--clay-primary) 0%, var(--clay-primary-hover) 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.02em',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '6px 6px 14px rgba(99, 102, 241, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.8), inset 1px 1px 2px rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '8px 8px 18px rgba(99, 102, 241, 0.45), -6px -6px 14px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '6px 6px 14px rgba(99, 102, 241, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.8), inset 1px 1px 2px rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            onMouseDown={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '8px 8px 18px rgba(99, 102, 241, 0.45), -6px -6px 14px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <LogIn size={18} strokeWidth={2.5} />
                <span>Sign In as {currentTab.label}</span>
              </>
            )}
          </button>
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
    </div>
  );
};

export default Login;
