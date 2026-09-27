import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminDashboard from '../components/AdminDashboard';
import TeacherDashboard from '../components/TeacherDashboard';
import StudentDashboard from '../components/StudentDashboard';
import Clock from '../components/Clock';
import { Menu, GraduationCap, Plus, ShieldCheck } from 'lucide-react';
import api from '../api';

const roleConfig = {
  admin:   { label: 'Admin',   color: '#6C63FF', bg: 'rgba(108, 99, 255, 0.10)' },
  teacher: { label: 'Teacher', color: '#8B7CF6', bg: 'rgba(139, 124, 246, 0.10)' },
  student: { label: 'Student', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.10)' },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--erp-bg)',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="clay-spinner" />
        <p style={{
          fontWeight: 700,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--erp-muted)',
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
        {/* Clean, compact Clay Header */}
        <header className="erp-header">
          {/* Left: Sidebar Toggle + Portal Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <button
              onClick={toggleSidebar}
              className="erp-header-btn"
              title="Toggle Menu"
            >
              <Menu size={19} />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{
                  fontSize: '0.9375rem',
                  fontWeight: 800,
                  color: 'var(--erp-text)',
                  lineHeight: 1.2,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}>
                  City Group of Colleges
                </h2>
                <span style={{
                  padding: '2px 8px',
                  background: rc.bg,
                  color: rc.color,
                  borderRadius: '999px',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {rc.label} Portal
                </span>
              </div>
            </div>
          </div>

          {/* Right: User Information & Profile Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="hidden sm:block" style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--erp-text)',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {user?.name}
              </p>
              <p style={{
                fontSize: '0.6875rem',
                color: 'var(--erp-muted)',
                margin: '2px 0 0 0',
                fontWeight: 500,
              }}>
                {user?.email}
              </p>
            </div>

            {/* Profile Avatar with Photo Upload (Functionality 100% Preserved) */}
            <label
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'var(--erp-surface-soft)',
                border: '1.5px solid rgba(108, 99, 255, 0.15)',
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
                  src={"https://college-erp-management-system-a9xk.onrender.com" + user?.profile_image}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <GraduationCap size={18} style={{ color: 'var(--erp-primary)' }} />
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
