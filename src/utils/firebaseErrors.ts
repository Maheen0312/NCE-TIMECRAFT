import { auth } from '@/firebase/auth';

export enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

// Track logged errors to prevent spamming identical errors repeatedly in the browser console
const loggedErrorsMap = new Map<string, number>();
const LOG_THROTTLE_MS = 15000; // 15 seconds per unique error key

export function handleFirestoreError(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null
): Error {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || (message.includes('permission-denied') ? 'permission-denied' : 'unknown');

  const errInfo: FirestoreErrorInfo = {
    error: message,
    code,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
    },
  };

  const throttleKey = `${code}:${operationType}:${path}`;
  const now = Date.now();
  const lastLogged = loggedErrorsMap.get(throttleKey) || 0;

  if (now - lastLogged > LOG_THROTTLE_MS) {
    loggedErrorsMap.set(throttleKey, now);
    if (code === 'permission-denied') {
      console.warn(`[Firestore Security] ${operationType.toUpperCase()} on '${path || 'unknown'}' denied. User: ${auth.currentUser?.email || 'unauthenticated'}`);
    } else {
      console.warn(`[Firestore Error] ${operationType.toUpperCase()} on '${path || 'unknown'}':`, message);
    }
  }

  // Map to friendly, clear application error
  let userFriendlyMessage = 'An unexpected database error occurred.';
  if (code === 'permission-denied' || message.includes('Missing or insufficient permissions')) {
    userFriendlyMessage = `Access denied for ${operationType} on ${path || 'database'}. Please ensure your account has the required permissions.`;
  } else if (code === 'unavailable' || message.includes('offline') || message.includes('unavailable')) {
    userFriendlyMessage = 'The database service is temporarily unreachable. Please check your network connection.';
  } else if (code === 'not-found') {
    userFriendlyMessage = `The requested item in ${path || 'database'} was not found.`;
  }

  const enhancedError = new Error(userFriendlyMessage);
  (enhancedError as any).code = code;
  (enhancedError as any).rawMessage = message;
  (enhancedError as any).firestoreInfo = errInfo;
  return enhancedError;
}

export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';
  const code = error?.code || '';
  const msg = error?.message || String(error);

  if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
    return 'Permission denied. Please verify your login credentials or contact the administrator.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/user-disabled') {
    return 'Your account access has been deactivated by the administrator.';
  }
  if (code === 'unavailable') {
    return 'Database is currently offline or unreachable. Please try again.';
  }
  return msg;
}
