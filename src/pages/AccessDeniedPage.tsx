import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, Home, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { logoutUser, profile, isAdmin } = useAuth();

  const isUnauthorized = profile?.role === 'unauthorized';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-slate-800 space-y-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldX className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-red-500 tracking-widest uppercase">
            Error 403 • Authorization Required
          </span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isUnauthorized 
              ? 'Access Denied — Your account is not authorized as Staff'
              : 'Access Denied'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {isUnauthorized ? (
              <>
                The email account <strong className="text-gray-800 dark:text-gray-200">{profile?.email}</strong> is not listed in the Administrator's authorized faculty directory. Only pre-authorized staff accounts can access the Staff Portal. Please contact your department administrator to register your email address.
              </>
            ) : (
              <>
                You do not have permissions to view this resource. Your role is currently set to{' '}
                <strong className="capitalize text-gray-800 dark:text-gray-200">{profile?.role || 'Guest'}</strong>.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex-1 px-4 py-2.5 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </button>
          )}
          <button
            onClick={async () => {
              await logoutUser();
              navigate('/login');
            }}
            className="flex-1 px-4 py-2.5 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;

