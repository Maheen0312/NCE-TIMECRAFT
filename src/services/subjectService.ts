import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { Subject } from '@/types/timetable';
import { MASTER_THEORY_SUBJECTS } from '@/config/timetableConfig';
import { auth, waitForAuth } from '@/firebase/auth';
import { handleFirestoreError, FirestoreOperationType } from '@/utils/firebaseErrors';

export type { Subject };

const SUBJECTS_COLLECTION = 'subjects';
const LABS_COLLECTION = 'labs';

export const defaultMasterSubjects: Subject[] = MASTER_THEORY_SUBJECTS.map(s => ({
  id: `sub_${s.subjectCode}`,
  subjectCode: s.subjectCode,
  subjectName: s.subjectName,
  type: s.type,
  weeklyHours: s.weeklyHours,
  assignedStaff: [s.assignedStaffCode],
  department: s.department,
  year: s.year,
  semester: s.semester,
  active: true,
}));

// In-flight deduplication to avoid multiple simultaneous getDocs on subjects
let pendingSubjectsPromise: Promise<Subject[]> | null = null;

// Helper to sync lab in labs collection
const syncLabEntry = async (subjectData: {
  subjectCode: string;
  subjectName: string;
  type?: string;
  weeklyHours?: number;
  department?: string;
  active?: boolean;
}) => {
  const code = (subjectData.subjectCode || '').toString().trim().toUpperCase();
  if (!code) return;
  const labDocRef = doc(db, LABS_COLLECTION, `lab_${code}`);

  if (subjectData.type === 'LAB') {
    await setDoc(labDocRef, {
      labCode: code,
      labName: (subjectData.subjectName || code).toString().trim(),
      capacity: 35,
      duration: subjectData.weeklyHours || 2,
      preferredPeriod: 'Afternoon',
      department: subjectData.department || 'Computer Science & Engineering',
      active: subjectData.active !== undefined ? subjectData.active : true,
    }, { merge: true });
  }
};

export const getAllSubjects = async (): Promise<Subject[]> => {
  const user = await waitForAuth();
  if (!user) {
    return [];
  }

  if (pendingSubjectsPromise) {
    return pendingSubjectsPromise;
  }

  pendingSubjectsPromise = (async () => {
    try {
      const subjectsRef = collection(db, SUBJECTS_COLLECTION);
      const querySnapshot = await getDocs(subjectsRef);
      const rawSubjects = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Subject));

      // Deduplicate by normalized subjectCode
      const seen = new Set<string>();
      const uniqueSubjects: Subject[] = [];
      for (const s of rawSubjects) {
        const code = (s.subjectCode || s.id || '').toString().trim().toUpperCase();
        if (!code) continue;
        if (!seen.has(code)) {
          seen.add(code);
          uniqueSubjects.push({
            ...s,
            subjectCode: s.subjectCode || code,
            subjectName: s.subjectName || code,
            type: s.type || 'THEORY',
            assignedStaff: Array.isArray(s.assignedStaff) ? s.assignedStaff : [],
          });
        }
      }
      return uniqueSubjects.length > 0 ? uniqueSubjects : defaultMasterSubjects;
    } catch (error: any) {
      console.warn('[subjectService] Notice reading subjects from Firestore, using institutional catalog:', error?.message || error);
      return defaultMasterSubjects;
    } finally {
      pendingSubjectsPromise = null;
    }
  })();

  return pendingSubjectsPromise;
};

export const getSubjectByCode = async (subjectCode: string): Promise<Subject | null> => {
  if (!auth.currentUser) return null;
  try {
    const subjectsRef = collection(db, SUBJECTS_COLLECTION);
    const q = query(subjectsRef, where('subjectCode', '==', subjectCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Subject;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.GET, `${SUBJECTS_COLLECTION}?subjectCode=${subjectCode}`);
    return null;
  }
};

export const createSubject = async (data: Omit<Subject, 'id'>): Promise<string> => {
  const code = data.subjectCode.trim().toUpperCase();
  const existing = await getSubjectByCode(code);
  if (existing) {
    throw new Error(`Subject code "${data.subjectCode}" already exists.`);
  }

  try {
    const subjectsRef = collection(db, SUBJECTS_COLLECTION);
    const docRef = await addDoc(subjectsRef, {
      subjectCode: code,
      subjectName: data.subjectName.trim(),
      type: data.type || 'THEORY',
      weeklyHours: data.weeklyHours ?? (data.type === 'LAB' ? 2 : 4),
      assignedStaff: data.assignedStaff || [],
      department: data.department || 'Computer Science & Engineering',
      year: data.year || 'III',
      semester: data.semester || '5',
      active: data.active !== undefined ? data.active : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Automatically sync to labs collection if this is a LAB
    if (data.type === 'LAB') {
      try {
        await syncLabEntry({
          subjectCode: code,
          subjectName: data.subjectName,
          type: 'LAB',
          weeklyHours: data.weeklyHours || 2,
          department: data.department,
          active: data.active,
        });
      } catch (err) {
        console.warn('Auto-sync lab notice:', err);
      }
    }

    return docRef.id;
  } catch (error) {
    throw handleFirestoreError(error, FirestoreOperationType.CREATE, SUBJECTS_COLLECTION);
  }
};

export const updateSubject = async (id: string, data: Partial<Subject>): Promise<void> => {
  if (data.subjectCode) {
    const existing = await getSubjectByCode(data.subjectCode.trim().toUpperCase());
    if (existing && existing.id !== id) {
      throw new Error(`Subject code "${data.subjectCode}" already exists.`);
    }
  }

  const docRef = doc(db, SUBJECTS_COLLECTION, id);
  let existingData: Subject | null = null;
  try {
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      existingData = existingDoc.data() as Subject;
    }
  } catch {
    // continue
  }

  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.subjectCode) updateData.subjectCode = data.subjectCode.trim().toUpperCase();
  if (data.subjectName) updateData.subjectName = data.subjectName.trim();

  try {
    await updateDoc(docRef, updateData);
  } catch (error) {
    throw handleFirestoreError(error, FirestoreOperationType.UPDATE, `${SUBJECTS_COLLECTION}/${id}`);
  }

  const effectiveCode = (data.subjectCode || existingData?.subjectCode || '').trim().toUpperCase();
  const effectiveName = data.subjectName || existingData?.subjectName || '';
  const effectiveType = data.type || existingData?.type;

  if (effectiveCode) {
    if (effectiveType === 'LAB') {
      try {
        await syncLabEntry({
          subjectCode: effectiveCode,
          subjectName: effectiveName,
          type: 'LAB',
          weeklyHours: data.weeklyHours || existingData?.weeklyHours || 2,
          department: data.department || existingData?.department,
          active: data.active !== undefined ? data.active : existingData?.active,
        });
      } catch {
        // ignore
      }
    } else if (existingData?.type === 'LAB') {
      try {
        await deleteDoc(doc(db, LABS_COLLECTION, `lab_${effectiveCode}`));
      } catch {
        // ignore
      }
    }
  }
};

export const deleteSubject = async (id: string): Promise<void> => {
  const docRef = doc(db, SUBJECTS_COLLECTION, id);
  let existingData: Subject | null = null;
  try {
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      existingData = existingDoc.data() as Subject;
    }
  } catch {
    // continue
  }

  try {
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, FirestoreOperationType.DELETE, `${SUBJECTS_COLLECTION}/${id}`);
  }

  if (existingData && existingData.subjectCode) {
    try {
      const code = existingData.subjectCode.trim().toUpperCase();
      await deleteDoc(doc(db, LABS_COLLECTION, `lab_${code}`));
    } catch {
      // ignore
    }
  }
};

export const assignStaffToSubject = async (subjectId: string, staffCodes: string[]): Promise<void> => {
  try {
    const docRef = doc(db, SUBJECTS_COLLECTION, subjectId);
    await updateDoc(docRef, {
      assignedStaff: staffCodes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw handleFirestoreError(error, FirestoreOperationType.UPDATE, `${SUBJECTS_COLLECTION}/${subjectId}`);
  }
};

export const upsertSubject = async (data: Omit<Subject, 'id'>): Promise<string> => {
  const code = data.subjectCode.trim().toUpperCase();
  const existing = await getSubjectByCode(code);
  if (existing) {
    await updateSubject(existing.id, data);
    return existing.id;
  } else {
    return await createSubject(data);
  }
};

export const getSubjects = getAllSubjects;
