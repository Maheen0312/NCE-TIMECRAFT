import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, waitForAuth } from '@/firebase/auth';
import { UserProfile, updateLastLogin } from '@/services/userService';
import { logout as authServiceLogout } from '@/services/authService';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { StaffProfile } from '@/types/timetable';
import { startUserSession, sendHeartbeat, endUserSession } from '@/services/sessionService';
import { handleFirestoreError, FirestoreOperationType } from '@/utils/firebaseErrors';
import { toast } from 'react-hot-toast';

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

  // In-flight resolution deduplication to prevent concurrent duplicate profile fetches
  const resolvingUidRef = useRef<string | null>(null);

  const clearRevocationMessage = useCallback(() => setAccessRevokedMessage(null), []);

  const setAuthProfile = useCallback((newProfile: UserProfile) => {
    setProfile(newProfile);
    sessionStorage.setItem('nce_active_uid', newProfile.uid);
    startUserSession({
      uid: newProfile.uid,
      email: newProfile.email,
      name: newProfile.name,
      role: newProfile.role,
      staffCode: newProfile.staffCode,
      department: newProfile.department,
    }).catch(() => {});
  }, []);

  const logoutUser = useCallback(async () => {
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      await endUserSession(currentUid).catch(() => {});
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
  }, []);

  const resolveUserProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      setAuthorizedStaff(null);
      sessionStorage.removeItem('nce_active_uid');
      setLoading(false);
      return;
    }

    const activeUid = firebaseUser.uid;
    if (resolvingUidRef.current === activeUid) {
      return; // Deduplicate in-flight resolution
    }
    resolvingUidRef.current = activeUid;

    const normalizedEmail = (firebaseUser.email || '').toLowerCase().trim();
    const userDocRef = doc(db, 'users', activeUid);
    let existingData: UserProfile | null = null;

    try {
      // 1. Attempt reading user profile from Firestore
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          existingData = userDocSnap.data() as UserProfile;
        }
      } catch (readErr) {
        console.warn('[AuthContext] Firestore user read note:', readErr);
      }

      // 2. Check authoritative server directory if not yet in Firestore
      if (!existingData) {
        try {
          const res = await fetch(`/api/auth/profile?uid=${encodeURIComponent(activeUid)}&email=${encodeURIComponent(normalizedEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              existingData = data.profile as UserProfile;
            }
          }
        } catch {
          // server endpoint fallback
        }
      }

      // 3. Check if user account was deactivated or removed by administrator
      if (existingData && (existingData.active === false || (existingData as any).accountStatus === 'removed' || existingData.role === 'unauthorized')) {
        await endUserSession(activeUid).catch(() => {});
        await auth.signOut().catch(() => {});
        sessionStorage.clear();
        setUser(null);
        setProfile(null);
        setAuthorizedStaff(null);
        const msg = 'Your account is not authorized to access NCE Timecraft. Please contact the administrator.';
        setAccessRevokedMessage(msg);
        toast.error(msg, { id: 'account-revoked-init', duration: 7000 });
        setLoading(false);
        resolvingUidRef.current = null;
        return;
      }

      // 4. Admin Verification
      const roleStr = String(existingData?.role || '').trim().toLowerCase();
      const isRoleAdmin = roleStr === 'admin' || roleStr === 'administrator';
      const isEmailAdmin =
        normalizedEmail === 'admin@nce.edu' ||
        normalizedEmail === 'maheenmohideen@gmail.com' ||
        normalizedEmail === 'synedcdev@gmail.com';

      if (isRoleAdmin || isEmailAdmin) {
        const adminProfile: UserProfile = {
          uid: activeUid,
          name: existingData?.name || firebaseUser.displayName || (normalizedEmail === 'maheenmohideen@gmail.com' ? 'Administrator' : 'Dr. Administrator'),
          email: normalizedEmail || firebaseUser.email || 'admin@nce.edu',
          role: 'admin',
          staffCode: existingData?.staffCode || null,
          staffId: existingData?.staffId || null,
          department: existingData?.department || 'Administration',
          active: true,
          createdAt: existingData?.createdAt || serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        // Persist admin profile to Firestore if not yet saved
        try {
          await setDoc(userDocRef, adminProfile, { merge: true });
        } catch (err) {
          console.warn('[AuthContext] Admin profile write notice:', err);
        }

        setUser(firebaseUser);
        setProfile(adminProfile);
        setAuthorizedStaff(null);
        sessionStorage.setItem('nce_active_uid', activeUid);
        updateLastLogin(activeUid).catch(() => {});
        startUserSession({
          uid: activeUid,
          email: adminProfile.email,
          name: adminProfile.name,
          role: 'admin',
          department: adminProfile.department || 'Administration',
        }).catch(() => {});
        setLoading(false);
        resolvingUidRef.current = null;
        return;
      }

      // 5. Staff Authorization Check
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
          console.warn('[AuthContext] Staff lookup by email note:', err);
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
          console.warn('[AuthContext] Staff lookup by userId note:', err);
        }
      }

      if (matchedStaff && matchedStaff.active !== false) {
        // Authorized Staff Member
        if (matchedStaff.userId !== activeUid) {
          try {
            await updateDoc(doc(db, 'staff', matchedStaff.id), {
              userId: activeUid,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            console.warn('[AuthContext] Staff link update note:', err);
          }
        }

        const verifiedStaffProfile: UserProfile = {
          uid: activeUid,
          name: matchedStaff.name || firebaseUser.displayName || 'Faculty Member',
          email: normalizedEmail || matchedStaff.email,
          role: 'staff',
          staffCode: matchedStaff.staffCode,
          staffId: matchedStaff.id,
          department: matchedStaff.department || 'Computer Science & Engineering',
          active: true,
          createdAt: existingData?.createdAt || serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        try {
          await setDoc(userDocRef, verifiedStaffProfile, { merge: true });
        } catch (err) {
          console.warn('[AuthContext] Staff profile write note:', err);
        }

        setUser(firebaseUser);
        setProfile(verifiedStaffProfile);
        setAuthorizedStaff({ ...matchedStaff, userId: activeUid });
        sessionStorage.setItem('nce_active_uid', activeUid);
        updateLastLogin(activeUid).catch(() => {});
        startUserSession({
          uid: activeUid,
          email: verifiedStaffProfile.email,
          name: verifiedStaffProfile.name,
          role: 'staff',
          staffCode: verifiedStaffProfile.staffCode,
          department: matchedStaff.department || null,
        }).catch(() => {});
        setLoading(false);
      } else {
        // Account profile not found or unauthorized
        await endUserSession(activeUid).catch(() => {});
        await auth.signOut().catch(() => {});
        sessionStorage.clear();
        setUser(null);
        setProfile(null);
        setAuthorizedStaff(null);
        const msg = existingData
          ? 'Your account is not authorized to access NCE Timecraft. Please contact the administrator.'
          : 'Account profile not found. Please contact the administrator.';
        setAccessRevokedMessage(msg);
        toast.error(msg, { id: 'account-unauthorized-exit', duration: 7000 });
        setLoading(false);
      }
    } catch (error) {
      console.warn('[AuthContext] Error resolving profile:', error);
      await auth.signOut().catch(() => {});
      setUser(null);
      setProfile(null);
    } finally {
      resolvingUidRef.current = null;
      setLoading(false);
    }
  }, []);

  const refreshUserProfile = useCallback(async (_targetUid?: string) => {
    setLoading(true);
    await resolveUserProfile(auth.currentUser);
  }, [resolveUserProfile]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      if (firebaseUser) {
        setUser(firebaseUser);
        await resolveUserProfile(firebaseUser);
      } else {
        sessionStorage.removeItem('nce_active_uid');
        setUser(null);
        setProfile(null);
        setAuthorizedStaff(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [resolveUserProfile]);

  // Real-time Presence Heartbeat & Admin Revocation Detection
  useEffect(() => {
    if (!user?.uid || !profile || profile.active === false || profile.role !== 'admin' && profile.role !== 'staff') {
      return;
    }

    const currentUid = user.uid;

    // Send heartbeat every 35 seconds to maintain active presence
    const heartbeatTimer = setInterval(() => {
      if (auth.currentUser?.uid === currentUid) {
        sendHeartbeat(currentUid).catch(() => {});
      }
    }, 35000);

    // Initial heartbeat
    sendHeartbeat(currentUid).catch(() => {});

    // Clean up session on window close / navigation
    const handleUnload = () => {
      if (auth.currentUser?.uid === currentUid) {
        endUserSession(currentUid).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    // Real-time authorization listener: if Admin deactivates/removes user, revoke access immediately!
    const userDocRef = doc(db, 'users', currentUid);
    const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.active === false || (data as any).accountStatus === 'removed' || data.role === 'unauthorized') {
          console.warn('[AuthContext] Admin revoked account access for user:', currentUid);
          clearInterval(heartbeatTimer);
          window.removeEventListener('beforeunload', handleUnload);
          endUserSession(currentUid).catch(() => {});
          await auth.signOut().catch(() => {});
          sessionStorage.clear();
          setUser(null);
          setProfile(null);
          setAuthorizedStaff(null);
          const msg = 'Your account access has been removed by the administrator.';
          setAccessRevokedMessage(msg);
          toast.error(msg, { id: 'account-revoked-live', duration: 7000 });
        }
      }
    }, () => {
      // Ignore listener permission errors silently
    });

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleUnload);
      unsubscribeSnapshot();
    };
  }, [user?.uid, profile?.active, profile?.role]);

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

  const isAuth = !!user && !!profile && (profile.role === 'admin' || profile.role === 'staff') && profile.active !== false;

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
        isStaff: isAuth && profile?.role === 'staff' && !!profile?.staffCode,
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
