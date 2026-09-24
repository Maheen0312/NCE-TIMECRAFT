import { 
  collection, 
  doc, 
  getDocs, 
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

export const getAllLabs = async (): Promise<Lab[]> => {
  try {
    const labsRef = collection(db, LABS_COLLECTION);
    const querySnapshot = await getDocs(labsRef);
    const rawLabs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lab));

    // Also fetch subjects with type === 'LAB' to guarantee complete synchronization
    const subjectsRef = collection(db, SUBJECTS_COLLECTION);
    const subSnapshot = await getDocs(subjectsRef);
    const labSubjects: Subject[] = subSnapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Subject))
      .filter(s => s.type === 'LAB' || (s.subjectName || '').toLowerCase().includes('lab') || (s.subjectName || '').toLowerCase().includes('laboratory'));

    // Map existing labs by normalized code
    const labMap = new Map<string, Lab>();
    for (const l of rawLabs) {
      const code = (l.labCode || l.id || '').toString().trim().toUpperCase();
      if (code) {
        labMap.set(code, l);
      }
    }

    // Auto-incorporate and sync any LAB subjects that aren't yet in labs collection
    const missingLabsToSync: Omit<Lab, 'id'>[] = [];
    for (const sub of labSubjects) {
      const code = (sub.subjectCode || sub.id || '').toString().trim().toUpperCase();
      if (!code) continue;

      if (!labMap.has(code)) {
        const synthesizedLab: Lab = {
          id: `lab_${code}`,
          labCode: code,
          labName: sub.subjectName || code,
          capacity: 35,
          duration: sub.weeklyHours || 2,
          preferredPeriod: 'Afternoon',
          department: sub.department || 'Computer Science & Engineering',
          active: sub.active !== undefined ? sub.active : true,
        };
        labMap.set(code, synthesizedLab);
        missingLabsToSync.push({
          labCode: code,
          labName: sub.subjectName || code,
          capacity: 35,
          duration: sub.weeklyHours || 2,
          preferredPeriod: 'Afternoon',
          department: sub.department || 'Computer Science & Engineering',
          active: sub.active !== undefined ? sub.active : true,
        });
      }
    }

    // Background sync missing labs to Firestore so future queries are persistent
    if (missingLabsToSync.length > 0) {
      Promise.all(
        missingLabsToSync.map(ml => 
          setDoc(doc(db, LABS_COLLECTION, `lab_${ml.labCode}`), {
            ...ml,
            createdAt: new Date().toISOString(),
          }, { merge: true }).catch(err => console.warn('Background lab sync notice:', err))
        )
      ).catch(() => {});
    }

    return labMap.size > 0 ? Array.from(labMap.values()) : defaultMasterLabs;
  } catch (error) {
    console.warn('Notice fetching labs from Firestore, falling back to master labs configuration:', error);
    return defaultMasterLabs;
  }
};

export const getLabByCode = async (labCode: string): Promise<Lab | null> => {
  try {
    const code = (labCode || '').toString().trim().toUpperCase();
    if (!code) return null;
    const labsRef = collection(db, LABS_COLLECTION);
    const q = query(labsRef, where('labCode', '==', code));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Lab;
    }

    // Check by doc ID
    const directDoc = await getDocs(query(labsRef));
    const matched = directDoc.docs.find(d => d.id === `lab_${code}` || ((d.data() as Lab).labCode || '').toString().toUpperCase() === code);
    if (matched) {
      return { id: matched.id, ...matched.data() } as Lab;
    }

    return null;
  } catch (error) {
    console.error('Error fetching lab by code:', error);
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

  // Also auto-sync/create corresponding practical subject if not existing
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
    console.warn('Auto-sync subject from lab notice:', subErr);
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
      console.warn('Update subject sync notice:', subErr);
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


