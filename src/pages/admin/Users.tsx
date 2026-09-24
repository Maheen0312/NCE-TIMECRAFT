import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getAllUsers, deleteUser, deleteMultipleUsers, UserProfile } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase/auth';
import { resolvedFirebaseConfig } from '@/firebase/firebase';
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
  CheckSquare,
  Square,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DetailedErrorInfo {
  code: string;
  message: string;
  projectId: string;
  collectionPath: string;
  authenticatedUid: string | null;
  authenticatedEmail: string | null;
}

const FIRESTORE_PRODUCTION_RULES = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    function isEmailAdmin() {
      return isAuthenticated() && 
        request.auth.token != null &&
        'email' in request.auth.token &&
        request.auth.token.email != null &&
        (
          request.auth.token.email == 'admin@nce.edu' ||
          request.auth.token.email == 'maheenmohideen@gmail.com' ||
          request.auth.token.email.matches('.*admin.*@.*') ||
          request.auth.token.email.matches('.*@nce\\\\.edu')
        );
    }

    function isDocAdmin() {
      return isAuthenticated() && (
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         'role' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'Admin', 'ADMIN', 'administrator', 'Administrator']) ||
        (exists(/databases/$(database)/documents/staff/$(request.auth.uid)) &&
         'role' in get(/databases/$(database)/documents/staff/$(request.auth.uid)).data &&
         get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.role in ['admin', 'Admin', 'ADMIN', 'administrator', 'Administrator'])
      );
    }

    function isAdmin() {
      return isEmailAdmin() || isDocAdmin();
    }

    function isStaff() {
      return isAuthenticated() && (
        isAdmin() ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         'role' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['staff', 'Staff', 'STAFF', 'faculty', 'Faculty']) ||
        (exists(/databases/$(database)/documents/staff/$(request.auth.uid)) &&
         'role' in get(/databases/$(database)/documents/staff/$(request.auth.uid)).data &&
         get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.role in ['staff', 'Staff', 'STAFF', 'faculty', 'Faculty'])
      );
    }

    // Users Collection - Authenticated institutional accounts can list and view directory
    match /users/{userId} {
      allow get, list: if isAuthenticated();
      allow create, update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Staff Collection - Authenticated faculty can view directory; Admin/Faculty manage
    match /staff/{staffId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && (isAdmin() || isStaff() || request.auth.uid == staffId);
    }

    // Academic & Scheduling Collections - Authenticated users can read and manage schedules
    match /departments/{deptId} {
      allow read, write: if isAuthenticated();
    }
    
    match /classes/{classId} {
      allow read, write: if isAuthenticated();
    }
    
    match /subjects/{subjectId} {
      allow read, write: if isAuthenticated();
    }
    
    match /rooms/{roomId} {
      allow read, write: if isAuthenticated();
    }
    
    match /labs/{labId} {
      allow read, write: if isAuthenticated();
    }
    
    match /timeSlots/{slotId} {
      allow read, write: if isAuthenticated();
    }

    match /specialSessions/{sessionId} {
      allow read, write: if isAuthenticated();
    }

    match /schedulingRules/{ruleId} {
      allow read, write: if isAuthenticated();
    }
    
    match /timetables/{timetableId} {
      allow read, write: if isAuthenticated();
    }

    match /timetableVersions/{versionId} {
      allow read, write: if isAuthenticated();
    }
    
    match /settings/{settingId} {
      allow read, write: if isAuthenticated();
    }

    match /notifications/{notificationId} {
      allow read, write: if isAuthenticated();
    }
    
    match /audit_logs/{logId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if false;
    }
  }
}`;

export default function AdminUsers() {
  const { userProfile, currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<DetailedErrorInfo | null>(null);
  const [showRulesHelper, setShowRulesHelper] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Bulk delete
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Single user deletion
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    // 1. Verify authentication lifecycle before querying Firestore
    if (authLoading) {
      console.log('[Users Page] Authentication state is still restoring, waiting...');
      return;
    }

    const currentAuthUser = auth.currentUser || currentUser;
    console.log('[Users Page] Executing fetchUsers(). Resolved Auth Context:', {
      authInitialized: !authLoading,
      authenticated: !!currentAuthUser,
      uid: currentAuthUser?.uid || null,
      email: currentAuthUser?.email || null,
      emailVerified: currentAuthUser?.emailVerified || false,
      userProfileRole: userProfile?.role || null,
      projectId: resolvedFirebaseConfig.projectId,
      firestoreDatabaseId: resolvedFirebaseConfig.firestoreDatabaseId,
    });

    if (!currentAuthUser) {
      console.warn('[Users Page] Attempted to fetch users before authenticated user is resolved.');
      setErrorMessage('User session not authenticated. Please log in to access user management.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setDetailedError(null);

    try {
      const usersData = await getAllUsers();
      console.log(`[Users Page] Successfully loaded ${usersData.length} user documents from Firestore.`);
      setUsers(usersData);
      setSelectedUids([]);
    } catch (error: any) {
      const errorDetails: DetailedErrorInfo = {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
        projectId: resolvedFirebaseConfig.projectId,
        collectionPath: 'users',
        authenticatedUid: currentAuthUser?.uid || null,
        authenticatedEmail: currentAuthUser?.email || null,
      };
      console.error('[Users Page] Firebase users collection query failure details:', errorDetails, error);
      setDetailedError(errorDetails);

      if (
        error?.code === 'permission-denied' ||
        (error?.message && error.message.toLowerCase().includes('permission'))
      ) {
        setErrorMessage('Unable to load users. Please check your account permissions.');
      } else {
        setErrorMessage(`Unable to load users. ${error?.message || 'Please check your connection and account permissions.'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, currentUser, userProfile?.role]);

  useEffect(() => {
    if (!authLoading && (currentUser || auth.currentUser)) {
      fetchUsers();
    }
  }, [authLoading, currentUser?.uid, fetchUsers]);

  const filteredUsers = users.filter(u => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    const codeMatch = (u.staffCode || '').toLowerCase().includes(q);
    const deptMatch = (u.department || '').toLowerCase().includes(q);
    const roleMatch = (u.role || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || codeMatch || deptMatch || roleMatch;
  });

  const handleSelectAll = () => {
    const validUids = filteredUsers.map(u => u.uid).filter(Boolean);
    if (selectedUids.length === validUids.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(validUids);
    }
  };

  const toggleSelectOne = (uid: string) => {
    setSelectedUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const confirmSingleDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteUser(userToDelete.uid);
      setUsers(prev => prev.filter(u => u.uid !== userToDelete.uid));
      setSelectedUids(prev => prev.filter(id => id !== userToDelete.uid));
      toast.success(`User "${userToDelete.name || userToDelete.email}" deleted`);
      setUserToDelete(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedUids.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      await deleteMultipleUsers(selectedUids);
      setUsers(prev => prev.filter(u => !selectedUids.includes(u.uid)));
      toast.success(`Successfully deleted ${selectedUids.length} user accounts`);
      setSelectedUids([]);
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete selected user accounts');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const isAllSelected = filteredUsers.length > 0 && selectedUids.length === filteredUsers.length;
  const adminCount = users.filter(u => {
    const r = String(u.role || '').toLowerCase();
    return r === 'admin' || r === 'administrator';
  }).length;
  const staffCount = users.filter(u => {
    const r = String(u.role || '').toLowerCase();
    return r === 'staff' || r === 'faculty';
  }).length;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_PRODUCTION_RULES);
    setCopiedRules(true);
    toast.success('Firestore rules copied to clipboard!');
    setTimeout(() => setCopiedRules(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">User & Account Management</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage authenticated user profiles, faculty roles, and security credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedUids.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
              className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/60 font-bold text-xs"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Selected ({selectedUids.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Total Users</div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : errorMessage ? '—' : users.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Administrators</div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : errorMessage ? '—' : adminCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Staff / Faculty</div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : errorMessage ? '—' : staffCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Registered System Accounts</CardTitle>
            
            {/* Search filter input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, code, dept..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Action header bar when users exist */}
          {!loading && !errorMessage && filteredUsers.length > 0 && (
            <div className="bg-gray-50/50 dark:bg-slate-800/40 px-6 py-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300 hover:text-luna-primary-blue cursor-pointer"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                  <span>
                    {isAllSelected ? 'Deselect All' : 'Select All'} ({filteredUsers.length} users)
                  </span>
                </button>

                {selectedUids.length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold px-2 py-0.5 rounded-md">
                    {selectedUids.length} selected
                  </span>
                )}
              </div>

              {selectedUids.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUids([])}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
              <RefreshCw className="w-7 h-7 animate-spin text-luna-primary-blue dark:text-cyan-400 mb-3" />
              <span className="font-medium">Loading users...</span>
            </div>
          ) : errorMessage ? (
            /* Error State */
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Firestore Access Blocked by Security Rules
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 max-w-lg mb-4">{errorMessage}</p>

              {detailedError && (
                <div className="w-full bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-left text-xs mb-4">
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Diagnostic Trace:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 dark:text-gray-400 font-mono text-[11px]">
                    <div><span className="text-gray-400 font-sans">Firebase Project:</span> <strong className="text-gray-800 dark:text-gray-200">{detailedError.projectId}</strong></div>
                    <div><span className="text-gray-400 font-sans">Collection:</span> <strong className="text-gray-800 dark:text-gray-200">{detailedError.collectionPath}</strong></div>
                    <div><span className="text-gray-400 font-sans">Authenticated Email:</span> <strong className="text-gray-800 dark:text-gray-200">{detailedError.authenticatedEmail || 'None'}</strong></div>
                    <div><span className="text-gray-400 font-sans">User UID:</span> <strong className="text-gray-800 dark:text-gray-200">{detailedError.authenticatedUid ? `${detailedError.authenticatedUid.slice(0, 12)}...` : 'None'}</strong></div>
                    <div className="col-span-1 sm:col-span-2"><span className="text-gray-400 font-sans">Status Code:</span> <span className="text-red-600 dark:text-red-400">{detailedError.code} ({detailedError.message})</span></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  Retry Loading Users
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRulesHelper(!showRulesHelper)}
                  className="text-xs font-semibold"
                >
                  {showRulesHelper ? <ChevronUp className="w-3.5 h-3.5 mr-1.5" /> : <ChevronDown className="w-3.5 h-3.5 mr-1.5" />}
                  {showRulesHelper ? 'Hide Setup Guide' : 'How to Fix: Rules in Firebase Console'}
                </Button>

                <a
                  href={`https://console.firebase.google.com/project/${resolvedFirebaseConfig.projectId}/firestore/rules`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open Firebase Rules Console
                </a>
              </div>

              {/* Rules Accordion */}
              {showRulesHelper && (
                <div className="w-full mt-4 bg-slate-900 text-slate-100 rounded-lg p-4 text-left border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Production Rules for {resolvedFirebaseConfig.projectId}:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRules}
                      className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2 py-1 rounded cursor-pointer"
                    >
                      {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRules ? 'Copied!' : 'Copy Rules'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded max-h-48 overflow-y-auto whitespace-pre">
                    {FIRESTORE_PRODUCTION_RULES}
                  </pre>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Paste these rules into your Firebase Console under <strong>Cloud Firestore → Rules</strong> and click <strong>Publish</strong>, then click &quot;Retry Loading Users&quot; above.
                  </p>
                </div>
              )}
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">
              <Users className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">No users found.</p>
              {searchQuery && (
                <p className="text-xs text-gray-400 mt-1">No accounts match query &quot;{searchQuery}&quot;</p>
              )}
            </div>
          ) : (
            /* Success State - Table */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm text-left">
                <thead className="text-[11px] text-gray-500 dark:text-gray-400 uppercase bg-gray-50/60 dark:bg-slate-800/60 font-semibold">
                  <tr>
                    <th className="w-12 px-6 py-3"></th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Staff Code</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUids.includes(user.uid);
                    const isSelf = user.uid === currentUser?.uid || user.email === userProfile?.email;

                    return (
                      <tr
                        key={user.uid}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/40 dark:bg-blue-950/30' : 'hover:bg-gray-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(user.uid)}
                            className="w-4 h-4 rounded text-luna-primary-blue border-gray-300 dark:border-slate-700 focus:ring-luna-primary-blue cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-luna-primary-blue/10 dark:bg-cyan-950/50 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center font-bold mr-2.5 text-xs">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-1.5 text-gray-900 dark:text-white">
                                {user.name || '—'}
                                {isSelf && (
                                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">UID: {user.uid ? `${user.uid.slice(0, 8)}...` : '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          <div className="flex items-center text-xs">
                            <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400 dark:text-gray-500 shrink-0" />
                            <span>{user.email || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              user.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {user.role ? user.role.toUpperCase() : 'STAFF'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {user.staffCode ? (
                            <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200">
                              {user.staffCode}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{user.department || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.active !== false ? (
                            <span className="inline-flex items-center text-green-700 dark:text-green-400 text-xs font-medium bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-200/60 dark:border-green-800/60">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600 dark:text-green-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-700 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200/60 dark:border-red-800/60">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-red-600 dark:text-red-400" />
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUserToDelete(user)}
                            className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 dark:hover:border-red-800 p-1.5 h-8 w-8"
                            title="Delete User Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Single User Delete Confirmation Modal */}
      {userToDelete && (
        <DeleteConfirmModal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={confirmSingleDelete}
          title="Delete User Account"
          itemName={userToDelete.name || userToDelete.email}
          description={`Are you sure you want to permanently delete user "${userToDelete.name || userToDelete.email}" (Staff Code: ${userToDelete.staffCode || '—'})? This will revoke all database profile records.`}
          isDeleting={deleteLoading}
        />
      )}

      {/* Bulk User Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <DeleteConfirmModal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={confirmBulkDelete}
          title={`Delete ${selectedUids.length} User Accounts`}
          itemName={`${selectedUids.length} user accounts`}
          description={`Are you sure you want to permanently delete all ${selectedUids.length} selected user profiles from Firestore? This action is irreversible.`}
          isDeleting={bulkDeleteLoading}
        />
      )}
    </div>
  );
}
