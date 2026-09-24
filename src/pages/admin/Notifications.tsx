import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  Calendar,
  Info,
  Trash2,
  CheckCheck,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '@/types/timetable';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmModal } from '@/components/common/ConfirmModal';

export default function AdminNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'TIMETABLE' | 'CONFLICT' | 'AI'>('ALL');
  const [clearModalOpen, setClearModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, 'admin', (items) => {
      setNotifications(items);
    });
    return () => unsub();
  }, [user]);

  const filtered = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return !item.read;
    if (activeTab === 'TIMETABLE')
      return (
        item.type === 'TIMETABLE_PUBLISHED' ||
        item.type === 'TIMETABLE_UPDATED' ||
        item.type === 'GENERATION_COMPLETED'
      );
    if (activeTab === 'CONFLICT') return item.type === 'CONFLICT_DETECTED';
    if (activeTab === 'AI') return item.type === 'AI_ANALYSIS_COMPLETED';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllNotificationsAsRead(user.uid, 'admin');
    }
  };

  const handleClearAll = async () => {
    if (user) {
      await clearAllNotifications(user.uid, 'admin');
      setClearModalOpen(false);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'TIMETABLE_PUBLISHED':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'CONFLICT_DETECTED':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'AI_ANALYSIS_COMPLETED':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'GENERATION_COMPLETED':
        return <Layers className="w-5 h-5 text-blue-500" />;
      case 'TIMETABLE_UPDATED':
        return <Calendar className="w-5 h-5 text-cyan-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
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
      <ConfirmModal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        onConfirm={handleClearAll}
        title="Clear All Notifications?"
        message="This will permanently remove all administrative notifications. This action cannot be undone."
        confirmText="Clear All"
        type="danger"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              System Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time administrative alerts for published schedules, detected conflicts, and AI optimizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950 text-luna-primary-blue dark:text-cyan-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => setClearModalOpen(true)}
              className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear history</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Alerts' },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'TIMETABLE', label: 'Timetable Releases' },
          { key: 'CONFLICT', label: 'Constraint Conflicts' },
          { key: 'AI', label: 'AI Intelligence' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              activeTab === tab.key
                ? 'bg-luna-dark-navy text-white dark:bg-luna-primary-blue'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-gray-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500 space-y-2">
            <Bell className="w-12 h-12 mx-auto opacity-20" />
            <p className="text-sm font-semibold">No notifications in this view</p>
            <p className="text-xs text-gray-400">Everything is up-to-date and running smoothly.</p>
          </div>
        ) : (
          filtered.map((item) => (
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
                  {getIcon(item.type)}
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

              <div className="flex items-center gap-2 shrink-0">
                {item.link && (
                  <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-luna-primary-blue dark:text-cyan-400">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.id) deleteNotification(item.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
