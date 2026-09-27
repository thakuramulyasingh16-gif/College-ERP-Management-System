import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE = "https://college-erp-management-system-a9xk.onrender.com/api";

export const AuthProvider = ({ children }) => {
  // loading=true while we're verifying the stored token with the backend
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('teacher');
        setUser(null);
        setLoading(false);
        return;
      }

      // Verify token and active session against the backend
      try {
        const res = await fetch(`${API_BASE}/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.valid && data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            if (data.user.role === 'teacher') {
              localStorage.setItem('teacher', JSON.stringify(data.user));
            }
            setLoading(false);
            return;
          }
        }

        // If response is not ok (401 invalid, expired, or session invalidated)
        try {
          const errData = await res.json();
          if (errData && errData.code === 'SESSION_INVALIDATED') {
            sessionStorage.setItem(
              'session_invalidated_msg',
              errData.message || 'You have been logged out because your account was signed in from another device.'
            );
          }
        } catch (parseErr) {}

        console.warn("Session verification failed on mount, clearing state");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('teacher');
        setUser(null);
      } catch (err) {
        console.error("Network error during auth verification:", err);
        // Fail securely: do not grant access to stale localStorage on unverified token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('teacher');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.role === 'teacher') {
      localStorage.setItem('teacher', JSON.stringify(userData));
    }
    setUser(userData);
  };

  /**
   * Logout: calls the backend to blacklist the current JWT and clear active session,
   * then clears all client-side auth state.
   */
  const logout = async () => {
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (err) {
      console.warn("Logout API call failed:", err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('teacher');
      setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
