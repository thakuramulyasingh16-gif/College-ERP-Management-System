import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE = "https://college-erp-management-system-a9xk.onrender.com/api";

export const AuthProvider = ({ children }) => {
  // loading=true while we're validating the stored token on mount
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // On mount: restore user from storage only if a token is also present
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse saved user", err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('teacher');
      }
    } else {
      // If token is missing but user data exists (or vice versa), clear everything
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('teacher');
    }
    // Done restoring state — ProtectedRoute can now make a routing decision
    setLoading(false);
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
   * Logout: calls the backend to blacklist the current JWT so it cannot
   * be reused after logout, then clears all client-side auth state.
   * Even if the API call fails, local state is still cleared.
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
      // Network error during logout — still clear local state
      console.warn("Logout API call failed:", err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('teacher');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
