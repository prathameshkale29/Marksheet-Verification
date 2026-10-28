import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import VerifiedDocuments from './pages/VerifiedDocuments';
import VerificationHistory from './pages/VerificationHistory';
import AdminDashboard from './pages/AdminDashboard';
import SettingsPage from './pages/SettingsPage';
import MarksheetReviewPage from './pages/MarksheetReviewPage';
import PublicVerificationPage from './pages/PublicVerificationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

/**
 * ProtectedRoute: Redirects to /login if not authenticated.
 * For admin-only routes, redirects non-admins to dashboard.
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * Layout wrapper for authenticated pages (with Sidebar + Navbar)
 */
const AppLayout = ({ children }) => (
  <div className="app-container">
    <Sidebar />
    <div className="main-content">
      <Navbar />
      {children}
    </div>
  </div>
);

/**
 * Wrapper to conditionally show layout based on route
 */
const AppRoutes = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isPublicVerifyPage = location.pathname.startsWith('/verify/');

  // Public verification page – no layout wrapper
  if (isPublicVerifyPage) {
    return (
      <Routes>
        <Route path="/verify/:verificationId" element={<PublicVerificationPage />} />
      </Routes>
    );
  }

  // Auth pages – no layout wrapper
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    );
  }

  // Protected application pages with layout
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><VerifiedDocuments /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><VerificationHistory /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
        <Route path="/encode" element={<Navigate to="/upload" replace />} />
        <Route path="/review/:verificationId" element={<ProtectedRoute adminOnly><MarksheetReviewPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
