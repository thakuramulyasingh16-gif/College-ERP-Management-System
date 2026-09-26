import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clock from './components/Clock';

/**
 * ProtectedRoute: blocks unauthenticated access to any wrapped route.
 * - Shows a loading indicator while AuthContext restores session from storage.
 * - Redirects to /login (replacing history entry) if not authenticated,
 *   so the browser Back button cannot return to the protected page.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen font-black uppercase tracking-widest text-slate-400">
        Authenticating...
      </div>
    );
  }

  if (!user) {
    // replace=true removes the protected route from history so Back doesn't return there
    return <Navigate to="/login" replace />;
  }

  return <>{children}<Clock /></>;
};

/**
 * PublicRoute: redirects already-authenticated users away from /login.
 * Prevents using the browser Back button to reach /login after dashboard use.
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen font-black uppercase tracking-widest text-slate-400">
        Loading...
      </div>
    );
  }

  if (user) {
    // Already logged in — send to the appropriate dashboard
    const route = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={route} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public-only route */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected routes — all guarded by ProtectedRoute */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/teacher"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/student"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Default: unauthenticated users are sent to login, authenticated to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all: send unknown routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
