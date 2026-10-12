import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminDashboard from '../components/AdminDashboard';
import TeacherDashboard from '../components/TeacherDashboard';
import StudentDashboard from '../components/StudentDashboard';
import Clock from '../components/Clock';
import { Menu, GraduationCap } from 'lucide-react';
import api from '../api';
import { getMediaUrl } from '../utils/api';

const roleConfig = {
  admin:   { label: 'Admin',   color: 'var(--inst-ink)',     bg: 'var(--inst-ink-tint)',     border: '1px solid var(--inst-border)' },
  teacher: { label: 'Teacher', color: 'var(--inst-gold)',    bg: 'var(--inst-gold-tint)',    border: '1px solid rgba(173, 127, 46, 0.3)' },
  student: { label: 'Student', color: 'var(--inst-success)', bg: 'var(--inst-success-tint)', border: '1px solid rgba(63, 122, 82, 0.3)' },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Poll session check every 20 seconds to auto-logout if signed in elsewhere
  React.useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        await api.get('/session/check');
      } catch (err) {
        // API interceptor will automatically clear token and redirect on SESSION_INVALIDATED
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--inst-paper)',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="clay-spinner" />
        <p style={{
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--inst-muted)',
          fontFamily: 'var(--font-body)',
        }}>
          Authenticating...
        </p>
      </div>
    );
  }

  const rc = roleConfig[user?.role] || roleConfig.student;

  return (
    <div className="erp-layout">
      {/* Real layout column sidebar on desktop, drawer on mobile */}
      <Sidebar
        role={user?.role}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logout={logout}
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      {/* Main Area: automatically occupies the remaining screen width */}
      <div className="erp-main-area">
        {/* Institutional Navbar / Top Header */}
        <header className="erp-header">
          {/* Left: Sidebar Toggle + Portal Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={toggleSidebar}
              className="erp-header-btn"
              title="Toggle Menu"
            >
              <Menu size={19} strokeWidth={2.2} />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <h2 style={{
                  fontSize: '1.0625rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--inst-ink)',
                  lineHeight: 1.2,
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}>
                  City Group of Colleges
                </h2>
                {/* Role Pill */}
                <span style={{
                  padding: '3px 10px',
                  background: rc.bg,
                  color: rc.color,
                  border: rc.border,
                  borderRadius: 'var(--inst-radius-sm)',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--font-body)',
                }}>
                  {rc.label} Portal
                </span>
              </div>
            </div>
          </div>

          {/* Right: User Information & Profile Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="hidden sm:block" style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--inst-ink)',
                fontFamily: 'var(--font-body)',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {user?.name}
              </p>
              <p style={{
                fontSize: '0.6875rem',
                color: 'var(--inst-muted)',
                fontFamily: 'var(--font-body)',
                margin: '2px 0 0 0',
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}>
                {user?.email}
              </p>
            </div>

            {/* Profile Avatar (Functionality 100% Preserved) */}
            <label
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--inst-radius-sm)',
                background: 'var(--inst-surface)',
                border: '1px solid var(--inst-border)',
                boxShadow: 'var(--inst-shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Click to change profile picture"
            >
              <input
                type="file"
                style={{ display: 'none' }}
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target?.files?.[0];
                  if (!file) return;
                  if (file?.size > 5 * 1024 * 1024) return alert("File too large (>5MB)");
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
                  src={getMediaUrl(user?.profile_image)}
                  alt="Profile"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
              {(!user?.profile_image) && (
                <GraduationCap size={20} style={{ color: 'var(--inst-ink)' }} />
              )}
            </label>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="erp-content custom-scrollbar">
          <div className="erp-content-container">
            {user?.role === 'admin' && AdminDashboard ? (
              <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
            ) : null}

            {user?.role === 'teacher' && TeacherDashboard ? (
              <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
            ) : null}

            {user?.role === 'student' && StudentDashboard ? (
              <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
            ) : null}
          </div>
        </main>

        {/* System Clock Component */}
        <Clock />
      </div>
    </div>
  );
};

export default Dashboard;
