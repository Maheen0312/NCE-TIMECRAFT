import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);

export const waitForAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};
