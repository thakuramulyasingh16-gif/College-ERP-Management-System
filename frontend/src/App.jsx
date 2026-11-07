import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import useIdleLogout from './hooks/useIdleLogout';
import IdleWarningModal from './components/IdleWarningModal';

// ── Spinner shared by guards ──────────────────────────────────────────────────
function AuthSpinner({ label = 'Authenticating...' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--inst-paper)',
      flexDirection: 'column', gap: '1rem',
    }}>
      <div className="clay-spinner" />
      <p style={{
        fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase',
        letterSpacing: '0.12em', color: 'var(--inst-muted)', fontFamily: 'var(--font-body)',
      }}>
        {label}
      </p>
    </div>
  );
}

/**
 * ProtectedRoute: blocks unauthenticated access to any wrapped route.
 * Shows a loading indicator while AuthContext verifies token with backend.
 * Redirects to /login if token is missing, expired, or invalid.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/**
 * RoleRoute: guards a route for a specific role.
 *
 * Rules:
 * - If user is not logged in → /login (ProtectedRoute handles this above).
 * - If user's role matches the required role → render children.
 * - If role MISMATCHES (URL tampering) → logout + security alert message → /login.
 * - /dashboard (no required role) → redirect to the user's own role route silently.
 *
 * The side effect (logout) runs inside useEffect, never during render.
 * During the async logout we show the spinner.
 */
const RoleRoute = ({ children, requiredRole }) => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const isMismatch = Boolean(user && requiredRole && user.role !== requiredRole);

  useEffect(() => {
    if (loading || !user) return;
    if (isMismatch) {
      sessionStorage.setItem(
        'session_invalidated_msg',
        'Security alert: you were logged out because the URL was changed to a page that does not belong to your account.'
      );
      logout().finally(() => {
        navigate('/login', { replace: true });
      });
    }
  }, [loading, user, isMismatch, logout, navigate]);

  if (loading || isMismatch) return <AuthSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  // No required role → redirect to own dashboard
  if (!requiredRole) {
    const ownRoute = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={ownRoute} replace />;
  }

  return <>{children}</>;
};

/**
 * PublicRoute: redirects already-authenticated users away from /login.
 * Sends them directly to their role-specific dashboard.
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthSpinner label="Loading..." />;
  if (user) {
    const route = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={route} replace />;
  }
  return <>{children}</>;
};

/**
 * IdleLogoutManager: mounted inside the router so useNavigate works.
 * Only active when a user is logged in.
 */
function IdleLogoutManager() {
  const { user } = useAuth();
  const [warningSeconds, setWarningSeconds] = useState(null);

  const { staySignedIn } = useIdleLogout({
    onShowWarning: (secs) => setWarningSeconds(secs),
    onHideWarning: () => setWarningSeconds(null),
  });

  if (!user) return null;

  return (
    <IdleWarningModal
      secondsRemaining={warningSeconds}
      onStaySignedIn={() => {
        staySignedIn();
        setWarningSeconds(null);
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Idle timeout UX layer — mounted inside Router for useNavigate */}
        <IdleLogoutManager />
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* /dashboard — no role required, just redirect to own role route */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <RoleRoute>{/* children not needed; RoleRoute redirects */}</RoleRoute>
            </ProtectedRoute>
          } />

          {/* Role-locked routes — URL tampering triggers logout */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <RoleRoute requiredRole="admin"><Dashboard /></RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/teacher" element={
            <ProtectedRoute>
              <RoleRoute requiredRole="teacher"><Dashboard /></RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/student" element={
            <ProtectedRoute>
              <RoleRoute requiredRole="student"><Dashboard /></RoleRoute>
            </ProtectedRoute>
          } />

          {/* Default: / → /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Unknown paths: logged-in → own dashboard; not logged-in → /login */}
          <Route path="*" element={<UnknownRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

/**
 * UnknownRoute: for any path not matched above.
 * Logged-in users are silently redirected to their own dashboard (no logout).
 * Unauthenticated users go to /login.
 */
function UnknownRoute() {
  const { user, loading } = useAuth();
  if (loading) return <AuthSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  const ownRoute = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
  return <Navigate to={ownRoute} replace />;
}

export default App;
