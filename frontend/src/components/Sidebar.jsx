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
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
       />

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isOpen ? 'w-72' : 'w-20'} 
        bg-[#1E3A8A] text-white
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        m-0 lg:m-4 lg:rounded-3xl overflow-hidden
      `}>
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_center,#fff_1px,transparent_1px)] [background-size:20px_20px]"  />
        
        {/* Top Spacer for Mobile Toggle */}
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={toggleSidebar} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24}  />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar relative">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden active:scale-95
                  ${activeTab === item.id 
                    ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-[0_8px_20px_-6px_rgba(99,102,241,0.6)]' 
                    : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
                }
                ${isOpen ? 'justify-start' : 'justify-center'}
                `}
              >
                {item.icon ? (
                  <item.icon size={22} strokeWidth={2.5} className={`
                    shrink-0 transition-all duration-300
                    ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}
                  `}  />
                ) : (
                  <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center text-[8px] font-black">{item.label?.charAt(0)}</div>
                )}
                
                <span className={`
                  font-bold text-sm whitespace-nowrap transition-all duration-300
                  ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 absolute w-0'}
                `}>
                  {item.label}
                </span>

                {activeTab === item.id && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"  />
                )}
              </button>

              {/* Tooltip for collapsed state */}
              {!isOpen && (
                <div className="fixed left-24 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-[60] shadow-2xl whitespace-nowrap pointer-events-none border border-white/10">
                  {item.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer: Logout */}
        <div className="p-4 mt-auto">
          <button 
            onClick={logout}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group active:scale-95
              text-red-300 bg-white/5 hover:bg-red-500/20 hover:text-red-100 font-bold text-sm
              ${isOpen ? 'justify-start' : 'justify-center'}
            `}
          >
            <LogOut size={22} strokeWidth={2.5} className="shrink-0 transition-transform group-hover:rotate-12"  />
            <span className={`
              whitespace-nowrap transition-all duration-500
              ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 absolute w-0'}
            `}>
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
