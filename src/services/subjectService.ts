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
import { waitForAuth } from '@/firebase/auth';

export type { Subject };

const SUBJECTS_COLLECTION = 'subjects';
const LABS_COLLECTION = 'labs';

const defaultMasterSubjects: Subject[] = MASTER_THEORY_SUBJECTS.map(s => ({
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
  await waitForAuth();
  try {
    const subjectsRef = collection(db, SUBJECTS_COLLECTION);
    const querySnapshot = await getDocs(subjectsRef);
    const rawSubjects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
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
  } catch (error) {
    console.warn('Notice fetching subjects from Firestore, falling back to master subjects configuration:', error);
    return defaultMasterSubjects;
  }
};

export const getSubjectByCode = async (subjectCode: string): Promise<Subject | null> => {
  try {
    const subjectsRef = collection(db, SUBJECTS_COLLECTION);
    const q = query(subjectsRef, where('subjectCode', '==', subjectCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Subject;
    }
    return null;
  } catch (error) {
    console.error('Error fetching subject by code:', error);
    return null;
  }
};

export const createSubject = async (data: Omit<Subject, 'id'>): Promise<string> => {
  const code = data.subjectCode.trim().toUpperCase();
  const existing = await getSubjectByCode(code);
  if (existing) {
    throw new Error(`Subject code "${data.subjectCode}" already exists.`);
  }

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
      console.warn('Auto-sync lab error on createSubject:', err);
    }
  }

  return docRef.id;
};

export const upsertSubject = async (data: Omit<Subject, 'id'>): Promise<string> => {
  const code = data.subjectCode.trim().toUpperCase();
  const existing = await getSubjectByCode(code);
  
  if (existing && existing.id) {
    const docRef = doc(db, SUBJECTS_COLLECTION, existing.id);
    const existingStaff = Array.isArray(existing.assignedStaff) ? existing.assignedStaff : [];
    const newStaff = Array.isArray(data.assignedStaff) ? data.assignedStaff : [];
    const mergedStaff = Array.from(new Set([...existingStaff, ...newStaff]));

    await updateDoc(docRef, {
      subjectName: data.subjectName ? data.subjectName.trim() : existing.subjectName,
      type: data.type || existing.type || 'THEORY',
      weeklyHours: data.weeklyHours ?? existing.weeklyHours ?? (data.type === 'LAB' ? 2 : 4),
      assignedStaff: mergedStaff.length > 0 ? mergedStaff : existingStaff,
      department: data.department || existing.department || 'Computer Science & Engineering',
      year: data.year || existing.year || 'III',
      semester: data.semester || existing.semester || '5',
      active: true,
      updatedAt: serverTimestamp(),
    });

    if (data.type === 'LAB' || existing.type === 'LAB') {
      try {
        await syncLabEntry({
          subjectCode: code,
          subjectName: data.subjectName || existing.subjectName,
          type: data.type || existing.type,
          weeklyHours: data.weeklyHours ?? existing.weeklyHours ?? 2,
          department: data.department || existing.department,
          active: true,
        });
      } catch (err) {
        console.warn('Auto-sync lab error on upsertSubject:', err);
      }
    }

    return existing.id;
  }

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
      console.warn('Auto-sync lab error on upsertSubject new:', err);
    }
  }

  return docRef.id;
};

export const updateSubject = async (id: string, data: Partial<Subject>): Promise<void> => {
  if (data.subjectCode) {
    const existing = await getSubjectByCode(data.subjectCode.trim().toUpperCase());
    if (existing && existing.id !== id) {
      throw new Error(`Subject code "${data.subjectCode}" already exists.`);
    }
  }

  // Get current doc to know previous code/type
  const docRef = doc(db, SUBJECTS_COLLECTION, id);
  const existingDoc = await getDoc(docRef);
  const existingData = existingDoc.exists() ? (existingDoc.data() as Subject) : null;

  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.subjectCode) updateData.subjectCode = data.subjectCode.trim().toUpperCase();
  if (data.subjectName) updateData.subjectName = data.subjectName.trim();

  await updateDoc(docRef, updateData);

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
      } catch (err) {
        console.warn('Auto-sync lab on updateSubject error:', err);
      }
    } else if (existingData?.type === 'LAB') {
      // It was changed from LAB to non-LAB, delete corresponding lab
      try {
        await deleteDoc(doc(db, LABS_COLLECTION, `lab_${effectiveCode}`));
      } catch (err) {
        console.warn('Cleanup lab on subject type change error:', err);
      }
    }
  }
};

export const deleteSubject = async (id: string): Promise<void> => {
  const docRef = doc(db, SUBJECTS_COLLECTION, id);
  const existingDoc = await getDoc(docRef);
  const existingData = existingDoc.exists() ? (existingDoc.data() as Subject) : null;

  await deleteDoc(docRef);

  if (existingData && existingData.subjectCode) {
    try {
      const code = existingData.subjectCode.trim().toUpperCase();
      await deleteDoc(doc(db, LABS_COLLECTION, `lab_${code}`));
    } catch (err) {
      console.warn('Delete synced lab error:', err);
    }
  }
};

export const assignStaffToSubject = async (subjectId: string, staffCodes: string[]): Promise<void> => {
  const docRef = doc(db, SUBJECTS_COLLECTION, subjectId);
  await updateDoc(docRef, {
    assignedStaff: staffCodes,
    updatedAt: serverTimestamp(),
  });
};

export const getSubjects = getAllSubjects;


