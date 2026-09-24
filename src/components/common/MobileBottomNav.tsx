import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  MoreHorizontal,
  Bell,
  BarChart3,
  Users,
  BookOpen,
  DoorOpen,
  FlaskConical,
  Settings,
  ShieldAlert,
  X,
  Lock,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MobileBottomNavProps {
  role: 'admin' | 'staff';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Timetable', path: '/admin/timetable', icon: Calendar },
    { label: 'Generate', path: '/admin/generate', icon: Sparkles },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
  ];

  const staffNavItems = [
    { label: 'Home', path: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'My Timetable', path: '/staff/timetable', icon: Calendar },
    { label: 'Notifications', path: '/staff/notifications', icon: Bell },
    { label: 'Department', path: '/staff/department-timetable', icon: Users },
  ];

  const navItems = role === 'admin' ? adminNavItems : staffNavItems;

  const moreLinks = [
    { label: 'Faculty & Staff', path: '/admin/staff', icon: Users, color: 'text-indigo-500' },
    { label: 'Subjects & Curriculum', path: '/admin/subjects', icon: BookOpen, color: 'text-amber-500' },
    { label: 'Rooms & Classrooms', path: '/admin/rooms', icon: DoorOpen, color: 'text-teal-500' },
    { label: 'Laboratories', path: '/admin/labs', icon: FlaskConical, color: 'text-pink-500' },
    { label: 'Special Sessions', path: '/admin/special-sessions', icon: Lock, color: 'text-cyan-500' },
    { label: 'College Settings', path: '/admin/settings', icon: Settings, color: 'text-gray-500' },
  ];

  return (
    <>
      {/* Drawer for More items */}
      {showMoreDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150 md:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-gray-200 dark:border-slate-800 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <span className="font-bold text-sm text-gray-900 dark:text-white">
                All Admin Modules
              </span>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.path}
                    onClick={() => {
                      setShowMoreDrawer(false);
                      navigate(link.path);
                    }}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex flex-col items-start gap-2 text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon className={`w-5 h-5 ${link.color}`} />
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">
                      {link.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around md:hidden shadow-lg no-print">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-luna-primary-blue dark:text-cyan-400 font-bold scale-105'
                  : 'text-gray-500 dark:text-gray-400 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}

        {role === 'admin' && (
          <button
            onClick={() => setShowMoreDrawer(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              showMoreDrawer
                ? 'text-luna-primary-blue dark:text-cyan-400 font-bold'
                : 'text-gray-500 dark:text-gray-400 font-medium'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        )}
      </div>
    </>
  );
};
