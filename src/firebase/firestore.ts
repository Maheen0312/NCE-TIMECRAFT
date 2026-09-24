import { getFirestore } from 'firebase/firestore';
import { app, resolvedFirebaseConfig } from './firebase';

const dbId = resolvedFirebaseConfig.firestoreDatabaseId;
export const db = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);


