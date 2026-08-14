import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminDashboard from '../components/AdminDashboard';
import TeacherDashboard from '../components/TeacherDashboard';
import StudentDashboard from '../components/StudentDashboard';
import Clock from '../components/Clock';
import { Menu, User, Plus, Calendar, BookOpen } from 'lucide-react';

import api from '../api';
import logo from '../assets/logo.png';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 1024 : true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  console.log("Dashboard rendering, role:", user?.role, "activeTab:", activeTab);

  if (!user) {
    console.log("No user found in Dashboard, redirecting...");
    return <div className="flex items-center justify-center h-screen font-black uppercase tracking-widest text-slate-400">Authenticating...</div>;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
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
        <div className="w-20 lg:w-72 bg-[#1E3A8A] animate-pulse" />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-300 text-slate-600 active:scale-90"
            >
              <Menu size={24}  />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 shrink-0">
                <img src={logo} alt="CGC Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain"  />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xs md:text-lg font-black text-[#1E3A8A] tracking-tighter leading-none">City Group of Colleges</h2>
                <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Academic ERP Portal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-none">{user?.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-1">{user?.role} Access</p>
              </div>
              <label className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 hover:border-blue-500 transition-all cursor-pointer group relative">
                <input 
                  type="file" 
                  className="hidden" 
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
                    src={"http://localhost:5000" + (user?.profile_image)} 
                    alt="Profile" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                   />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={22} className="group-hover:scale-110 transition-transform"  />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Plus className="text-white" size={16}  />
                </div>
              </label>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="max-w-7xl mx-auto">
            {console.log("Rendering component for role:", user?.role)}
            {user?.role === 'admin' && AdminDashboard ? <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} user={user}  /> : null}
            {user?.role === 'teacher' && TeacherDashboard ? <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab}  /> : null}
            {user?.role === 'student' && StudentDashboard ? <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab}  /> : null}
            
            {!AdminDashboard && user?.role === 'admin' && (
              <div className="p-20 text-center font-black text-red-500 uppercase tracking-widest animate-pulse">
                Critical Error: AdminDashboard not loaded
              </div>
            )}
            {!TeacherDashboard && user?.role === 'teacher' && (
              <div className="p-20 text-center font-black text-red-500 uppercase tracking-widest animate-pulse">
                Critical Error: TeacherDashboard not loaded
              </div>
            )}
            {!StudentDashboard && user?.role === 'student' && (
              <div className="p-20 text-center font-black text-red-500 uppercase tracking-widest animate-pulse">
                Critical Error: StudentDashboard not loaded
              </div>
            )}
          </div>
        </main>
        <Clock />
      </div>
    </div>

  );
};

export default Dashboard;
