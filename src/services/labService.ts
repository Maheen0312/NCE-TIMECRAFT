import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { Lab, Subject } from '@/types/timetable';
import { MASTER_LABS } from '@/config/timetableConfig';
import { waitForAuth } from '@/firebase/auth';

export type { Lab };

const LABS_COLLECTION = 'labs';
const SUBJECTS_COLLECTION = 'subjects';

const defaultMasterLabs: Lab[] = MASTER_LABS.map(l => ({
  id: `lab_${l.labCode}`,
  labCode: l.labCode,
  labName: l.labName,
  capacity: l.capacity,
  duration: l.duration,
  preferredPeriod: 'Afternoon',
  department: 'Computer Science & Engineering',
  active: true,
}));

let pendingLabsPromise: Promise<Lab[]> | null = null;

export const getAllLabs = async (): Promise<Lab[]> => {
  const user = await waitForAuth();
  if (!user || !user.uid) {
    return [];
  }

  if (pendingLabsPromise) {
    return pendingLabsPromise;
  }

  pendingLabsPromise = (async () => {
    try {
      const labsRef = collection(db, LABS_COLLECTION);
      const querySnapshot = await getDocs(labsRef);
      const rawLabs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lab));

      if (rawLabs.length === 0) {
        return defaultMasterLabs;
      }

      // Deduplicate by normalized code
      const labMap = new Map<string, Lab>();
      for (const l of rawLabs) {
        const code = (l.labCode || l.id || '').toString().trim().toUpperCase();
        if (code && !labMap.has(code)) {
          labMap.set(code, l);
        }
      }

      return Array.from(labMap.values());
    } catch (error: any) {
      console.warn('[labService] Notice reading labs from Firestore, using institutional catalog:', error?.message || error);
      return defaultMasterLabs;
    } finally {
      pendingLabsPromise = null;
    }
  })();

  return pendingLabsPromise;
};

export const getLabByCode = async (labCode: string): Promise<Lab | null> => {
  const user = await waitForAuth();
  if (!user || !user.uid) return null;

  try {
    const code = (labCode || '').toString().trim().toUpperCase();
    if (!code) return null;
    const docRef = doc(db, LABS_COLLECTION, `lab_${code}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Lab;
    }

    const labsRef = collection(db, LABS_COLLECTION);
    const q = query(labsRef, where('labCode', '==', code));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Lab;
    }

    return null;
  } catch (error) {
    console.warn('Notice fetching lab by code:', error);
    return null;
  }
};

export const createLab = async (data: Omit<Lab, 'id'>): Promise<string> => {
  const code = (data.labCode || '').toString().trim().toUpperCase();
  if (!code) throw new Error('Lab code cannot be empty.');
  const existing = await getLabByCode(code);
  if (existing) {
    throw new Error(`Lab code "${data.labCode}" already exists.`);
  }

  const docId = `lab_${code}`;
  const docRef = doc(db, LABS_COLLECTION, docId);
  await setDoc(docRef, {
    labCode: code,
    labName: (data.labName || code).toString().trim(),
    capacity: Number(data.capacity) || 35,
    duration: Number(data.duration) || 2,
    preferredPeriod: data.preferredPeriod || 'Afternoon',
    department: data.department || 'Computer Science & Engineering',
    active: data.active !== undefined ? data.active : true,
  });

  // Auto-sync corresponding practical subject in subjects collection
  try {
    const subRef = doc(db, SUBJECTS_COLLECTION, `sub_${code}`);
    await setDoc(subRef, {
      subjectCode: code,
      subjectName: (data.labName || code).toString().trim(),
      type: 'LAB',
      weeklyHours: Number(data.duration) || 2,
      department: data.department || 'Computer Science & Engineering',
      year: 'III',
      semester: '5',
      active: data.active !== undefined ? data.active : true,
    }, { merge: true });
  } catch (subErr) {
    console.warn('Auto-sync subject from lab note:', subErr);
  }

  return docId;
};

export const updateLab = async (id: string, data: Partial<Lab>): Promise<void> => {
  const docRef = doc(db, LABS_COLLECTION, id);
  const updateData: any = { ...data };
  if (data.labCode) updateData.labCode = data.labCode.toString().trim().toUpperCase();
  if (data.labName) updateData.labName = data.labName.toString().trim();
  if (data.capacity) updateData.capacity = Number(data.capacity);
  if (data.duration) updateData.duration = Number(data.duration);
  await updateDoc(docRef, updateData);

  // Sync back to subject if labCode exists
  if (data.labCode || data.labName) {
    try {
      const code = (data.labCode || id.replace(/^lab_/, '') || '').toString().trim().toUpperCase();
      if (code) {
        const subRef = doc(db, SUBJECTS_COLLECTION, `sub_${code}`);
        const subUpdate: any = { type: 'LAB' };
        if (data.labName) subUpdate.subjectName = data.labName.toString().trim();
        if (data.duration) subUpdate.weeklyHours = Number(data.duration);
        if (data.active !== undefined) subUpdate.active = data.active;
        await setDoc(subRef, subUpdate, { merge: true });
      }
    } catch (subErr) {
      console.warn('Update subject sync note:', subErr);
    }
  }
};

export const deleteLab = async (id: string): Promise<void> => {
  const docRef = doc(db, LABS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const syncLabsWithSubjects = async (): Promise<{ count: number; syncedCodes: string[] }> => {
  try {
    const [subSnapshot, labSnapshot] = await Promise.all([
      getDocs(collection(db, SUBJECTS_COLLECTION)),
      getDocs(collection(db, LABS_COLLECTION)),
    ]);

    const labSubjects = subSnapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Subject))
      .filter(s => s.type === 'LAB' || (s.subjectName || '').toLowerCase().includes('lab'));

    const existingLabCodes = new Set(
      labSnapshot.docs.map(d => (((d.data() as Lab).labCode || d.id || '').toString().trim().toUpperCase()))
    );

    const syncedCodes: string[] = [];
    for (const sub of labSubjects) {
      const code = (sub.subjectCode || sub.id || '').toString().trim().toUpperCase();
      if (!code) continue;
      const labDocRef = doc(db, LABS_COLLECTION, `lab_${code}`);
      await setDoc(labDocRef, {
        labCode: code,
        labName: sub.subjectName || code,
        capacity: 35,
        duration: sub.weeklyHours || 2,
        preferredPeriod: 'Afternoon',
        department: sub.department || 'Computer Science & Engineering',
        active: sub.active !== undefined ? sub.active : true,
      }, { merge: true });
      syncedCodes.push(code);
    }

    return { count: syncedCodes.length, syncedCodes };
  } catch (error) {
    console.error('Error in syncLabsWithSubjects:', error);
    throw error;
  }
};

export const getLabs = getAllLabs;
