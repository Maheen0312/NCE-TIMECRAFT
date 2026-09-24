import { initializeApp, getApps, getApp } from 'firebase/app';
import localConfig from '../../firebase-applet-config.json';

// Support Vercel production environment variables and fallback to local applet configuration
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};

export const resolvedFirebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || (localConfig as any).apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || (localConfig as any).authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || (localConfig as any).projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || (localConfig as any).storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || (localConfig as any).messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || (localConfig as any).appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || (localConfig as any).measurementId,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || (localConfig as any).firestoreDatabaseId || '(default)',
};

// Initialize Firebase using the provisioned config
export const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

