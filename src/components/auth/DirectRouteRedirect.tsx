import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SessionGuard } from './SessionGuard';

interface DirectRouteProps {
  adminTarget: string;
  staffTarget?: string;
  requiredRole?: 'admin' | 'staff' | 'any';
}

export const DirectRouteRedirect: React.FC<DirectRouteProps> = ({
  adminTarget,
  staffTarget,
  requiredRole = 'any',
}) => {
  const { isAdmin, isStaff } = useAuth();

  return (
    <SessionGuard requiredRole={requiredRole}>
      {isAdmin ? (
        <Navigate to={adminTarget} replace />
      ) : isStaff && staffTarget ? (
        <Navigate to={staffTarget} replace />
      ) : (
        <Navigate to={adminTarget} replace />
      )}
    </SessionGuard>
  );
};
