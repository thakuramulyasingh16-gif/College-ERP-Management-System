import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminDashboard from '../components/AdminDashboard';
import TeacherDashboard from '../components/TeacherDashboard';
import StudentDashboard from '../components/StudentDashboard';
import Clock from '../components/Clock';
import { Menu, User, Plus, Calendar, BookOpen, GraduationCap } from 'lucide-react';

import api from '../api';
import logo from '../assets/logo.png';

// ── ROLE COLOR MAP ──────────────────────────────────────────
const roleConfig = {
  admin:   { label: 'Admin Access',   color: '#6C63FF', bg: 'rgba(108,99,255,0.12)' },
  teacher: { label: 'Teacher Access', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  student: { label: 'Student Access', color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 1024 : true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  console.log("Dashboard rendering, role:", user?.role, "activeTab:", activeTab);

  if (!user) {
    console.log("No user found in Dashboard, redirecting...");
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--clay-bg)',
        flexDirection: 'column', gap: '1rem',
      }}>
        <div className="clay-spinner" />
        <p style={{
          fontWeight: 800,
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--clay-muted)',
        }}>Authenticating...</p>
      </div>
    );
  }

  const rc = roleConfig[user?.role] || roleConfig.student;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--clay-bg)',
        backgroundImage: 'radial-gradient(circle at 15% 5%, rgba(108,99,255,0.06) 0%, transparent 40%), radial-gradient(circle at 85% 95%, rgba(139,92,246,0.05) 0%, transparent 40%)',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Sidebar ── */}
      {Sidebar ? (
        <Sidebar
          role={user?.role}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          logout={logout}
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      ) : (
        <div style={{ width: '80px', background: 'var(--clay-primary)' }} />
      )}

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Clay Header ── */}
        <header style={{
          height: '72px',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(237,233,254,0.60)',
          boxShadow: '0 4px 24px -4px rgba(108,99,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          {/* Left: Toggle + Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Hamburger */}
            <button
              onClick={toggleSidebar}
              style={{
                padding: '0.5rem',
                background: 'rgba(108,99,255,0.06)',
                borderRadius: '14px',
                border: 'none',
                color: 'var(--clay-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(108,99,255,0.12)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(108,99,255,0.06)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Menu size={22} />
            </button>

            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'white',
                padding: '0.375rem',
                borderRadius: '14px',
                boxShadow: '0 4px 16px -2px rgba(108,99,255,0.12), inset 0 1px 0 rgba(255,255,255,0.90)',
                border: '1px solid rgba(237,233,254,0.60)',
                flexShrink: 0,
              }}>
                <img src={logo} alt="CGC Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 style={{
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: 'var(--clay-text)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.1,
                }}>
                  City Group of Colleges
                </h2>
                <p style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: 'var(--clay-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginTop: '2px',
                }}>
                  Academic ERP Portal
                </p>
              </div>
            </div>
          </div>

          {/* Right: User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Clock component slot */}
            <div className="hidden md:block" />

            {/* Divider */}
            <div style={{
              width: '1px', height: '36px',
              background: 'rgba(237,233,254,0.80)',
            }} />

            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="hidden sm:block text-right">
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: 'var(--clay-text)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  marginBottom: '3px',
                }}>
                  {user?.name}
                </p>
                <span style={{
                  display: 'inline-flex',
                  padding: '2px 8px',
                  background: rc.bg,
                  color: rc.color,
                  borderRadius: '999px',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {rc.label}
                </span>
              </div>

              {/* Avatar with upload */}
              <label style={{
                width: '44px', height: '44px',
                borderRadius: '14px',
                background: 'rgba(108,99,255,0.08)',
                border: '2px solid rgba(237,233,254,0.80)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--clay-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(237,233,254,0.80)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <input
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target?.files?.[0];
                    if (!file) return;
                    if (file?.size > 2 * 1024 * 1024) return alert("File too large (>2MB)");
                    const formData = new FormData();
                    formData.append('profile_image', file);
                    try {
                      const res = await api.post('/update-profile-image', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });
                      const updatedUser = { ...user, profile_image: res?.data?.profile_image };
                      localStorage.setItem('user', JSON.stringify(updatedUser));
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update profile photo");
                    }
                  }}
                />
                {user?.profile_image ? (
                  <img
                    src={"https://college-erp-management-system-a9xk.onrender.com" + user?.profile_image}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <GraduationCap size={20} style={{ color: 'var(--clay-primary)' }} />
                )}
                {/* Upload overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(108,99,255,0.60)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                }}
                className="group-hover:opacity-100"
                >
                  <Plus size={14} style={{ color: 'white' }} />
                </div>
              </label>
            </div>
          </div>
        </header>

        {/* ── Main Content Area ── */}
        <main
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {console.log("Rendering component for role:", user?.role)}

            {user?.role === 'admin' && AdminDashboard
              ? <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
              : null}
            {user?.role === 'teacher' && TeacherDashboard
              ? <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
              : null}
            {user?.role === 'student' && StudentDashboard
              ? <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
              : null}

            {!AdminDashboard && user?.role === 'admin' && (
              <div style={{
                padding: '5rem', textAlign: 'center',
                fontWeight: 900, color: 'var(--clay-danger)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                animation: 'pulseSoft 1.5s ease-in-out infinite',
              }}>
                Critical Error: AdminDashboard not loaded
              </div>
            )}
            {!TeacherDashboard && user?.role === 'teacher' && (
              <div style={{
                padding: '5rem', textAlign: 'center',
                fontWeight: 900, color: 'var(--clay-danger)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                animation: 'pulseSoft 1.5s ease-in-out infinite',
              }}>
                Critical Error: TeacherDashboard not loaded
              </div>
            )}
            {!StudentDashboard && user?.role === 'student' && (
              <div style={{
                padding: '5rem', textAlign: 'center',
                fontWeight: 900, color: 'var(--clay-danger)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                animation: 'pulseSoft 1.5s ease-in-out infinite',
              }}>
                Critical Error: StudentDashboard not loaded
              </div>
            )}
          </div>
        </main>

        {/* Clock is preserved */}
        <Clock />
      </div>
    </div>
  );
};

export default Dashboard;
