import React from 'react';
import { 
  LayoutDashboard,
  Users,
  ClipboardCheck,
  GraduationCap,
  CreditCard,
  Bell,
  BookMarked,
  BookOpen,
  LogOut,
  Building2,
  X,
  Calendar,
  Megaphone,
  Plus,
  Pencil
} from 'lucide-react';
import logo from '../assets/logo.png';

const Sidebar = ({ role, activeTab, setActiveTab, logout, isOpen, toggleSidebar }) => {
  // Navigation menu items preserved exactly as in the original application
  const menuItems = {
    admin: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'staff', label: 'Manage Staff', icon: Users },
      { id: 'students', label: 'Manage Students', icon: GraduationCap },
      { id: 'departments', label: 'Departments', icon: Building2 },
      { id: 'courses', label: 'Courses', icon: BookMarked },
      { id: 'fees', label: 'Fee Management', icon: CreditCard },
      { id: 'fee-records', label: 'Fee Records', icon: ClipboardCheck },
      { id: 'complaints', label: 'Complaints', icon: Bell },
      { id: 'notices', label: 'Notices', icon: Megaphone },
    ],
    teacher: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'students', label: 'Students', icon: GraduationCap },
      { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      { id: 'add-subjects', label: 'Add Subjects', icon: Plus },
      { id: 'marks', label: 'Marks Entry', icon: Pencil },
      { id: 'assignments', label: 'Assignments', icon: BookOpen },
      { id: 'notes', label: 'Study Material', icon: BookMarked },
      { id: 'complaints', label: 'Feedback', icon: Bell },
    ],
    student: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'attendance', label: 'My Attendance', icon: ClipboardCheck },
      { id: 'results', label: 'My Results', icon: GraduationCap },
      { id: 'subjects', label: 'My Subjects', icon: BookMarked },
      { id: 'assignments', label: 'Assignments', icon: BookOpen },
      { id: 'fees', label: 'My Fees', icon: CreditCard },
      { id: 'notes', label: 'Study Material', icon: BookMarked },
      { id: 'complaints', label: 'Feedback', icon: Bell },
    ]
  };

  const items = menuItems[role] || [];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={toggleSidebar}
        className={`lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Institutional Sidebar */}
      <aside
        className={`erp-sidebar ${isOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}
        style={{
          background: 'var(--inst-surface)',
          borderRight: '1px solid var(--inst-border)',
          boxShadow: 'none',
        }}
      >
        {/* Brand Header */}
        <div style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          padding: isOpen ? '0 1.25rem' : '0',
          flexShrink: 0,
          borderBottom: '1px solid var(--inst-border)',
        }}>
          {isOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Logo in institutional navy tint container */}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--inst-radius-sm)',
                background: 'var(--inst-ink-tint)',
                border: '1px solid var(--inst-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <img src={logo} alt="CGC" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--inst-ink)',
                  lineHeight: 1.1,
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}>
                  CGC ERP
                </h1>
                <p style={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'var(--inst-muted)',
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '2px 0 0 0',
                }}>
                  Academic Portal
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--inst-radius-sm)',
              background: 'var(--inst-ink-tint)',
              border: '1px solid var(--inst-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img src={logo} alt="CGC" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
            </div>
          )}

          {/* Mobile close button */}
          {isOpen && (
            <button
              onClick={toggleSidebar}
              className="lg:hidden"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--inst-radius-sm)',
                background: 'var(--inst-surface)',
                border: '1px solid var(--inst-border)',
                color: 'var(--inst-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={17} />
            </button>
          )}
        </div>

        {/* Navigation Items in Custom Scrollbar */}
        <nav
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isOpen ? '0.875rem 0.75rem' : '0.875rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {items.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} style={{ position: 'relative' }} className="group">
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      toggleSidebar();
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isOpen ? '0.75rem' : '0',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                    padding: isOpen ? '0.625rem 0.875rem' : '0.625rem',
                    borderRadius: 'var(--inst-radius-sm)',
                    border: isActive ? '1px solid var(--inst-ink)' : '1px solid transparent',
                    background: isActive ? 'var(--inst-ink)' : 'transparent',
                    boxShadow: isActive ? 'var(--inst-shadow-sm)' : 'none',
                    color: isActive ? '#FFFFFF' : 'var(--inst-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--inst-ink-tint)';
                      e.currentTarget.style.borderColor = 'var(--inst-border)';
                      e.currentTarget.style.color = 'var(--inst-ink)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = 'var(--inst-text)';
                    }
                  }}
                >
                  <item.icon
                    size={18}
                    strokeWidth={isActive ? 2.4 : 2}
                    style={{
                      flexShrink: 0,
                      color: isActive ? '#FFFFFF' : 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  />

                  {/* Label */}
                  {isOpen && (
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 600 : 500,
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.label}
                    </span>
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {!isOpen && (
                  <div
                    style={{
                      position: 'fixed',
                      left: '86px',
                      padding: '0.4rem 0.75rem',
                      background: 'var(--inst-ink)',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--inst-radius-sm)',
                      border: '1px solid var(--inst-ink)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: 'var(--inst-shadow)',
                      zIndex: 60,
                      fontFamily: 'var(--font-body)',
                    }}
                    className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150"
                  >
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Section: Institutional Logout Button */}
        <div style={{
          padding: isOpen ? '0.875rem' : '0.875rem 0.5rem',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          flexShrink: 0,
          borderTop: '1px solid var(--inst-border)',
        }}>
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: isOpen ? '0.75rem' : '0',
              justifyContent: isOpen ? 'flex-start' : 'center',
              padding: isOpen ? '0.625rem 0.875rem' : '0.625rem',
              borderRadius: 'var(--inst-radius-sm)',
              border: '1px solid rgba(156, 59, 50, 0.25)',
              background: 'var(--inst-danger-tint)',
              boxShadow: 'none',
              color: 'var(--inst-danger)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F8DCD9';
              e.currentTarget.style.borderColor = 'rgba(156, 59, 50, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--inst-danger-tint)';
              e.currentTarget.style.borderColor = 'rgba(156, 59, 50, 0.25)';
            }}
          >
            <LogOut size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
