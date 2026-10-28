import React from 'react';
import { useAuth } from '../context/AuthContext';
import StudentHome from './StudentHome';
import AdminHome from './AdminHome';

/**
 * HomePage – renders the appropriate landing page based on the current user's role.
 * If the user is not authenticated, it returns null (routing will handle redirect).
 */
const HomePage = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return null; // ProtectedRoute will redirect to login
  }

  return isAdmin ? <AdminHome /> : <StudentHome />;
};

export default HomePage;
