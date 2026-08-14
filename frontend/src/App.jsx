import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clock from './components/Clock';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <>{children}<Clock /></> : <Navigate to='/login'  />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path='/login' element={<Login  />}  />
          <Route path='/dashboard' element={<ProtectedRoute><Dashboard  /></ProtectedRoute>}  />
          <Route path='/admin' element={<ProtectedRoute><Dashboard  /></ProtectedRoute>}  />
          <Route path='/teacher' element={<ProtectedRoute><Dashboard  /></ProtectedRoute>}  />
          <Route path='/student' element={<ProtectedRoute><Dashboard  /></ProtectedRoute>}  />
          <Route path='/' element={<Navigate to='/dashboard'  />}  />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
