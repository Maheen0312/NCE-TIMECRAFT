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
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { StaffProfile } from '@/types/timetable';
import { MASTER_STAFF } from '@/config/timetableConfig';
import { waitForAuth } from '@/firebase/auth';

export type { StaffProfile };

const STAFF_COLLECTION = 'staff';

const defaultMasterStaff: StaffProfile[] = MASTER_STAFF.map(s => ({
  id: `staff_${s.staffCode}`,
  staffCode: s.staffCode,
  name: s.name,
  email: s.email,
  department: s.department,
  designation: s.designation,
  active: true,
  isLabFaculty: s.isLabFaculty,
}));

export const getAllStaff = async (): Promise<StaffProfile[]> => {
  await waitForAuth();
  try {
    const staffRef = collection(db, STAFF_COLLECTION);
    const q = query(staffRef);
    const querySnapshot = await getDocs(q);
    
    const rawStaff = querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      const staffCode = String(data.staffCode || data.code || data.facultyCode || data.staff_code || doc.id).trim();
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
        id: doc.id,
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
    return uniqueStaff.length > 0 ? uniqueStaff : defaultMasterStaff;
  } catch (error: any) {
    console.error('[staffService] Error fetching staff from Firestore:', error);
    throw error;
  }
};

export const getStaffByCode = async (staffCode: string): Promise<StaffProfile | null> => {
  try {
    const staffRef = collection(db, STAFF_COLLECTION);
    const q = query(staffRef, where('staffCode', '==', staffCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as StaffProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching staff by code:', error);
    return null;
  }
};

export const getStaffById = async (id: string): Promise<StaffProfile | null> => {
  try {
    const docRef = doc(db, STAFF_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as StaffProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching staff by id:', error);
    return null;
  }
};

export const getStaffByEmail = async (email: string): Promise<StaffProfile | null> => {
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
    console.error('Error fetching staff by email:', error);
    return null;
  }
};

export const getStaffByUserId = async (userId: string): Promise<StaffProfile | null> => {
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
    console.error('Error fetching staff by userId:', error);
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
    console.error('Error linking staff userId:', error);
  }
};

export const createStaff = async (data: Omit<StaffProfile, 'id'>): Promise<string> => {
  // 1. Check duplicate staff code
  const existing = await getStaffByCode(data.staffCode.trim().toUpperCase());
  if (existing) {
    throw new Error(`Staff code "${data.staffCode}" already exists.`);
  }

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
};

export const upsertStaff = async (data: Omit<StaffProfile, 'id'>): Promise<string> => {
  const code = data.staffCode.trim().toUpperCase();
  const existing = await getStaffByCode(code);
  
  if (existing && existing.id) {
    const docRef = doc(db, STAFF_COLLECTION, existing.id);
    await updateDoc(docRef, {
      name: data.name ? data.name.trim() : existing.name,
      department: data.department || existing.department || 'Computer Science & Engineering',
      email: data.email ? data.email.trim().toLowerCase() : (existing.email || `${code.toLowerCase()}@nce.ac.in`),
      active: true,
      updatedAt: serverTimestamp(),
    });
    return existing.id;
  }

  const staffRef = collection(db, STAFF_COLLECTION);
  const docRef = await addDoc(staffRef, {
    staffCode: code,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    department: data.department || 'Computer Science & Engineering',
    active: data.active !== undefined ? data.active : true,
    userId: data.userId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateStaff = async (id: string, data: Partial<StaffProfile>): Promise<void> => {
  // If updating staff code, check if new code is taken by someone else
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
  } catch (err) {
    console.warn('Could not retrieve previous staff record for cascade:', err);
  }

  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (newStaffCode) updateData.staffCode = newStaffCode;
  if (newName) updateData.name = newName;
  if (data.email) updateData.email = data.email.trim().toLowerCase();

  await updateDoc(docRef, updateData);

  // CASCADE UPDATES: Sync subjects and all existing timetables
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
      console.warn('Cascade update to subjects/timetables completed with warning:', cascadeError);
    }
  }
};

export const syncAllTimetablesWithStaff = async (): Promise<number> => {
  try {
    const staffList = await getAllStaff();
    const staffMap = new Map<string, string>();
    staffList.forEach(s => staffMap.set(s.staffCode.toUpperCase(), s.name));

    const timetablesSnap = await getDocs(collection(db, 'timetables'));
    let updatedCount = 0;

    for (const tDoc of timetablesSnap.docs) {
      const tData = tDoc.data();
      if (Array.isArray(tData.entries)) {
        let modified = false;
        const updatedEntries = tData.entries.map((entry: any) => {
          if (entry.staffCode) {
            const currentName = staffMap.get(entry.staffCode.toUpperCase());
            if (currentName && currentName !== entry.staffName) {
              modified = true;
              return {
                ...entry,
                staffName: currentName,
              };
            }
          }
          return entry;
        });

        if (modified) {
          await updateDoc(doc(db, 'timetables', tDoc.id), {
            entries: updatedEntries,
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
        }
      }
    }
    return updatedCount;
  } catch (err) {
    console.error('Error synchronizing timetables with staff:', err);
    return 0;
  }
};

export const deleteStaff = async (id: string): Promise<void> => {
  const docRef = doc(db, STAFF_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getStaffList = getAllStaff;

