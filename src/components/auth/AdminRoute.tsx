import React from 'react';
import { SessionGuard } from './SessionGuard';

export const AdminRoute: React.FC = () => {
  return <SessionGuard requiredRole="admin" />;
};
