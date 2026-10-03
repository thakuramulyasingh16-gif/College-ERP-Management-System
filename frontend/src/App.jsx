import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

/**
 * ProtectedRoute: blocks unauthenticated access to any wrapped route.
 * - Shows a loading indicator while AuthContext verifies token with backend.
 * - Redirects to /login if token is missing, expired, or invalid.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #E8ECFF 0%, #F5F3FF 100%)',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="clay-spinner" />
        <p style={{
          fontWeight: 800,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--clay-muted)',
        }}>
          Authenticating...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * PublicRoute: redirects already-authenticated users away from /login.
 * Sends them directly to their role-specific dashboard.
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #E8ECFF 0%, #F5F3FF 100%)',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="clay-spinner" />
        <p style={{
          fontWeight: 800,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--clay-muted)',
        }}>
          Loading...
        </p>
      </div>
    );
  }

  if (user) {
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
          {/* Public login route */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/teacher"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/student"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Default and unknown paths route securely through /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
