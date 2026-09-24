import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const StaffRoute: React.FC = () => {
  const { isAuthenticated, isStaff, loading, isAdmin, profile, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-luna-dark-navy flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-bold text-2xl animate-pulse">
          N
        </div>
        <p className="mt-3 text-xs text-cyan-200">Verifying faculty portal authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated && !user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'unauthorized') {
    return <Navigate to="/access-denied" replace />;
  }

  if (!isStaff) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};
