import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Info,
  Calendar,
  Layers,
  X,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';
import { NotificationItem } from '@/types/timetable';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationDropdownProps {
  role: 'admin' | 'staff';
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ role }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, role, (items) => {
      setNotifications(items);
    });
    return () => unsub();
  }, [user, role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (notif.id && !notif.read) {
      await markNotificationAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    } else {
      navigate(role === 'admin' ? '/admin/notifications' : '/staff/notifications');
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      await markAllNotificationsAsRead(user.uid, role);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TIMETABLE_PUBLISHED':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'CONFLICT_DETECTED':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'AI_ANALYSIS_COMPLETED':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'GENERATION_COMPLETED':
        return <Layers className="w-4 h-4 text-blue-500" />;
      case 'TIMETABLE_UPDATED':
        return <Calendar className="w-4 h-4 text-cyan-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-gray-800 dark:text-gray-100 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-luna-primary-blue hover:text-luna-deep-blue dark:text-cyan-400 flex items-center gap-1 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
                <p className="text-[10px] text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.slice(0, 8).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                    !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 shrink-0">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-bold truncate ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(role === 'admin' ? '/admin/notifications' : '/staff/notifications');
              }}
              className="text-xs font-bold text-luna-primary-blue dark:text-cyan-400 hover:underline flex items-center justify-center gap-1 w-full"
            >
              <span>View all notifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
