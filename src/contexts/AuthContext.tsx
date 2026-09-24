import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/auth';
import { getUserProfile, UserProfile, updateLastLogin } from '@/services/userService';
import { logout as authServiceLogout } from '@/services/authService';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { StaffProfile } from '@/types/timetable';

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
  setAuthProfile: (profile: UserProfile) => void;
  refreshUserProfile: (targetUid?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
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
  setAuthProfile: () => {},
  refreshUserProfile: async () => {},
  logoutUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authorizedStaff, setAuthorizedStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuthProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    sessionStorage.setItem('nce_active_uid', newProfile.uid);
  };

  const logoutUser = async () => {
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
        console.warn('Initial user profile read notice:', readErr);
      }

      const normalizedEmail = (currentUser.email || existingData?.email || '').toLowerCase().trim();

      // 1. Admin Verification - Strictly verified from database or institution admin credentials
      const roleStr = String(existingData?.role || existingData?.Role || existingData?.userRole || '').trim().toLowerCase();
      const isRoleAdmin = roleStr === 'admin' || roleStr === 'administrator';
      const isUserAdmin = 
        isRoleAdmin || 
        normalizedEmail === 'admin@nce.edu' ||
        normalizedEmail === 'maheenmohideen@gmail.com' ||
        currentUser.email?.toLowerCase().trim() === 'admin@nce.edu' ||
        currentUser.email?.toLowerCase().trim() === 'maheenmohideen@gmail.com';

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
          console.warn('Notice: Failed to persist admin profile in Firestore users collection:', err);
        }

        setUser(currentUser);
        setProfile(adminProfile);
        setAuthorizedStaff(null);
        sessionStorage.setItem('nce_active_uid', activeUid);
        updateLastLogin(activeUid).catch(console.warn);
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
          console.error('Error checking staff by email:', err);
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
          console.error('Error checking staff by raw email:', err);
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
          console.error('Error checking staff by userId:', err);
        }
      }

      if (!matchedStaff && existingData?.staffId) {
        try {
          const sSnap = await getDoc(doc(db, 'staff', existingData.staffId));
          if (sSnap.exists()) {
            matchedStaff = { id: sSnap.id, ...sSnap.data() } as StaffProfile;
          }
        } catch (err) {
          console.error('Error checking staff by staffId:', err);
        }
      }

      if (!matchedStaff && existingData?.staffCode) {
        try {
          const sSnap = await getDoc(doc(db, 'staff', `staff_${existingData.staffCode}`));
          if (sSnap.exists()) {
            matchedStaff = { id: sSnap.id, ...sSnap.data() } as StaffProfile;
          }
        } catch (err) {
          console.error('Error checking staff by staffCode:', err);
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
            console.error('Failed to link staff userId:', err);
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
          console.error('Failed to persist user profile in users collection:', err);
        }

        setUser(currentUser);
        setProfile(verifiedStaffProfile);
        setAuthorizedStaff({ ...matchedStaff, userId: activeUid });
        sessionStorage.setItem('nce_active_uid', activeUid);
        updateLastLogin(activeUid).catch(console.error);
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
            console.error('Failed to update unauthorized status:', err);
          }
        }

        setUser(currentUser);
        setProfile(unauthProfile);
        setAuthorizedStaff(null);
        sessionStorage.setItem('nce_active_uid', activeUid);
        setLoading(false);
      }
    } catch (error) {
      console.warn('Notice resolving user profile:', error);
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
        setAuthProfile,
        refreshUserProfile,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
