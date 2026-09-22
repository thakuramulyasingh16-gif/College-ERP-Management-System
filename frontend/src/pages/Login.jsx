import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    console.log("Login request:", trimmedEmail, trimmedPassword);
    try {
      const res = await fetch("https://college-erp-management-system-1.onrender.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      const token = data.token || "";
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      console.log("TOKEN SAVED:", token);

      // redirect based on role
      if (data.user.role === "admin") window.location.href = "/admin";
      else if (data.user.role === "teacher") window.location.href = "/teacher";
      else window.location.href = "/student";

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
      <div className="absolute -top-24 -left-24 w-64 h-64 md:w-96 md:h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 md:w-96 md:h-96 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-6 sm:p-10 border border-slate-100 relative z-10">
          <div className="text-center mb-8 sm:mb-10">
            <div className="bg-white p-3 sm:p-4 rounded-3xl shadow-xl inline-block mb-4 sm:mb-6 border border-slate-50">
              <img 
                src={logo} 
                alt="CGC Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
               />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">CGC ERP Login</h1>
            <p className="text-slate-400 font-bold mt-2 text-[10px] sm:text-sm uppercase tracking-widest">City Group of Colleges</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-shake">
              <AlertCircle className="text-red-500 shrink-0" size={20}  />
              <p className="text-red-600 text-xs font-black uppercase tracking-wider">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Official Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20}  />
                <input
                  type="email"
                  placeholder="name@citycolleges.info"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                 />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Security Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20}  />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                 />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 mt-4 flex items-center justify-center gap-3"
            >
              {loading ? 'Authenticating...' : <><LogIn size={20} strokeWidth={3}  /> Secure Sign In</>}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">Authorized Access Only</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
