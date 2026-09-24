import React from 'react';
import { SessionGuard } from './SessionGuard';

export const StaffRoute: React.FC = () => {
  return <SessionGuard requiredRole="staff" />;
};
