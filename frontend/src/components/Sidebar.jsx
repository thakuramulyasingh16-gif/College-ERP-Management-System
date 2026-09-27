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

      {/* Claymorphism Sidebar */}
      <aside
        className={`erp-sidebar ${isOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}
        style={{
          background: 'var(--clay-surface)',
          borderRight: 'none',
          boxShadow: '4px 0 16px rgba(163, 177, 198, 0.3)',
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
        }}>
          {isOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Logo in soft clay container */}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '14px',
                background: 'var(--clay-surface)',
                boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.5), -4px -4px 8px rgba(255, 255, 255, 0.85)',
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
                  fontSize: '0.9375rem',
                  fontWeight: 900,
                  color: 'var(--clay-text)',
                  lineHeight: 1.1,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}>
                  CGC ERP
                </h1>
                <p style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: 'var(--clay-muted)',
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
              borderRadius: '14px',
              background: 'var(--clay-surface)',
              boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.5), -4px -4px 8px rgba(255, 255, 255, 0.85)',
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
                width: '34px',
                height: '34px',
                borderRadius: '12px',
                background: 'var(--clay-surface)',
                boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.45), -3px -3px 6px rgba(255, 255, 255, 0.8)',
                color: 'var(--clay-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <X size={18} />
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
            gap: '6px',
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
                    borderRadius: '16px',
                    border: 'none',
                    background: isActive ? '#E5EBF6' : 'transparent',
                    boxShadow: isActive
                      ? 'inset 3px 3px 6px rgba(163, 177, 198, 0.5), inset -3px -3px 6px rgba(255, 255, 255, 0.75)'
                      : 'none',
                    color: isActive ? 'var(--clay-primary)' : '#4B5563',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#F0F3FA';
                      e.currentTarget.style.boxShadow = '3px 3px 6px rgba(163, 177, 198, 0.35), -3px -3px 6px rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.color = 'var(--clay-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.color = '#4B5563';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.97)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Icon inside soft container if active */}
                  <item.icon
                    size={19}
                    strokeWidth={isActive ? 2.5 : 2}
                    style={{
                      flexShrink: 0,
                      color: isActive ? 'var(--clay-primary)' : 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  />

                  {/* Label */}
                  {isOpen && (
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 700 : 600,
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
                      background: 'var(--clay-surface)',
                      color: 'var(--clay-text)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '4px 4px 10px rgba(163, 177, 198, 0.5), -4px -4px 10px rgba(255, 255, 255, 0.8)',
                      zIndex: 60,
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

        {/* Bottom Section: Clay Logout Button */}
        <div style={{
          padding: isOpen ? '0.875rem' : '0.875rem 0.5rem',
          flexShrink: 0,
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
              borderRadius: '16px',
              border: 'none',
              background: '#FEF2F2',
              boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)',
              color: 'var(--clay-danger)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8125rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '5px 5px 10px rgba(163, 177, 198, 0.45), -5px -5px 10px rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '4px 4px 8px rgba(163, 177, 198, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = 'inset 3px 3px 6px rgba(239, 68, 68, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.7)';
              e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = '4px 4px 8px rgba(163, 177, 198, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <LogOut size={18} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
