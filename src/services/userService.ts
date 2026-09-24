import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { MASTER_STAFF } from '@/config/timetableConfig';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'unauthorized' | 'unrecognized';
  staffCode?: string | null;
  staffId?: string | null;
  department?: string | null;
  active: boolean;
  createdAt?: any;
  lastLogin?: any;
  status?: string;
  [key: string]: any;
}

const LOCAL_USERS_KEY = 'nce_users_cache';

const defaultMasterUsers: UserProfile[] = [
  {
    uid: 'admin_primary',
    name: 'Administrator',
    email: 'admin@nce.edu',
    role: 'admin',
    staffCode: null,
    department: 'Administration',
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'admin_maheen',
    name: 'Maheen Mohideen',
    email: 'maheenmohideen@gmail.com',
    role: 'admin',
    staffCode: 'MSM',
    department: 'Computer Science & Engineering',
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'admin_synedcdev',
    name: 'Administrator',
    email: 'synedcdev@gmail.com',
    role: 'admin',
    staffCode: null,
    department: 'Administration',
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  ...MASTER_STAFF.map(s => ({
    uid: `staff_${s.staffCode}`,
    name: s.name,
    email: s.email,
    role: 'staff' as const,
    staffCode: s.staffCode,
    department: s.department,
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  }))
];

export const getLocalUsers = (): UserProfile[] => {
  if (typeof window === 'undefined') return defaultMasterUsers;
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return defaultMasterUsers;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultMasterUsers;
  } catch {
    return defaultMasterUsers;
  }
};

export const saveLocalUsers = (users: UserProfile[]): void => {
  if (typeof window === 'undefined' || !users) return;
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Could not cache users in localStorage:', err);
  }
};

// Robust mapping of raw Firestore user documents to UserProfile
export const mapFirestoreUserDoc = (id: string, data: any): UserProfile => {
  if (!data) {
    return {
      uid: id,
      name: 'User',
      email: '',
      role: 'staff',
      staffCode: null,
      department: null,
      active: true,
      createdAt: null,
      lastLogin: null,
    };
  }

  const roleRaw = String(data.role || data.Role || data.userRole || data.type || 'staff').trim().toLowerCase();
  const role: 'admin' | 'staff' | 'unauthorized' | 'unrecognized' =
    roleRaw === 'admin' || roleRaw === 'administrator' ? 'admin' :
    roleRaw === 'unauthorized' ? 'unauthorized' :
    roleRaw === 'unrecognized' ? 'unrecognized' : 'staff';

  const name = String(data.name || data.displayName || data.fullName || data.userName || data.staffName || (data.email ? String(data.email).split('@')[0] : 'User')).trim();
  const email = String(data.email || data.userEmail || data.mail || '').trim();
  const staffCode = data.staffCode || data.code || data.facultyCode || data.staff_code || null;
  const department = data.department || data.dept || data.branch || data.departmentName || null;
  const active = data.active !== undefined 
    ? Boolean(data.active) 
    : data.status !== undefined 
      ? String(data.status).toLowerCase() === 'active' 
      : true;

  return {
    ...data,
    uid: data.uid || data.userId || data.id || id,
    name,
    email,
    role,
    staffCode: staffCode ? String(staffCode).trim() : null,
    staffId: data.staffId || null,
    department: department ? String(department).trim() : null,
    active,
    createdAt: data.createdAt || null,
    lastLogin: data.lastLogin || null,
  };
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapFirestoreUserDoc(docSnap.id, docSnap.data());
    }
  } catch (error) {
    console.warn('Notice fetching user profile from Firestore, using local fallback:', error);
  }

  const localUsers = getLocalUsers();
  return localUsers.find(u => u.uid === uid) || null;
};

export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    console.warn('Notice updating last login in Firestore:', error);
  }

  const localList = getLocalUsers();
  const target = localList.find(u => u.uid === uid);
  if (target) {
    target.lastLogin = new Date().toISOString();
    saveLocalUsers(localList);
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  let firestoreUsers: UserProfile[] = [];
  let firestoreError: any = null;

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    if (!snapshot.empty) {
      firestoreUsers = snapshot.docs.map(doc => mapFirestoreUserDoc(doc.id, doc.data()));
    }
  } catch (err: any) {
    firestoreError = err;
    console.warn('[userService] Firestore users query returned an issue, checking server-side directory:', {
      code: err?.code,
      message: err?.message,
    });
  }

  // If Firestore succeeded with records, enrich and return
  if (firestoreUsers.length > 0) {
    let staffMap = new Map<string, any>();
    try {
      const staffRef = collection(db, 'staff');
      const staffSnap = await getDocs(staffRef);
      staffSnap.docs.forEach(doc => {
        const d = doc.data();
        const code = (d.staffCode || d.code || doc.id).toUpperCase().trim();
        const email = (d.email || '').toLowerCase().trim();
        if (code) staffMap.set(code, d);
        if (email) staffMap.set(email, d);
      });
    } catch {
      // ignore
    }

    const enriched = firestoreUsers.map(u => {
      const staffData = (u.staffCode && staffMap.get(u.staffCode.toUpperCase())) ||
                        (u.email && staffMap.get(u.email.toLowerCase()));
      return {
        ...u,
        department: u.department || staffData?.department || '—',
        staffCode: u.staffCode || staffData?.staffCode || null,
      };
    });

    saveLocalUsers(enriched);
    return enriched;
  }

  // Attempt server-side user directory endpoint
  try {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        const mappedUsers: UserProfile[] = data.users.map((u: any) => ({
          uid: u.uid,
          name: u.name || 'User',
          email: u.email || '',
          role: u.role || 'staff',
          staffCode: u.staffCode || null,
          department: u.department || '—',
          active: u.active !== false,
          createdAt: u.createdAt || null,
          lastLogin: u.lastLogin || null,
        }));
        saveLocalUsers(mappedUsers);
        return mappedUsers;
      }
    }
  } catch (serverErr) {
    console.warn('[userService] Server-side users endpoint unreachable:', serverErr);
  }

  // If Firestore gave a real permission error and no server users returned, throw if strictly required or return cached master users
  const localList = getLocalUsers();
  if (localList.length > 0) {
    return localList;
  }

  if (firestoreError) {
    throw firestoreError;
  }

  return defaultMasterUsers;
};

export const deactivateOrRemoveUser = async (uid: string): Promise<void> => {
  if (!uid) return;

  // 1. Mark user profile in Firestore as inactive and removed
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      active: false,
      accountStatus: 'removed',
      role: 'unauthorized',
      removedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Notice updating user removal in Firestore:', error);
  }

  // 2. Terminate presence session in userSessions collection
  try {
    const sessionDocRef = doc(db, 'userSessions', uid);
    await setDoc(sessionDocRef, {
      active: false,
      accountStatus: 'removed',
      removedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Notice removing session in Firestore:', error);
  }

  // 3. Notify server-side directory and session registry
  try {
    await fetch('/api/admin/users/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
  } catch {
    // ignore
  }

  // 4. Update local cache
  const localList = getLocalUsers().map(u => {
    if (u.uid === uid) {
      return { ...u, active: false, accountStatus: 'removed', role: 'unauthorized' as const };
    }
    return u;
  });
  saveLocalUsers(localList);
};

export const deleteUser = async (uid: string): Promise<void> => {
  await deactivateOrRemoveUser(uid);
};

export const deleteMultipleUsers = async (uids: string[]): Promise<void> => {
  await Promise.all(uids.map(uid => deactivateOrRemoveUser(uid)));
};

export const reactivateUser = async (uid: string, role: 'admin' | 'staff' = 'staff'): Promise<void> => {
  if (!uid) return;

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      active: true,
      accountStatus: 'active',
      role,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Notice reactivating user in Firestore:', error);
  }

  try {
    await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, role }),
    });
  } catch {
    // ignore
  }

  const localList = getLocalUsers().map(u => {
    if (u.uid === uid) {
      return { ...u, active: true, accountStatus: 'active', role };
    }
    return u;
  });
  saveLocalUsers(localList);
};

export const updateUserRole = async (uid: string, role: 'admin' | 'staff'): Promise<void> => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      role,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('Notice updating user role in Firestore, updating server/local cache:', error);
  }

  try {
    await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, role }),
    });
  } catch {
    // ignore
  }

  const localList = getLocalUsers();
  const target = localList.find(u => u.uid === uid);
  if (target) {
    target.role = role;
    saveLocalUsers(localList);
  }
};
