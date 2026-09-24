import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Monitor,
  DoorOpen,
  Clock,
  Settings,
  Calendar,
  Sparkles,
  History,
  Shield,
  BarChart3,
  ShieldAlert,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  Command,
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
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Timetable', href: '/admin/timetable', icon: Calendar },
  { name: 'Generate', href: '/admin/generate', icon: Sparkles },
  { name: 'Staff', href: '/admin/staff', icon: Users },
  { name: 'Subjects', href: '/admin/subjects', icon: BookOpen },
  { name: 'Labs', href: '/admin/labs', icon: Monitor },
  { name: 'Rooms', href: '/admin/rooms', icon: DoorOpen },
  { name: 'Time Slots', href: '/admin/time-slots', icon: Clock },
  { name: 'Scheduling Rules', href: '/admin/rules', icon: Settings },
  { name: 'Special Sessions', href: '/admin/special-sessions', icon: Calendar },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'History', href: '/admin/history', icon: History },
  { name: 'Users', href: '/admin/users', icon: Shield },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logoutUser } = useAuth();

  const currentRoute = navigation.find((n) => n.href === location.pathname)?.name || 'Admin';

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
        role="admin"
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-luna-dark-navy dark:bg-[#001026] text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col border-r border-white/5',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 bg-luna-dark-navy dark:bg-[#001026] border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-0.5 rounded-lg bg-white/10 border border-white/15">
              <CollegeLogo size={32} variant="white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight block leading-none text-white">
                NCE Timecraft
              </span>
              <span className="text-[10px] text-luna-cyan/90 font-medium tracking-wide">
                Nellai College of Engg
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

        {/* Quick Search Shortcut Bar inside sidebar */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-400 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search & jump...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white/10 rounded text-gray-300">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-3 py-2 text-xs font-semibold rounded-xl transition-all',
                  isActive
                    ? 'bg-luna-primary-blue text-white shadow-sm'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-4 w-4 transition-colors',
                    isActive ? 'text-luna-light-cyan' : 'text-gray-400 group-hover:text-white'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-white/10 bg-black/20 text-[11px] text-gray-400 flex items-center justify-between">
          <span className="font-semibold text-gray-300">v5.0 Production</span>
          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-bold">
            Live
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
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
            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl border border-gray-200/80 dark:border-slate-700 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search commands...</span>
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700">
                Ctrl K
              </kbd>
            </button>

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Notifications Dropdown */}
            <NotificationDropdown role="admin" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center focus:outline-none ring-2 ring-transparent hover:ring-luna-primary-blue/40 rounded-full transition-all"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-luna-primary-blue to-luna-cyan flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {profile?.name?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-60 rounded-2xl shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 z-50 divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden"
                    >
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {profile?.name || 'Admin User'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {profile?.email || 'admin@nce.edu'}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {profile?.role || 'Administrator'}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/admin/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full text-left flex items-center px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Settings className="mr-2 h-4 w-4 text-gray-400" />
                          System Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left flex items-center px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50 dark:bg-slate-950 pb-20 md:pb-8">
          <div className="py-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Persistent Bottom Nav */}
      <MobileBottomNav role="admin" />
    </div>
  );
}
