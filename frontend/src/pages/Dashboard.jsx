import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminDashboard from '../components/AdminDashboard';
import TeacherDashboard from '../components/TeacherDashboard';
import StudentDashboard from '../components/StudentDashboard';
import Clock from '../components/Clock';
import { Menu, GraduationCap, ShieldCheck } from 'lucide-react';
import api from '../api';
import { getMediaUrl } from '../utils/api';

const roleConfig = {
  admin:   { label: 'Admin',   color: '#6366F1', bg: '#EEF2FF' },
  teacher: { label: 'Teacher', color: '#8B5CF6', bg: '#F5F3FF' },
  student: { label: 'Student', color: '#10B981', bg: '#ECFDF5' },
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
        background: 'linear-gradient(135deg, #E8ECFF 0%, #F5F3FF 100%)',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="clay-spinner" />
        <p style={{
          fontWeight: 800,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--clay-muted)',
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
        {/* Claymorphism Navbar / Header */}
        <header className="erp-header">
          {/* Left: Sidebar Toggle + Portal Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={toggleSidebar}
              className="erp-header-btn"
              title="Toggle Menu"
            >
              <Menu size={19} strokeWidth={2.5} />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <h2 style={{
                  fontSize: '0.9375rem',
                  fontWeight: 900,
                  color: 'var(--clay-text)',
                  lineHeight: 1.2,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}>
                  City Group of Colleges
                </h2>
                {/* Role Pill with Inset Clay Depth */}
                <span style={{
                  padding: '3px 10px',
                  background: rc.bg,
                  color: rc.color,
                  borderRadius: '9999px',
                  boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.4), inset -2px -2px 4px rgba(255, 255, 255, 0.7)',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
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
                fontWeight: 700,
                color: 'var(--clay-text)',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {user?.name}
              </p>
              <p style={{
                fontSize: '0.6875rem',
                color: 'var(--clay-muted)',
                margin: '2px 0 0 0',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}>
                {user?.email}
              </p>
            </div>

            {/* Profile Avatar inside Soft Clay Container (Functionality 100% Preserved) */}
            <label
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                background: 'var(--clay-surface)',
                boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.5), -4px -4px 8px rgba(255, 255, 255, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
                transition: 'all 0.2s ease',
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
                  src={getMediaUrl(user?.profile_image)}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <GraduationCap size={20} style={{ color: 'var(--clay-primary)' }} />
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
