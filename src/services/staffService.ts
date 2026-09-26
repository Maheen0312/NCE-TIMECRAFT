import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { StaffProfile } from '@/types/timetable';
import { MASTER_STAFF } from '@/config/timetableConfig';
import { auth, waitForAuth } from '@/firebase/auth';
import { handleFirestoreError, FirestoreOperationType } from '@/utils/firebaseErrors';

export type { StaffProfile };

const STAFF_COLLECTION = 'staff';

// Initial master staff template used ONLY during initial seeding
export const defaultMasterStaff: StaffProfile[] = MASTER_STAFF.map(s => ({
  id: `staff_${s.staffCode}`,
  staffCode: s.staffCode,
  name: s.name,
  email: s.email,
  department: s.department,
  designation: s.designation,
  active: true,
  isLabFaculty: s.isLabFaculty,
}));

// In-flight deduplication to prevent concurrent duplicate Firestore queries
let pendingStaffPromise: Promise<StaffProfile[]> | null = null;

export const getAllStaff = async (): Promise<StaffProfile[]> => {
  const user = await waitForAuth();
  if (!user) {
    // If not authenticated, do not make an unauthorized Firestore query
    return [];
  }

  if (pendingStaffPromise) {
    return pendingStaffPromise;
  }

  pendingStaffPromise = (async () => {
    try {
      const staffRef = collection(db, STAFF_COLLECTION);
      const querySnapshot = await getDocs(staffRef);
      
      const rawStaff = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        const staffCode = String(data.staffCode || data.code || data.facultyCode || data.staff_code || docSnap.id).trim();
        const name = String(data.name || data.fullName || data.displayName || data.staffName || 'Faculty Member').trim();
        const email = String(data.email || data.staffEmail || data.userEmail || '').trim();
        const department = String(data.department || data.dept || data.branch || 'Computer Science & Engineering').trim();
        const designation = String(data.designation || data.title || data.role || 'Assistant Professor').trim();
        const active = data.active !== undefined 
          ? Boolean(data.active) 
          : data.status !== undefined 
            ? String(data.status).toLowerCase() === 'active' 
            : true;

        return {
          id: docSnap.id,
          staffCode,
          name,
          email,
          department,
          designation,
          active,
          isLabFaculty: Boolean(data.isLabFaculty),
          userId: data.userId || null,
          phone: data.phone || data.mobile || undefined,
          ...data,
        } as StaffProfile;
      });

      // Deduplicate by staffCode or email
      const seen = new Set<string>();
      const uniqueStaff: StaffProfile[] = [];
      for (const st of rawStaff) {
        const key = (st.staffCode || st.email || st.id).trim().toUpperCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueStaff.push(st);
        }
      }

      // If database collection is currently empty, return default institutional staff roster
      return uniqueStaff.length > 0 ? uniqueStaff : defaultMasterStaff;
    } catch (error: any) {
      console.warn('[staffService] Notice reading staff roster from Firestore, using institutional roster:', error?.message || error);
      return defaultMasterStaff;
    } finally {
      pendingStaffPromise = null;
    }
  })();

  return pendingStaffPromise;
};

export const getStaffByCode = async (staffCode: string): Promise<StaffProfile | null> => {
  if (!auth.currentUser) return null;
  try {
    const staffRef = collection(db, STAFF_COLLECTION);
    const q = query(staffRef, where('staffCode', '==', staffCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as StaffProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.GET, `${STAFF_COLLECTION}?staffCode=${staffCode}`);
    return null;
  }
};

export const getStaffById = async (id: string): Promise<StaffProfile | null> => {
  if (!auth.currentUser) return null;
  try {
    const docRef = doc(db, STAFF_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as StaffProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.GET, `${STAFF_COLLECTION}/${id}`);
    return null;
  }
};

export const getStaffByEmail = async (email: string): Promise<StaffProfile | null> => {
  if (!auth.currentUser) return null;
  try {
    const normalized = email.toLowerCase().trim();
    const staffRef = collection(db, STAFF_COLLECTION);
    const q = query(staffRef, where('email', '==', normalized));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as StaffProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.GET, `${STAFF_COLLECTION}?email=${email}`);
    return null;
  }
};

export const getStaffByUserId = async (userId: string): Promise<StaffProfile | null> => {
  if (!auth.currentUser) return null;
  try {
    const staffRef = collection(db, STAFF_COLLECTION);
    const q = query(staffRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as StaffProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.GET, `${STAFF_COLLECTION}?userId=${userId}`);
    return null;
  }
};

export const linkStaffUserId = async (staffId: string, userId: string): Promise<void> => {
  try {
    const staffDocRef = doc(db, STAFF_COLLECTION, staffId);
    await updateDoc(staffDocRef, {
      userId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, FirestoreOperationType.UPDATE, `${STAFF_COLLECTION}/${staffId}`);
  }
};

export const createStaff = async (data: Omit<StaffProfile, 'id'>): Promise<string> => {
  const existing = await getStaffByCode(data.staffCode.trim().toUpperCase());
  if (existing) {
    throw new Error(`Staff code "${data.staffCode}" already exists.`);
  }

  try {
    const staffRef = collection(db, STAFF_COLLECTION);
    const docRef = await addDoc(staffRef, {
      staffCode: data.staffCode.trim().toUpperCase(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      department: data.department || 'Computer Science & Engineering',
      active: data.active !== undefined ? data.active : true,
      userId: data.userId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    throw handleFirestoreError(error, FirestoreOperationType.CREATE, STAFF_COLLECTION);
  }
};

export const updateStaff = async (id: string, data: Partial<StaffProfile>): Promise<void> => {
  const newStaffCode = data.staffCode ? data.staffCode.trim().toUpperCase() : undefined;
  const newName = data.name ? data.name.trim() : undefined;
  
  if (newStaffCode) {
    const existing = await getStaffByCode(newStaffCode);
    if (existing && existing.id !== id) {
      throw new Error(`Staff code "${newStaffCode}" already exists.`);
    }
  }

  const docRef = doc(db, STAFF_COLLECTION, id);
  let oldStaffCode: string | undefined;
  let oldName: string | undefined;
  
  try {
    const prevSnap = await getDoc(docRef);
    if (prevSnap.exists()) {
      const prevData = prevSnap.data() as StaffProfile;
      oldStaffCode = prevData.staffCode;
      oldName = prevData.name;
    }
  } catch {
    // continue
  }

  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (newStaffCode) updateData.staffCode = newStaffCode;
  if (newName) updateData.name = newName;
  if (data.email) updateData.email = data.email.trim().toLowerCase();

  try {
    await updateDoc(docRef, updateData);
  } catch (error) {
    throw handleFirestoreError(error, FirestoreOperationType.UPDATE, `${STAFF_COLLECTION}/${id}`);
  }

  // CASCADE UPDATES: Sync subjects and all existing timetables with the updated staff name/code
  const codeToMatch = oldStaffCode || newStaffCode;
  const effectiveNewCode = newStaffCode || oldStaffCode;
  const effectiveNewName = newName || oldName;

  if (codeToMatch && (effectiveNewCode || effectiveNewName)) {
    try {
      // 1. Cascade update to subjects collection if staff code changed
      if (oldStaffCode && newStaffCode && oldStaffCode !== newStaffCode) {
        const subjectsSnap = await getDocs(collection(db, 'subjects'));
        for (const subDoc of subjectsSnap.docs) {
          const subData = subDoc.data();
          if (Array.isArray(subData.assignedStaff) && subData.assignedStaff.includes(oldStaffCode)) {
            const updatedStaffList = subData.assignedStaff.map((c: string) => (c === oldStaffCode ? newStaffCode : c));
            await updateDoc(doc(db, 'subjects', subDoc.id), {
              assignedStaff: updatedStaffList,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      // 2. Cascade update to all saved timetables
      const timetablesSnap = await getDocs(collection(db, 'timetables'));
      for (const tDoc of timetablesSnap.docs) {
        const tData = tDoc.data();
        if (Array.isArray(tData.entries)) {
          let hasModifications = false;
          const updatedEntries = tData.entries.map((entry: any) => {
            if (entry.staffCode === codeToMatch || (oldStaffCode && entry.staffCode === oldStaffCode)) {
              hasModifications = true;
              return {
                ...entry,
                staffCode: effectiveNewCode || entry.staffCode,
                staffName: effectiveNewName || entry.staffName,
              };
            }
            return entry;
          });

          if (hasModifications) {
            await updateDoc(doc(db, 'timetables', tDoc.id), {
              entries: updatedEntries,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    } catch (cascadeError) {
      console.warn('Cascade update to subjects/timetables completed with notice:', cascadeError);
    }
  }
};

export const deleteStaff = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, STAFF_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, FirestoreOperationType.DELETE, `${STAFF_COLLECTION}/${id}`);
  }
};

export const upsertStaff = async (data: Omit<StaffProfile, 'id'>): Promise<string> => {
  const code = data.staffCode.trim().toUpperCase();
  const existing = await getStaffByCode(code);
  if (existing) {
    await updateStaff(existing.id, data);
    return existing.id;
  } else {
    return await createStaff(data);
  }
};

export const getStaffList = getAllStaff;
