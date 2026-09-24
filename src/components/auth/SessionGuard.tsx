import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface SessionGuardProps {
  requiredRole?: 'admin' | 'staff' | 'any';
  children?: React.ReactNode;
}

/**
 * Centralized Authorization & Session Guard
 * Flow:
 * 1. Firebase Auth state loading -> render verifying screen
 * 2. Unauthenticated user -> redirect to /login
 * 3. Profile missing -> redirect to /login
 * 4. Account inactive or removed -> redirect to /login with removal message
 * 5. Role unauthorized -> redirect to /access-denied
 * 6. Role-specific validation -> allow route or redirect
 */
export const SessionGuard: React.FC<SessionGuardProps> = ({ requiredRole = 'any', children }) => {
  const { 
    user, 
    profile, 
    loading, 
    isAuthenticated, 
    isAdmin, 
    isStaff, 
    accessRevokedMessage 
  } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-luna-dark-navy flex flex-col items-center justify-center text-white">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-luna-cyan to-luna-primary-blue flex items-center justify-center font-bold text-2xl shadow-xl animate-pulse">
          N
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-white">NCE Timecraft</h2>
        <p className="mt-2 text-xs text-cyan-200">Verifying security session and authorization...</p>
      </div>
    );
  }

  // 1. Account explicitly deactivated or removed by administrator
  if (accessRevokedMessage || profile?.accountStatus === 'removed' || (profile && profile.active === false)) {
    toast.error(accessRevokedMessage || 'Your account access has been removed by the administrator.', {
      id: 'session-guard-revoked',
      duration: 6000,
    });
    return <Navigate to="/login" state={{ error: 'Your account access has been removed by the administrator.', from: location }} replace />;
  }

  // 2. Firebase Auth state - unauthenticated
  if (!user || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Profile existence check
  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Role validation
  if (profile.role === 'unauthorized' || profile.role === 'unrecognized') {
    return <Navigate to="/access-denied" replace />;
  }

  // 5. Admin-only route check
  if (requiredRole === 'admin') {
    if (!isAdmin) {
      if (isStaff) {
        toast.error("You don't have permission to access the Administrator Portal.", { id: 'admin-denied' });
        return <Navigate to="/staff/dashboard" replace />;
      }
      return <Navigate to="/access-denied" replace />;
    }
  }

  // 6. Staff-only route check
  if (requiredRole === 'staff') {
    if (!isStaff) {
      if (isAdmin) {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/access-denied" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default SessionGuard;
