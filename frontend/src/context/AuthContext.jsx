import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, getCurrentUser, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedRole = localStorage.getItem('user_role');
      
      if (token) {
        try {
          const data = await getCurrentUser();
          if (data.success && data.user) {
            setUser(data.user);
            setIsAuthenticated(true);
          }
        } catch {
          // Token expired or invalid - check for demo mode
          if (savedRole) {
            setUser({
              _id: savedRole === 'admin' ? 'admin_001' : 'student_001',
              name: savedRole === 'admin' ? 'College Admin (Student Section)' : 'Student User',
              email: localStorage.getItem('user_email') || 'student@college.edu',
              role: savedRole,
              rollNumber: savedRole === 'admin' ? '' : '23046491612037'
            });
            setIsAuthenticated(true);
          }
        }
      } else if (savedRole) {
        // Demo mode - use role headers
        setUser({
          _id: savedRole === 'admin' ? 'admin_001' : 'student_001',
          name: savedRole === 'admin' ? 'College Admin (Student Section)' : localStorage.getItem('user_name') || 'Student User',
          email: localStorage.getItem('user_email') || 'student@college.edu',
          role: savedRole,
          rollNumber: savedRole === 'admin' ? '' : '23046491612037'
        });
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    if (data.success && data.user) {
      setUser(data.user);
      setIsAuthenticated(true);
    }
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const axios = (await import('axios')).default;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await axios.post(`${API_BASE_URL}/auth/register`, formData);
    const data = response.data;
    if (data.success && data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', data.user?.role || 'student');
      localStorage.setItem('user_email', data.user?.email || '');
      localStorage.setItem('user_name', data.user?.name || '');
      setUser(data.user);
      setIsAuthenticated(true);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const switchRole = useCallback((role) => {
    localStorage.setItem('user_role', role);
    if (role === 'admin') {
      localStorage.setItem('user_email', 'admin@college.edu');
      localStorage.setItem('user_name', 'College Admin / Student Section');
    } else {
      localStorage.setItem('user_email', 'student@college.edu');
      localStorage.setItem('user_name', 'Student User');
    }
    setUser({
      _id: role === 'admin' ? 'admin_001' : 'student_001',
      name: role === 'admin' ? 'College Admin / Student Section' : 'Student User',
      email: role === 'admin' ? 'admin@college.edu' : 'student@college.edu',
      role,
      rollNumber: role === 'admin' ? '' : '23046491612037'
    });
    setIsAuthenticated(true);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      isAdmin,
      isStudent,
      login,
      register,
      logout,
      switchRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
