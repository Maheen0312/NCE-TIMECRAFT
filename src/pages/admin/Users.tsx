import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getAllUsers, deactivateOrRemoveUser, reactivateUser, UserProfile } from '@/services/userService';
import { getActiveUserSessions, subscribeToActiveSessions, UserSession } from '@/services/sessionService';
import { useAuth } from '@/contexts/AuthContext';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Trash2,
  RefreshCw,
  Mail,
  CheckCircle2,
  XCircle,
  Building2,
  Radio,
  Clock,
  LogOut,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminUsers() {
  const { userProfile, currentUser, loading: authLoading } = useAuth();
  
  // Tab state: 'active' (default: currently logged-in users only) vs 'all' (all registered accounts)
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');

  // Active Sessions state
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);

  // All Users state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Revoke / Remove User state
  const [userToRevoke, setUserToRevoke] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Fetch active sessions
  const fetchActiveSessions = useCallback(async () => {
    setActiveLoading(true);
    try {
      const sessions = await getActiveUserSessions();
      setActiveSessions(sessions);
    } catch (err) {
      console.warn('Notice fetching active sessions:', err);
    } finally {
      setActiveLoading(false);
    }
  }, []);

  // Real-time listener for active sessions
  useEffect(() => {
    fetchActiveSessions();

    const unsubscribe = subscribeToActiveSessions((updatedSessions) => {
      setActiveSessions(updatedSessions);
      setActiveLoading(false);
    });

    // Also periodic poll every 25 seconds
    const interval = setInterval(fetchActiveSessions, 25000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchActiveSessions]);

  // Fetch all users (for All Accounts tab)
  const fetchAllUsers = useCallback(async () => {
    setAllLoading(true);
    try {
      const usersData = await getAllUsers();
      setAllUsers(usersData);
    } catch (err: any) {
      console.warn('Notice fetching all users:', err);
      toast.error('Could not load user accounts directory');
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllUsers();
    }
  }, [activeTab, fetchAllUsers]);

  // Handle Revoking / Removing a user
  const handleConfirmRevoke = async () => {
    if (!userToRevoke) return;
    setRevokeLoading(true);
    try {
      await deactivateOrRemoveUser(userToRevoke.uid);
      
      // Update local state immediately
      setActiveSessions(prev => prev.filter(s => s.uid !== userToRevoke.uid));
      setAllUsers(prev => prev.map(u => u.uid === userToRevoke.uid ? { ...u, active: false, accountStatus: 'removed', role: 'unauthorized' } : u));
      
      toast.success(`Access revoked for ${userToRevoke.name || userToRevoke.email}. The user has been disconnected.`);
      setUserToRevoke(null);
    } catch (err: any) {
      console.error('Failed to revoke user access:', err);
      toast.error(err.message || 'Failed to revoke user access');
    } finally {
      setRevokeLoading(false);
    }
  };

  // Handle Reactivating a user
  const handleReactivate = async (u: UserProfile) => {
    try {
      await reactivateUser(u.uid, (u.staffCode ? 'staff' : 'admin'));
      setAllUsers(prev => prev.map(item => item.uid === u.uid ? { ...item, active: true, accountStatus: 'active', role: (u.staffCode ? 'staff' : 'admin') } : item));
      toast.success(`User ${u.name || u.email} has been reactivated.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate user');
    }
  };

  // Filtered active sessions
  const filteredSessions = activeSessions.filter(s => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.staffCode || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q)
    );
  });

  // Filtered all users
  const filteredAllUsers = allUsers.filter(u => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.staffCode || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  const formatTime = (ts: any): string => {
    if (!ts) return 'Just now';
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return 'Active just now';
      if (diffSec < 90) return '1 minute ago';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} minutes ago`;
      const diffHours = Math.floor(diffMin / 60);
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                User Session Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor currently active sessions and manage application access in real time.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Active Sessions ({activeSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            All Accounts Directory
          </button>
        </div>
      </div>

      {/* Search and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'active' ? "Search active logged-in users..." : "Search all registered accounts..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === 'active' ? fetchActiveSessions : fetchAllUsers}
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(activeTab === 'active' ? activeLoading : allLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* TAB 1: CURRENTLY ACTIVE / LOGGED-IN USERS ONLY */}
      {activeTab === 'active' && (
        <Card className="border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <CardTitle className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Currently Logged-In Users ({filteredSessions.length})
              </CardTitle>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-500">
              Auto-refreshed via Firebase presence heartbeat
            </span>
          </CardHeader>

          <CardContent className="p-0">
            {activeLoading && activeSessions.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                Querying active user sessions...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                <Radio className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="font-semibold text-gray-700 dark:text-gray-300">No other active users online right now</p>
                <p className="text-xs text-gray-400 mt-1">
                  Users appear here automatically when they log in, and disappear when they log out or their session expires.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 dark:bg-slate-900/80 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Staff Code / Dept</th>
                      <th className="py-3 px-4">Session Started</th>
                      <th className="py-3 px-4">Last Active</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredSessions.map((session) => {
                      const isCurrentUser = session.uid === currentUser?.uid;
                      return (
                        <tr key={session.uid} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  {(session.name || session.email || 'U')[0].toUpperCase()}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {session.name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {session.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              session.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {session.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              {session.role === 'admin' ? 'Administrator' : 'Faculty Staff'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300">
                            <div>
                              <span className="font-semibold">{session.staffCode || '—'}</span>
                              <div className="text-[11px] text-gray-400">{session.department || 'Administration'}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {formatTime(session.sessionStartedAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {formatTime(session.lastSeen)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isCurrentUser ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUserToRevoke({ uid: session.uid, name: session.name, email: session.email })}
                                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800 text-xs py-1 h-7"
                              >
                                <UserX className="w-3.5 h-3.5 mr-1" />
                                Revoke Access
                              </Button>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">Current Session</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: ALL REGISTERED ACCOUNTS DIRECTORY */}
      {activeTab === 'all' && (
        <Card className="border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-800 dark:text-slate-200">
              Institutional User Accounts Directory ({filteredAllUsers.length})
            </CardTitle>
            <span className="text-[11px] text-gray-400 dark:text-slate-500">
              Stored in Firestore users collection
            </span>
          </CardHeader>

          <CardContent className="p-0">
            {allLoading && allUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                Loading accounts directory...
              </div>
            ) : filteredAllUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                No accounts found matching your query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 dark:bg-slate-900/80 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Staff Code / Dept</th>
                      <th className="py-3 px-4">Authorization Status</th>
                      <th className="py-3 px-4 text-right">Access Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredAllUsers.map((u) => {
                      const isCurrentUser = u.uid === currentUser?.uid;
                      const isDeactivated = u.active === false || u.accountStatus === 'removed' || u.role === 'unauthorized';
                      return (
                        <tr key={u.uid} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300">
                                {(u.name || u.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {u.name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              u.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {u.role === 'admin' ? 'Administrator' : 'Faculty Staff'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300">
                            <div>
                              <span className="font-semibold">{u.staffCode || '—'}</span>
                              <div className="text-[11px] text-gray-400">{u.department || 'Administration'}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isDeactivated ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                <XCircle className="w-3 h-3" />
                                Deactivated / Access Removed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Authorized
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isCurrentUser && (
                              <div className="flex items-center justify-end gap-2">
                                {isDeactivated ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReactivate(u)}
                                    className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-xs py-1 h-7"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                                    Reactivate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUserToRevoke({ uid: u.uid, name: u.name, email: u.email })}
                                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800 text-xs py-1 h-7"
                                  >
                                    <UserX className="w-3.5 h-3.5 mr-1" />
                                    Deactivate Access
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal for Revoking Access */}
      <DeleteConfirmModal
        isOpen={!!userToRevoke}
        title="Revoke User Access Immediately?"
        itemName={userToRevoke?.name || userToRevoke?.email || 'this user'}
        description="This will immediately terminate their active session, kick them out to the Login page, and prevent any further access until an administrator re-authorizes the account."
        isLoading={revokeLoading}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setUserToRevoke(null)}
      />
    </div>
  );
}
