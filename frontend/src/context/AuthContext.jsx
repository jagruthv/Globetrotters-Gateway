import React, { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(authService.getCurrentUser());
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await authService.register(userData);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    role: user?.role,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ROLE_ADMIN',
    isStaff: user?.role === 'ROLE_STAFF' || user?.role === 'ROLE_ADMIN',
    isTourist: user?.role === 'ROLE_TOURIST',
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
