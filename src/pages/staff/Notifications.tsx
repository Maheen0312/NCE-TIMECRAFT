import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Info,
  CheckCircle,
  CheckCheck,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { NotificationItem } from '@/types/timetable';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

export default function StaffNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, 'staff', (items) => {
      setNotifications(items);
    });
    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllNotificationsAsRead(user.uid, 'staff');
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Faculty Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Timetable releases, schedule change announcements, and department notifications.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-luna-primary-blue dark:text-cyan-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-gray-100 dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400 space-y-2">
            <Bell className="w-12 h-12 mx-auto opacity-30 text-luna-primary-blue dark:text-cyan-400" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No notifications</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">You're all caught up with your timetable announcements.</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={async () => {
                if (item.id && !item.read) await markNotificationAsRead(item.id);
                if (item.link) navigate(item.link);
              }}
              className={`p-5 flex items-start justify-between gap-4 hover:bg-gray-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                !item.read ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 shrink-0 mt-0.5">
                  <Calendar className="w-5 h-5 text-luna-primary-blue dark:text-cyan-400" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${!item.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.title}
                    </h3>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                    {item.message}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                    {formatTimestamp(item.createdAt)}
                  </p>
                </div>
              </div>

              {item.link && (
                <span className="flex items-center gap-1 text-xs font-bold text-luna-primary-blue dark:text-cyan-400 shrink-0">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
