import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);

let authInitialResolutionDone = false;
let authResolutionPromise: Promise<User | null> | null = null;

// Attach immediate listener to track initial resolution without race conditions
authResolutionPromise = new Promise<User | null>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    authInitialResolutionDone = true;
    unsubscribe();
    resolve(user);
  });
});

export const isAuthInitialized = (): boolean => authInitialResolutionDone;

export const waitForAuth = async (): Promise<User | null> => {
  if (authInitialResolutionDone) {
    return auth.currentUser;
  }
  return authResolutionPromise;
};

export const requireAuthUser = async (): Promise<User> => {
  const user = await waitForAuth();
  if (!user || !user.uid) {
    const err = new Error('Authentication required. Firestore queries are forbidden before login.');
    (err as any).code = 'unauthenticated';
    throw err;
  }
  return user;
};

export const getCurrentUser = (): User | null => auth.currentUser;
