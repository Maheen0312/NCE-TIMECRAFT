import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { auth, waitForAuth } from '@/firebase/auth';

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  role: string;
  staffCode?: string | null;
  department?: string | null;
  active: boolean;
  accountStatus?: string;
  sessionStartedAt?: any;
  lastSeen?: any;
  updatedAt?: any;
}

const SESSIONS_COLLECTION = 'userSessions';

// Active session threshold: user must have sent heartbeat within last 2.5 minutes (150 seconds)
const ACTIVE_THRESHOLD_MS = 150 * 1000;

/**
 * Starts or updates an active user session in Firestore and server registry
 */
export const startUserSession = async (userData: {
  uid: string;
  email: string | null;
  name?: string | null;
  role?: string;
  staffCode?: string | null;
  department?: string | null;
}): Promise<void> => {
  if (!userData.uid) return;

  const sessionData: UserSession = {
    uid: userData.uid,
    email: userData.email || '',
    name: userData.name || userData.email?.split('@')[0] || 'User',
    role: userData.role || 'staff',
    staffCode: userData.staffCode || null,
    department: userData.department || null,
    active: true,
    accountStatus: 'active',
    sessionStartedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, userData.uid);
    await setDoc(sessionRef, sessionData, { merge: true });
  } catch (err) {
    console.warn('Notice starting user session in Firestore:', err);
  }

  // Also notify server-side registry
  try {
    await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
  } catch {
    // ignore
  }
};

/**
 * Sends a periodic heartbeat to keep the user's presence active
 */
export const sendHeartbeat = async (uid: string): Promise<void> => {
  if (!uid) return;

  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, uid);
    await setDoc(sessionRef, {
      active: true,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Notice sending heartbeat to Firestore:', err);
  }

  try {
    await fetch('/api/sessions/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
  } catch {
    // ignore
  }
};

/**
 * Ends a user's session upon logout or tab close
 */
export const endUserSession = async (uid: string): Promise<void> => {
  if (!uid) return;

  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, uid);
    await setDoc(sessionRef, {
      active: false,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Notice ending user session in Firestore:', err);
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ uid })], { type: 'application/json' });
      navigator.sendBeacon('/api/sessions/end', blob);
    } else {
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
    }
  } catch {
    // ignore
  }
};

/**
 * Checks if a timestamp from Firestore or server is within the active threshold
 */
export const isSessionRecentlyActive = (lastSeen: any): boolean => {
  if (!lastSeen) return false;
  let lastSeenMs: number;

  if (typeof lastSeen === 'number') {
    lastSeenMs = lastSeen;
  } else if (lastSeen instanceof Date) {
    lastSeenMs = lastSeen.getTime();
  } else if (lastSeen?.toDate && typeof lastSeen.toDate === 'function') {
    lastSeenMs = lastSeen.toDate().getTime();
  } else if (lastSeen?.seconds) {
    lastSeenMs = lastSeen.seconds * 1000;
  } else if (typeof lastSeen === 'string') {
    lastSeenMs = new Date(lastSeen).getTime();
  } else {
    return false;
  }

  return Date.now() - lastSeenMs < ACTIVE_THRESHOLD_MS;
};

/**
 * Fetches all currently active / logged in user sessions
 */
export const getActiveUserSessions = async (): Promise<UserSession[]> => {
  await waitForAuth();

  const activeSessions: UserSession[] = [];

  // Try Firestore userSessions collection first
  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    const q = query(sessionsRef, where('active', '==', true));
    const snap = await getDocs(q);

    snap.docs.forEach(docSnap => {
      const data = docSnap.data() as UserSession;
      if (data.active && isSessionRecentlyActive(data.lastSeen)) {
        activeSessions.push({ ...data, uid: docSnap.id });
      }
    });

    if (activeSessions.length > 0) {
      return activeSessions;
    }
  } catch (err) {
    console.warn('Notice querying active sessions from Firestore:', err);
  }

  // Fallback to server-side session registry
  try {
    const res = await fetch('/api/sessions/active');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        return data.sessions;
      }
    }
  } catch {
    // ignore
  }

  // If current user is logged in, ensure at least current user is included
  const curUser = auth.currentUser;
  if (curUser) {
    activeSessions.push({
      uid: curUser.uid,
      email: curUser.email || '',
      name: curUser.displayName || curUser.email?.split('@')[0] || 'Current User',
      role: 'admin',
      active: true,
      sessionStartedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return activeSessions;
};

/**
 * Subscribes to real-time changes in active sessions
 */
export const subscribeToActiveSessions = (
  callback: (sessions: UserSession[]) => void
): Unsubscribe => {
  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    const q = query(sessionsRef, where('active', '==', true));

    return onSnapshot(q, (snap) => {
      const currentActive: UserSession[] = [];
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as UserSession;
        if (data.active && isSessionRecentlyActive(data.lastSeen)) {
          currentActive.push({ ...data, uid: docSnap.id });
        }
      });
      callback(currentActive);
    }, (err) => {
      console.warn('Notice listening to active sessions:', err);
    });
  } catch (err) {
    console.warn('Notice setting up session listener:', err);
    return () => {};
  }
};
