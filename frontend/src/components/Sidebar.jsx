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

// ── ALL MENU ITEMS UNCHANGED ────────────────────────────────
const Sidebar = ({ role, activeTab, setActiveTab, logout, isOpen, toggleSidebar }) => {
  console.log("Sidebar rendering for role:", role);
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
      {/* ── Mobile Overlay ── */}
      <div
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,24,39,0.55)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          transition: 'opacity 0.3s ease',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        className="lg:hidden"
      />

      {/* ── Clay Sidebar Container ── */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          width: isOpen ? '280px' : '80px',
          background: 'linear-gradient(160deg, #6C63FF 0%, #8B5CF6 60%, #7C3AED 100%)',
          boxShadow: '8px 0 40px -4px rgba(108,99,255,0.25)',
          transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          overflow: 'hidden',
        }}
        className="lg:relative lg:translate-x-0 lg:m-4 lg:rounded-[28px]"
      >
        {/* ── Background shimmer overlay ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
          opacity: 0.6,
        }} />

        {/* ── Mobile close button ── */}
        <div className="lg:hidden flex justify-end p-4" style={{ position: 'relative', zIndex: 1 }}>
          <button
            onClick={toggleSidebar}
            style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '12px',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.20)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Brand Mark (collapsed state) ── */}
        {!isOpen && (
          <div style={{
            padding: '1.5rem 0',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'rgba(255,255,255,0.20)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30)',
              fontWeight: 900,
              color: 'white',
              fontSize: '1.1rem',
              letterSpacing: '-0.02em',
            }}>
              C
            </div>
          </div>
        )}

        {/* ── Navigation Items ── */}
        <nav
          className="custom-scrollbar"
          style={{
            flex: 1,
            padding: isOpen ? '1.5rem 1rem' : '1rem 0.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {items.map((item, idx) => {
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} style={{ position: 'relative' }} className="group">
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isOpen ? '0.875rem' : '0',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                    padding: isOpen ? '0.75rem 1rem' : '0.75rem',
                    borderRadius: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    background: isActive
                      ? 'rgba(255,255,255,0.22)'
                      : 'transparent',
                    boxShadow: isActive
                      ? 'inset 0 1px 0 rgba(255,255,255,0.30), 0 4px 16px rgba(0,0,0,0.10)'
                      : 'none',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.90)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.96)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: '3px',
                      background: 'white',
                      borderRadius: '0 4px 4px 0',
                    }} />
                  )}

                  {/* Icon */}
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    style={{
                      flexShrink: 0,
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                    }}
                  />

                  {/* Label */}
                  {isOpen && (
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.3s ease',
                      letterSpacing: '0.01em',
                    }}>
                      {item.label}
                    </span>
                  )}
                </button>

                {/* Tooltip for collapsed state */}
                {!isOpen && (
                  <div
                    style={{
                      position: 'fixed',
                      left: '90px',
                      padding: '0.5rem 0.875rem',
                      background: '#1F2937',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      zIndex: 60,
                    }}
                    className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                  >
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Logout Button ── */}
        <div style={{
          padding: isOpen ? '1rem' : '0.75rem 0.5rem',
          position: 'relative', zIndex: 1,
          borderTop: '1px solid rgba(255,255,255,0.10)',
        }}>
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: isOpen ? '0.875rem' : '0',
              justifyContent: isOpen ? 'flex-start' : 'center',
              padding: isOpen ? '0.75rem 1rem' : '0.75rem',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(239,68,68,0.15)',
              color: 'rgba(252,165,165,1)',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.28)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
              e.currentTarget.style.color = 'rgba(252,165,165,1)';
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <LogOut size={20} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
