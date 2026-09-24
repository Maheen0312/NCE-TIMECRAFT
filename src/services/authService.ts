import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential
} from 'firebase/auth';
import { auth } from '@/firebase/auth';
import { updateLastLogin, UserProfile, getUserProfile } from './userService';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_nce_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const verifyAdminSecretCodeOnServer = async (
  secretCode: string,
  userDetails?: { uid?: string; email?: string; displayName?: string; staffCode?: string }
): Promise<{ success: boolean; message?: string; adminProfile?: any }> => {
  const normalized = (secretCode || '').trim();
  if (!normalized) {
    return { success: false, message: 'Please enter the Admin Secret Code.' };
  }

  try {
    const response = await fetch('/api/auth/verify-admin-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretCode: normalized,
        uid: userDetails?.uid,
        email: userDetails?.email,
        displayName: userDetails?.displayName,
        staffCode: userDetails?.staffCode,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, message: 'Admin verification service returned an invalid response.' };
    }

    const data = await response.json();
    if (response.ok && data?.success) {
      return {
        success: true,
        message: 'Admin Secret Code verified successfully.',
        adminProfile: data.adminProfile,
      };
    }

    return { success: false, message: data?.message || 'Invalid Admin Secret Code.' };
  } catch (netErr: any) {
    console.error('Server endpoint /api/auth/verify-admin-code unavailable:', netErr);
    return { success: false, message: 'Admin verification service is unavailable. Please try again after the server is reachable.' };
  }
};

export const loginWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const customErr: any = new Error(
        `Firebase Error: The domain "${currentHost}" is not authorized. Please add "${currentHost}" to Firebase Console → Authentication → Settings → Authorized domains.`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.domain = currentHost;
      throw customErr;
    }
    throw error;
  }
};

export const setupAccountWithGoogle = async (_role?: 'admin' | 'staff'): Promise<UserCredential> => {
  return await loginWithGoogle();
};

export const login = async (email: string, password: string): Promise<{ profile: UserProfile; firebaseUser?: any }> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  // 1. First attempt native Firebase Auth
  try {
    const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    sessionStorage.setItem('nce_active_uid', userCred.user.uid);
    const userProfile = await getUserProfile(userCred.user.uid);
    if (userProfile) {
      return { profile: userProfile, firebaseUser: userCred.user };
    }
    return { profile: null as any, firebaseUser: userCred.user };
  } catch (error: any) {
    const code = error?.code || '';
    if (
      code === 'auth/wrong-password' || 
      code === 'auth/invalid-credential' || 
      code === 'auth/user-disabled' ||
      code === 'auth/invalid-email'
    ) {
      throw error;
    }
    // Only continue if user-not-found or configuration fallback is needed
  }

  // Special bootstrap check: if user is logging in with default admin credentials
  if (normalizedEmail === 'admin@nce.edu' && password === 'admin123') {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      sessionStorage.setItem('nce_active_uid', userCred.user.uid);
      const adminProfile: UserProfile = {
        uid: userCred.user.uid,
        name: 'Dr. Administrator',
        email: 'admin@nce.edu',
        role: 'admin',
        staffCode: 'ADMIN',
        active: true,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', userCred.user.uid), adminProfile);
      return { profile: adminProfile, firebaseUser: userCred.user };
    } catch (createErr: any) {
      // If already created, try signIn again
      try {
        const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        sessionStorage.setItem('nce_active_uid', userCred.user.uid);
        const userProfile = await getUserProfile(userCred.user.uid);
        return { profile: userProfile || null as any, firebaseUser: userCred.user };
      } catch (signInErr: any) {
        throw signInErr;
      }
    }
  }

  // 2. Fallback Database Authentication in Firestore users collection (if client already authenticated)
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      const err: any = new Error('No account found with this email. Please check your credentials or create an account.');
      err.code = 'auth/user-not-found';
      throw err;
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data() as UserProfile & { passwordHash?: string };

    if (userData.active === false) {
      const err: any = new Error('This account has been deactivated. Please contact the administrator.');
      err.code = 'auth/user-disabled';
      throw err;
    }

    // Verify Password Hash
    const inputHash = await hashPassword(password);
    if (userData.passwordHash) {
      if (userData.passwordHash !== inputHash) {
        const err: any = new Error('Invalid email or password.');
        err.code = 'auth/wrong-password';
        throw err;
      }
    } else {
      await updateDoc(doc(db, 'users', userDoc.id), {
        passwordHash: inputHash,
        lastLogin: serverTimestamp()
      }).catch(console.error);
    }

    const profile: UserProfile = {
      uid: userDoc.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      staffCode: userData.staffCode || null,
      active: userData.active,
      createdAt: userData.createdAt,
      lastLogin: new Date().toISOString()
    };

    sessionStorage.setItem('nce_active_uid', userDoc.id);
    await updateLastLogin(userDoc.id).catch(console.error);
    return { profile };
  } catch (dbErr: any) {
    if (dbErr?.code === 'auth/user-not-found' || dbErr?.code === 'auth/wrong-password' || dbErr?.code === 'auth/user-disabled') {
      throw dbErr;
    }
    const genericErr: any = new Error('Invalid email or password. Please verify your credentials.');
    genericErr.code = 'auth/invalid-credential';
    throw genericErr;
  }
};

export const setupAccount = async (
  email: string, 
  password: string, 
  name: string, 
  role: 'admin' | 'staff'
): Promise<{ profile: UserProfile; firebaseUser?: any }> => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Try native Firebase Auth if available
  try {
    const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    if (userCred && userCred.user) {
      sessionStorage.setItem('nce_active_uid', userCred.user.uid);
      return { firebaseUser: userCred.user, profile: {} as any };
    }
  } catch (error: any) {
    const code = error?.code || '';
    if (code !== 'auth/operation-not-allowed' && code !== 'auth/configuration-not-found') {
      throw error;
    }
  }

  // 2. Strict Database Account Creation in Firestore
  const usersRef = collection(db, 'users');
  const existingQuery = query(usersRef, where('email', '==', normalizedEmail));
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    const err: any = new Error('An account with this email already exists. Please sign in instead.');
    err.code = 'auth/email-already-in-use';
    throw err;
  }

  // Check if email matches staff
  let isStaffMember = false;
  let staffCodeToLink: string | null = null;
  let resolvedName = name.trim();

  try {
    const staffQuery = query(collection(db, 'staff'), where('email', '==', normalizedEmail));
    const staffSnap = await getDocs(staffQuery);
    if (!staffSnap.empty) {
      const staffDoc = staffSnap.docs[0];
      const staffData = staffDoc.data();
      isStaffMember = true;
      staffCodeToLink = staffData.staffCode || null;
      resolvedName = staffData.name || resolvedName;
    }
  } catch (e) {
    console.error('Error querying staff for setup:', e);
  }

  if (role === 'staff' && !isStaffMember) {
    const err: any = new Error('Access Denied — This email address is not authorized as Staff by the Administrator.');
    err.code = 'auth/unauthorized-staff';
    throw err;
  }

  const assignedRole = isStaffMember ? 'staff' : (role === 'admin' ? 'admin' : 'unauthorized');
  const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const passwordHash = await hashPassword(password);

  const newUserProfile: UserProfile = {
    uid,
    name: resolvedName,
    email: normalizedEmail,
    role: assignedRole,
    staffCode: staffCodeToLink,
    active: true,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', uid), {
    ...newUserProfile,
    passwordHash,
  });

  // Link staff doc if matched
  if (staffCodeToLink) {
    try {
      const staffDocRef = doc(db, 'staff', `staff_${staffCodeToLink}`);
      await updateDoc(staffDocRef, { userId: uid });
    } catch (e) {
      console.error('Error updating staff userId:', e);
    }
  }

  sessionStorage.setItem('nce_active_uid', uid);
  return { profile: newUserProfile };
};

export const logout = async (): Promise<void> => {
  sessionStorage.removeItem('nce_active_uid');
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    // Ignore signout errors
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (e) {
    // If native reset email fails, check if user exists in database
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) {
      const err: any = new Error('No account found with this email address.');
      err.code = 'auth/user-not-found';
      throw err;
    }
  }
};
