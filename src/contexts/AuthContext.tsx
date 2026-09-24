import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/auth';
import { UserProfile, updateLastLogin } from '@/services/userService';
import { logout as authServiceLogout } from '@/services/authService';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { StaffProfile } from '@/types/timetable';
import { startUserSession, sendHeartbeat, endUserSession } from '@/services/sessionService';
import { toast } from 'react-hot-toast';

const logAuthFirestoreError = (label: string, err: any, currentUser: User | null, targetUid?: string | null) => {
  console.warn(label, {
    code: err?.code || 'unknown',
    message: err?.message || String(err),
    currentUserUid: currentUser?.uid || null,
    currentUserEmail: currentUser?.email || null,
    targetUid: targetUid || currentUser?.uid || null,
  });
};

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  profile: UserProfile | null;
  userProfile: UserProfile | null;
  authorizedStaff: StaffProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  accessRevokedMessage: string | null;
  setAuthProfile: (profile: UserProfile) => void;
  refreshUserProfile: (targetUid?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  clearRevocationMessage: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  currentUser: null,
  profile: null,
  userProfile: null,
  authorizedStaff: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  isStaff: false,
  accessRevokedMessage: null,
  setAuthProfile: () => {},
  refreshUserProfile: async () => {},
  logoutUser: async () => {},
  clearRevocationMessage: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authorizedStaff, setAuthorizedStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessRevokedMessage, setAccessRevokedMessage] = useState<string | null>(null);

  const clearRevocationMessage = () => setAccessRevokedMessage(null);

  const setAuthProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    sessionStorage.setItem('nce_active_uid', newProfile.uid);
    startUserSession({
      uid: newProfile.uid,
      email: newProfile.email,
      name: newProfile.name,
      role: newProfile.role,
      staffCode: newProfile.staffCode,
      department: newProfile.department,
    }).catch(console.warn);
  };

  const logoutUser = async () => {
    if (user?.uid) {
      await endUserSession(user.uid);
    }
    sessionStorage.clear();
    setProfile(null);
    setUser(null);
    setAuthorizedStaff(null);
    try {
      await authServiceLogout();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const resolveUserProfile = async (firebaseUser: User | null, storedUid?: string | null) => {
    const currentUser = firebaseUser || auth.currentUser;
    const activeUid = currentUser?.uid || storedUid;
    if (!activeUid) {
      setUser(null);
      setProfile(null);
      setAuthorizedStaff(null);
      setLoading(false);
      return;
    }

    // Guard against unauthenticated Firestore reads that violate security rules
    if (!currentUser) {
      setUser(null);
      setProfile(null);
      setAuthorizedStaff(null);
      sessionStorage.removeItem('nce_active_uid');
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', activeUid);
    let existingData: UserProfile | null = null;

    try {
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          existingData = userDocSnap.data() as UserProfile;
        }
      } catch (readErr) {
        logAuthFirestoreError('Initial user profile read failed:', readErr, currentUser, activeUid);
      }

      const normalizedEmail = (currentUser.email || existingData?.email || '').toLowerCase().trim();

      // If Firestore profile was not retrieved, consult authoritative server profile directory
      if (!existingData && (activeUid || normalizedEmail)) {
        try {
          const res = await fetch(`/api/auth/profile?uid=${encodeURIComponent(activeUid)}&email=${encodeURIComponent(normalizedEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              existingData = data.profile as UserProfile;
            }
          }
        } catch (serverErr) {
          console.warn('Notice querying server profile directory:', serverErr);
        }
      }

      // Check if user account was deactivated or removed by administrator
      if (existingData && (existingData.active === false || (existingData as any).accountStatus === 'removed')) {
        console.warn('[AuthContext] User account is deactivated or removed by administrator:', activeUid);
        if (activeUid) {
          await endUserSession(activeUid);
        }
        await auth.signOut();
        sessionStorage.clear();
        setUser(null);
        setProfile(null);
        setAuthorizedStaff(null);
        const msg = 'Your account access has been removed by the administrator.';
        setAccessRevokedMessage(msg);
        toast.error(msg, { id: 'account-revoked-init', duration: 7000 });
        setLoading(false);
        return;
      }

      // 1. Admin Verification - Strictly verified from database or institution admin credentials
      const roleStr = String(existingData?.role || existingData?.Role || existingData?.userRole || '').trim().toLowerCase();
      const isRoleAdmin = roleStr === 'admin' || roleStr === 'administrator';
      const isUserAdmin = 
        isRoleAdmin || 
        normalizedEmail === 'admin@nce.edu' ||
        normalizedEmail === 'maheenmohideen@gmail.com' ||
        normalizedEmail === 'synedcdev@gmail.com' ||
        currentUser.email?.toLowerCase().trim() === 'admin@nce.edu' ||
        currentUser.email?.toLowerCase().trim() === 'maheenmohideen@gmail.com' ||
        currentUser.email?.toLowerCase().trim() === 'synedcdev@gmail.com';

      if (isUserAdmin) {
        const adminProfile: UserProfile = {
          uid: activeUid,
          name: existingData?.name || currentUser.displayName || (normalizedEmail === 'maheenmohideen@gmail.com' ? 'Administrator' : 'Dr. Administrator'),
          email: normalizedEmail || currentUser.email || 'admin@nce.edu',
          role: 'admin',
          staffCode: existingData?.staffCode || null,
          staffId: existingData?.staffId || null,
          active: true,
          createdAt: existingData?.createdAt || serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        // Persist admin profile to Firestore users collection so it appears in Admin User Management
        try {
          await setDoc(userDocRef, adminProfile, { merge: true });
        } catch (err) {
          logAuthFirestoreError('Failed to persist admin profile in Firestore users collection:', err, currentUser, activeUid);
        }

        // Synchronize with server-side authoritative directory
        try {
          await fetch('/api/admin/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminProfile),
          });
        } catch {
          // ignore
        }

        setUser(currentUser);
        setProfile(adminProfile);
        setAuthorizedStaff(null);
        sessionStorage.setItem('nce_active_uid', activeUid);
        updateLastLogin(activeUid).catch(console.warn);
        startUserSession({
          uid: activeUid,
          email: adminProfile.email,
          name: adminProfile.name,
          role: 'admin',
          department: adminProfile.department || 'Administration',
        }).catch(console.warn);
        setLoading(false);
        return;
      }

      // 2. Staff Authorization strictly from admin's staff collection
      let matchedStaff: StaffProfile | null = null;

      if (normalizedEmail) {
        try {
          const staffQuery = query(collection(db, 'staff'), where('email', '==', normalizedEmail));
          const staffSnap = await getDocs(staffQuery);
          if (!staffSnap.empty) {
            const sDoc = staffSnap.docs[0];
            matchedStaff = { id: sDoc.id, ...sDoc.data() } as StaffProfile;
          }
        } catch (err) {
          logAuthFirestoreError('Error checking staff by email:', err, currentUser, activeUid);
        }
      }

      if (!matchedStaff && currentUser.email && currentUser.email.trim() !== normalizedEmail) {
        try {
          const staffQuery = query(collection(db, 'staff'), where('email', '==', currentUser.email.trim()));
          const staffSnap = await getDocs(staffQuery);
          if (!staffSnap.empty) {
            const sDoc = staffSnap.docs[0];
            matchedStaff = { id: sDoc.id, ...sDoc.data() } as StaffProfile;
          }
        } catch (err) {
          logAuthFirestoreError('Error checking staff by raw email:', err, currentUser, activeUid);
        }
      }

      if (!matchedStaff) {
        try {
          const staffQuery = query(collection(db, 'staff'), where('userId', '==', activeUid));
          const staffSnap = await getDocs(staffQuery);
          if (!staffSnap.empty) {
            const sDoc = staffSnap.docs[0];
            matchedStaff = { id: sDoc.id, ...sDoc.data() } as StaffProfile;
          }
        } catch (err) {
          logAuthFirestoreError('Error checking staff by userId:', err, currentUser, activeUid);
        }
      }

      if (!matchedStaff && existingData?.staffId) {
        try {
          const sSnap = await getDoc(doc(db, 'staff', existingData.staffId));
          if (sSnap.exists()) {
            matchedStaff = { id: sSnap.id, ...sSnap.data() } as StaffProfile;
          }
        } catch (err) {
          logAuthFirestoreError('Error checking staff by staffId:', err, currentUser, activeUid);
        }
      }

      if (!matchedStaff && existingData?.staffCode) {
        try {
          const sSnap = await getDoc(doc(db, 'staff', `staff_${existingData.staffCode}`));
          if (sSnap.exists()) {
            matchedStaff = { id: sSnap.id, ...sSnap.data() } as StaffProfile;
          }
        } catch (err) {
          logAuthFirestoreError('Error checking staff by staffCode:', err, currentUser, activeUid);
        }
      }

      // 3. Authorization Decision
      if (matchedStaff && matchedStaff.active !== false) {
        // Authorized Staff Member
        if (matchedStaff.userId !== activeUid) {
          try {
            await updateDoc(doc(db, 'staff', matchedStaff.id), {
              userId: activeUid,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            logAuthFirestoreError('Failed to link staff userId:', err, currentUser, activeUid);
          }
        }

        const verifiedStaffProfile: UserProfile = {
          uid: activeUid,
          name: matchedStaff.name || firebaseUser?.displayName || 'Faculty Member',
          email: normalizedEmail || matchedStaff.email,
          role: 'staff',
          staffCode: matchedStaff.staffCode,
          staffId: matchedStaff.id,
          active: true,
          createdAt: existingData?.createdAt || serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        try {
          await setDoc(userDocRef, verifiedStaffProfile, { merge: true });
        } catch (err) {
          logAuthFirestoreError('Failed to persist user profile in users collection:', err, currentUser, activeUid);
        }

        setUser(currentUser);
        setProfile(verifiedStaffProfile);
        setAuthorizedStaff({ ...matchedStaff, userId: activeUid });
        sessionStorage.setItem('nce_active_uid', activeUid);
        updateLastLogin(activeUid).catch(console.error);
        startUserSession({
          uid: activeUid,
          email: verifiedStaffProfile.email,
          name: verifiedStaffProfile.name,
          role: 'staff',
          staffCode: verifiedStaffProfile.staffCode,
          department: matchedStaff.department || null,
        }).catch(console.warn);
        setLoading(false);
      } else {
        // Determine if account is actively unrecognized (needs role selection) or explicitly unauthorized
        const isExplicitlyUnauthorized = existingData?.role === 'unauthorized';
        const determinedRole = isExplicitlyUnauthorized ? 'unauthorized' : 'unrecognized';

        const unauthProfile: UserProfile = {
          uid: activeUid,
          name: existingData?.name || currentUser.displayName || 'User',
          email: normalizedEmail,
          role: determinedRole,
          staffCode: null,
          staffId: null,
          active: false,
          createdAt: existingData?.createdAt || serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        if (existingData?.role === 'staff') {
          try {
            await updateDoc(userDocRef, {
              role: 'unauthorized',
              staffCode: null,
              staffId: null,
              active: false,
            });
          } catch (err) {
            logAuthFirestoreError('Failed to update unauthorized status:', err, currentUser, activeUid);
          }
        }

        setUser(currentUser);
        setProfile(unauthProfile);
        setAuthorizedStaff(null);
        sessionStorage.setItem('nce_active_uid', activeUid);
        setLoading(false);
      }
    } catch (error) {
      logAuthFirestoreError('Notice resolving user profile:', error, currentUser, activeUid);
      if (currentUser && !profile) {
        const fallbackProfile: UserProfile = {
          uid: activeUid,
          name: currentUser.displayName || 'User',
          email: currentUser.email || '',
          role: (currentUser.email?.toLowerCase().trim() === 'admin@nce.edu' || currentUser.email?.toLowerCase().trim() === 'maheenmohideen@gmail.com') ? 'admin' : 'unrecognized',
          staffCode: null,
          staffId: null,
          active: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        setUser(currentUser);
        setProfile(fallbackProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async (targetUid?: string) => {
    setLoading(true);
    await resolveUserProfile(auth.currentUser, targetUid || user?.uid);
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await resolveUserProfile(firebaseUser);
      } else {
        // When unauthenticated in Firebase Auth, clear state and avoid unauthenticated Firestore queries
        if (isMounted) {
          sessionStorage.removeItem('nce_active_uid');
          setUser(null);
          setProfile(null);
          setAuthorizedStaff(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Real-time Presence Heartbeat & Admin Revocation Detection
  useEffect(() => {
    if (!user?.uid || !profile || profile.active === false) return;

    // Send heartbeat every 35 seconds to maintain active presence
    const heartbeatTimer = setInterval(() => {
      if (user?.uid) {
        sendHeartbeat(user.uid).catch(console.warn);
      }
    }, 35000);

    // Initial heartbeat
    sendHeartbeat(user.uid).catch(console.warn);

    // Clean up session on window close / navigation
    const handleUnload = () => {
      if (user?.uid) {
        endUserSession(user.uid).catch(console.warn);
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    // Real-time authorization listener: if Admin deactivates/removes user, revoke access immediately!
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.active === false || (data as any).accountStatus === 'removed' || data.role === 'unauthorized') {
          console.warn('[AuthContext] Admin revoked account access in real time for user:', user.uid);
          clearInterval(heartbeatTimer);
          window.removeEventListener('beforeunload', handleUnload);
          endUserSession(user.uid).catch(console.warn);
          await auth.signOut();
          sessionStorage.clear();
          setUser(null);
          setProfile(null);
          setAuthorizedStaff(null);
          const msg = 'Your account access has been removed by the administrator.';
          setAccessRevokedMessage(msg);
          toast.error(msg, { id: 'account-revoked-live', duration: 7000 });
        }
      }
    }, (err) => {
      console.warn('Notice in user status listener:', err);
    });

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleUnload);
      unsubscribeSnapshot();
    };
  }, [user?.uid, profile?.active]);

  if (loading) {
    return (
      <div className="min-h-screen bg-luna-dark-navy flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded bg-gradient-to-br from-luna-cyan to-luna-primary-blue flex items-center justify-center font-bold text-3xl shadow-lg mb-6 animate-pulse">
          N
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">NCE Timecraft</h2>
        <p className="text-luna-light-cyan">Verifying credentials & authorization...</p>
      </div>
    );
  }

  const isAuth = !!profile && profile.role !== 'unauthorized' && profile.role !== 'unrecognized' && profile.active !== false;

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user,
        profile,
        userProfile: profile,
        authorizedStaff,
        loading,
        isAuthenticated: isAuth,
        isAdmin: isAuth && profile?.role === 'admin',
        isStaff: isAuth && profile?.role === 'staff' && !!authorizedStaff && !!profile?.staffCode,
        accessRevokedMessage,
        setAuthProfile,
        refreshUserProfile,
        logoutUser,
        clearRevocationMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
