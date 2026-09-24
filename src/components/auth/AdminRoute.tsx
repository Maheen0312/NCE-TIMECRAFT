import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const AdminRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, loading, isStaff, profile, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-luna-dark-navy flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-bold text-2xl animate-pulse">
          N
        </div>
        <p className="mt-3 text-xs text-blue-200">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated && !user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'unauthorized') {
    return <Navigate to="/access-denied" replace />;
  }

  if (!isAdmin) {
    if (isStaff) {
      toast.error("You don't have permission to access the Administrator Portal.", { id: 'admin-access' });
      return <Navigate to="/staff/dashboard" replace />;
    }
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};
