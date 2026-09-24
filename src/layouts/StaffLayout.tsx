import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Clock,
  Users,
  User,
  Bell,
  Menu,
  X,
  LogOut,
  Search,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { CommandPalette } from '@/components/common/CommandPalette';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { CollegeLogo } from '@/components/common/CollegeLogo';

const navigation = [
  { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
  { name: 'My Timetable', href: '/staff/timetable', icon: Calendar },
  { name: 'Dept Timetable', href: '/staff/department-timetable', icon: Users },
  { name: 'My Subjects', href: '/staff/subjects', icon: BookOpen },
  { name: 'My Hours', href: '/staff/hours', icon: Clock },
  { name: 'Notifications', href: '/staff/notifications', icon: Bell },
  { name: 'Profile', href: '/staff/profile', icon: User },
];

export default function StaffLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logoutUser } = useAuth();

  const currentRoute = navigation.find((n) => n.href === location.pathname)?.name || 'Staff';

  // Global Ctrl + K / Cmd + K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex overflow-hidden text-gray-900 dark:text-gray-100">
      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        role="staff"
      />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-luna-dark-navy/60 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-luna-dark-navy dark:bg-[#001026] text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col border-r border-white/10',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10 shrink-0 bg-luna-dark-navy dark:bg-[#001026]">
          <div className="flex items-center space-x-2.5">
            <div className="p-0.5 rounded-lg bg-white/10 border border-white/15">
              <CollegeLogo size={32} variant="white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight block leading-none text-white">
                NCE Timecraft
              </span>
              <span className="text-[10px] text-cyan-300 font-bold tracking-wide">
                Faculty Portal
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Search inside Sidebar */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-300" />
              <span>Search portal...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white/10 rounded text-gray-300 border border-white/20">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all',
                  isActive
                    ? 'bg-luna-primary-blue text-white shadow-xs'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-4 w-4 transition-colors',
                    isActive
                      ? 'text-cyan-300'
                      : 'text-gray-400 group-hover:text-gray-200'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Staff Profile in Sidebar */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-white/5">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-luna-primary-blue border border-cyan-400/30 flex items-center justify-center text-white text-xs font-bold">
              {profile?.name?.substring(0, 2).toUpperCase() || 'ST'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {profile?.name || 'Faculty Member'}
              </p>
              <p className="text-[11px] font-semibold text-cyan-300">
                Code: {profile?.staffCode || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-bold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 z-40 relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-luna-dark-navy dark:text-white">
              {currentRoute}
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />
            <NotificationDropdown role="staff" />

            <Link to="/staff/profile" className="flex items-center focus:outline-none ring-2 ring-transparent hover:ring-luna-primary-blue/40 rounded-full transition-all cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-luna-primary-blue to-luna-cyan flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {profile?.name?.substring(0, 2).toUpperCase() || 'ST'}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50 dark:bg-slate-950 pb-20 md:pb-8">
          <div className="py-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Persistent Bottom Nav */}
      <MobileBottomNav role="staff" />
    </div>
  );
}
