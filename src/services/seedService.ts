import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { defaultRules } from './rulesService';
import { 
  MASTER_STAFF, 
  MASTER_THEORY_SUBJECTS, 
  MASTER_LABS, 
  MASTER_ROOMS, 
  NAAN_MUTHALVAN_CONFIG 
} from '@/config/timetableConfig';

export const seedInitialDataset = async (force: boolean = false): Promise<{ message: string; seeded: boolean }> => {
  try {
    // Check existing data
    const [existingStaff, existingSubjects, existingLabs, existingRooms] = await Promise.all([
      getDocs(collection(db, 'staff')),
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'labs')),
      getDocs(collection(db, 'rooms')),
    ]);

    if (!force && !existingStaff.empty && !existingSubjects.empty) {
      return { message: 'Database already initialized. Click "Reset Section 48 Dataset" to refresh.', seeded: false };
    }

    // Upsert Staff non-destructively: match by staffCode, preserve existing doc IDs and linked users
    const existingStaffMap = new Map<string, { id: string; data: any }>();
    existingStaff.docs.forEach(d => {
      const data = d.data();
      if (data.staffCode) {
        existingStaffMap.set(data.staffCode.trim().toUpperCase(), { id: d.id, data });
      }
    });

    const existingSubjectMap = new Map<string, { id: string; data: any }>();
    existingSubjects.docs.forEach(d => {
      const data = d.data();
      if (data.subjectCode) {
        const clean = data.subjectCode.trim().replace(/\.$/, '').toUpperCase();
        existingSubjectMap.set(clean, { id: d.id, data });
      }
    });

    const batch = writeBatch(db);

    // 1. Seed / Update Staff Members from Centralized Configuration
    MASTER_STAFF.forEach(s => {
      const existing = existingStaffMap.get(s.staffCode.toUpperCase());
      const docRef = existing 
        ? doc(db, 'staff', existing.id)
        : doc(db, 'staff', `staff_${s.staffCode}`);

      batch.set(docRef, {
        staffCode: s.staffCode,
        name: s.name,
        email: existing?.data?.email || s.email,
        department: s.department,
        designation: s.designation,
        active: true,
        userId: existing?.data?.userId || null,
        isLabFaculty: s.isLabFaculty || false,
        updatedAt: serverTimestamp(),
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });
    });

    // 2. Seed / Update Theory Subjects
    MASTER_THEORY_SUBJECTS.forEach(sub => {
      const existing = existingSubjectMap.get(sub.subjectCode.toUpperCase());
      const docRef = existing 
        ? doc(db, 'subjects', existing.id)
        : doc(db, 'subjects', `sub_${sub.subjectCode}`);

      batch.set(docRef, {
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        type: sub.type,
        weeklyHours: sub.weeklyHours,
        assignedStaff: [sub.assignedStaffCode],
        department: sub.department,
        year: sub.year,
        semester: sub.semester,
        active: true,
        updatedAt: serverTimestamp(),
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });
    });

    // 3. Seed / Update Laboratory Subjects
    MASTER_LABS.forEach(lab => {
      const cleanLabCode = lab.subjectCode.replace(/\.$/, '').toUpperCase();
      const existing = existingSubjectMap.get(cleanLabCode);
      const docRef = existing 
        ? doc(db, 'subjects', existing.id)
        : doc(db, 'subjects', `sub_${lab.subjectCode.replace(/\./g, '_')}`);

      batch.set(docRef, {
        subjectCode: lab.subjectCode,
        subjectName: lab.labName,
        type: 'LAB',
        weeklyHours: lab.duration,
        assignedStaff: [lab.staffCode],
        department: 'Computer Science & Engineering',
        year: lab.year || 'III',
        semester: lab.semester || '5',
        active: true,
        updatedAt: serverTimestamp(),
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });
    });

    // 4. Seed Labs catalog
    MASTER_LABS.forEach(l => {
      const docRef = doc(db, 'labs', `lab_${l.labCode}`);
      batch.set(docRef, {
        labCode: l.labCode,
        labName: l.labName,
        capacity: l.capacity,
        duration: l.duration,
        preferredPeriod: 'Period 6 + 7',
        department: 'Computer Science & Engineering',
        active: true,
      });
    });

    // 4. Seed Rooms
    MASTER_ROOMS.forEach(r => {
      const docRef = doc(db, 'rooms', `room_${r.roomNumber}`);
      batch.set(docRef, r);
    });

    // 5. Seed Special Session (Naan Muthalvan Locked on Wednesday Afternoon)
    const nmRef = doc(db, 'specialSessions', 'naan_muthalvan_wed');
    batch.set(nmRef, {
      name: NAAN_MUTHALVAN_CONFIG.name,
      day: NAAN_MUTHALVAN_CONFIG.day,
      period: 'AFTERNOON',
      type: 'SPECIAL',
      locked: true,
      description: NAAN_MUTHALVAN_CONFIG.description,
    });

    // 6. Seed Scheduling Rules
    const rulesRef = doc(db, 'schedulingRules', 'default');
    batch.set(rulesRef, {
      ...defaultRules,
      updatedAt: serverTimestamp(),
    });

    // 7. Seed Initial Administrator User Account
    const adminRef = doc(db, 'users', 'admin_nce_bootstrap');
    batch.set(adminRef, {
      uid: 'admin_nce_bootstrap',
      name: 'System Administrator',
      email: 'admin@nce.edu',
      role: 'admin',
      staffCode: 'ADMIN',
      staffId: null,
      active: true,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    return { message: 'NCE Timecraft clean dataset initialized successfully!', seeded: true };
  } catch (error) {
    console.error('Error seeding dataset:', error);
    throw error;
  }
};
