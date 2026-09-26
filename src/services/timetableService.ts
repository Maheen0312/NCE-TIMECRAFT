import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { Timetable, ValidationResult, TimetableStatus, Subject, Room, TimetableEntry, TimetableChangeLog, ExtractedTimetableImageResult, TimetableStats, StaffProfile } from '@/types/timetable';
import { getAllStaff, defaultMasterStaff } from './staffService';
import { getAllSubjects } from './subjectService';
import { getAllLabs } from './labService';
import { getAllRooms } from './roomService';
import { getAllTimeSlots, defaultMasterTimeSlots } from './timeSlotService';
import { getAllSpecialSessions } from './specialSessionService';
import { getSchedulingRules } from './rulesService';
import { TimetableScheduler } from '@/scheduler/scheduler';
import { TimetableValidator } from '@/scheduler/validator';
import { ScheduleOptimizer } from '@/scheduler/optimizer';
import { createVersionSnapshot } from './versionService';
import { getCurrentEngineeringAcademicYear, resolveTimetableAcademicYear } from '@/utils/dateUtils';
import { normalizeYear, matchYear, subjectMatchesYearAndSem, formatYearDisplay } from '@/utils/yearUtils';
import { waitForAuth } from '@/firebase/auth';

const TIMETABLES_COLLECTION = 'timetables';
const LOCAL_TIMETABLES_KEY = 'nce_master_timetables_cache';

const getLocalTimetables = (): Timetable[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TIMETABLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalTimetable = (timetable: Timetable): void => {
  if (typeof window === 'undefined' || !timetable) return;
  try {
    const list = getLocalTimetables();
    const existingIdx = list.findIndex(t => t.id === timetable.id);
    if (existingIdx >= 0) {
      list[existingIdx] = timetable;
    } else {
      list.unshift(timetable);
    }
    localStorage.setItem(LOCAL_TIMETABLES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not cache timetable in localStorage:', err);
  }
};

const removeLocalTimetable = (id: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalTimetables().filter(t => t.id !== id);
    localStorage.setItem(LOCAL_TIMETABLES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
};

export interface GenerateOptions {
  department: string;
  year: string;
  semester: string;
  createdBy?: string;
  seed?: number;
  consistentMode?: boolean;
}

export const normalizeDept = (d?: any): string => {
  if (!d) return '';
  const lower = d.toString().toLowerCase();
  if (lower.includes('cse') || lower.includes('computer')) return 'cse';
  if (lower.includes('it') || lower.includes('information')) return 'it';
  if (lower.includes('ece') || lower.includes('electronics')) return 'ece';
  if (lower.includes('mech') || lower.includes('mechanical')) return 'mech';
  return lower.trim();
};

export const generateTimetable = async (options: GenerateOptions): Promise<{
  success: boolean;
  timetable?: Timetable;
  errors?: string[];
  suggestions?: string[];
}> => {
  try {
    const [staff, subjects, labs, rooms, timeSlots, specialSessions, rules] = await Promise.all([
      getAllStaff(),
      getAllSubjects(),
      getAllLabs(),
      getAllRooms(),
      getAllTimeSlots(),
      getAllSpecialSessions(),
      getSchedulingRules(),
    ]);

    // Deduplicate
    const uniqueSubjectsMap = new Map<string, typeof subjects[0]>();
    subjects.forEach(s => {
      if (s.subjectCode && (!uniqueSubjectsMap.has(s.subjectCode) || s.active)) {
        uniqueSubjectsMap.set(s.subjectCode, s);
      }
    });
    const uniqueSubjects = Array.from(uniqueSubjectsMap.values());

    const uniqueStaffMap = new Map<string, typeof staff[0]>();
    staff.forEach(st => {
      if (st.staffCode && (!uniqueStaffMap.has(st.staffCode) || st.active)) {
        uniqueStaffMap.set(st.staffCode, st);
      }
    });
    const uniqueStaff = Array.from(uniqueStaffMap.values());

    const uniqueRoomsMap = new Map<string, typeof rooms[0]>();
    rooms.forEach(r => {
      if (r.roomNumber && (!uniqueRoomsMap.has(r.roomNumber) || r.active)) {
        uniqueRoomsMap.set(r.roomNumber, r);
      }
    });
    const uniqueRooms = Array.from(uniqueRoomsMap.values());

    const uniqueLabsMap = new Map<string, typeof labs[0]>();
    labs.forEach(l => {
      if (l.labCode && (!uniqueLabsMap.has(l.labCode) || l.active)) {
        uniqueLabsMap.set(l.labCode, l);
      }
    });
    const uniqueLabs = Array.from(uniqueLabsMap.values());

    const targetDept = normalizeDept(options.department);

    const deptSubjects = uniqueSubjects.filter(s => {
      if (!s.active) return false;
      const subDept = normalizeDept(s.department);
      const matchDept = !targetDept || !subDept || subDept === targetDept || subDept.includes(targetDept) || targetDept.includes(subDept);
      return matchDept && subjectMatchesYearAndSem(s, options.year, options.semester);
    });

    const activeSubjectsToSchedule = deptSubjects.length > 0 ? deptSubjects : uniqueSubjects.filter(s => s.active && subjectMatchesYearAndSem(s, options.year, options.semester));

    // Global Cross-Year Conflict Avoidance: gather allocations from existing timetables of other years
    const timetablesRef = collection(db, TIMETABLES_COLLECTION);
    let existingAllocations: TimetableEntry[] = [];
    try {
      const allTimetablesSnap = await getDocs(timetablesRef);
      allTimetablesSnap.forEach(snap => {
        const existingT = snap.data() as Timetable;
        const isSameBatch = normalizeDept(existingT.department) === targetDept && matchYear(existingT.year, options.year);
        if (!isSameBatch && Array.isArray(existingT.entries)) {
          existingAllocations.push(...existingT.entries);
        }
      });
    } catch (e) {
      console.warn('Could not read existing timetables for cross-year conflict checks:', e);
    }

    const result = TimetableScheduler.generate({
      department: options.department || 'Computer Science & Engineering',
      year: options.year || 'III',
      semester: options.semester || '5',
      staff: uniqueStaff,
      subjects: activeSubjectsToSchedule,
      labs: uniqueLabs,
      rooms: uniqueRooms,
      timeSlots,
      specialSessions,
      rules,
      seed: options.seed !== undefined ? options.seed : Math.floor(Math.random() * 9000000) + 100000,
      consistentMode: options.consistentMode === true && options.seed !== undefined,
      existingAllocations,
    });

    if (!result.success || !result.timetable) {
      return {
        success: false,
        errors: result.errors || ['Automatic generation failed due to constraint violations.'],
        suggestions: result.suggestions || ['Review resource allocations and availability.'],
      };
    }

    let versionNumber = 1;
    try {
      const existingSnap = await getDocs(query(timetablesRef, where('department', '==', result.timetable.department)));
      versionNumber = existingSnap.size + 1;
    } catch {
      const localList = getLocalTimetables().filter(t => normalizeDept(t.department) === targetDept);
      versionNumber = localList.length + 1;
    }

    const newTimetableDoc = {
      name: result.timetable.name,
      department: result.timetable.department,
      year: result.timetable.year,
      semester: result.timetable.semester,
      academicYear: getCurrentEngineeringAcademicYear(),
      status: 'DRAFT' as TimetableStatus,
      version: versionNumber,
      createdBy: options.createdBy || 'Administrator',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      qualityScore: result.timetable.qualityScore,
      entries: result.timetable.entries,
      validation: result.timetable.validation,
      stats: result.timetable.stats,
      isGenerated: true,
    };

    let createdId = `tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const docRef = await addDoc(timetablesRef, newTimetableDoc);
      createdId = docRef.id;
    } catch (saveErr) {
      console.warn('Notice saving timetable to Firestore, saving locally:', saveErr);
    }

    const createdTimetable: Timetable = {
      id: createdId,
      ...newTimetableDoc,
    } as Timetable;

    // Cache locally
    saveLocalTimetable(createdTimetable);

    // Snapshot version
    try {
      await createVersionSnapshot({
        timetable: createdTimetable,
        status: 'DRAFT',
        summary: `Initial automated generation with Quality Score ${result.timetable.qualityScore}%`,
        createdBy: options.createdBy || 'Administrator'
      });
    } catch (vErr) {
      console.warn('Could not record initial version snapshot:', vErr);
    }

    return {
      success: true,
      timetable: createdTimetable,
    };
  } catch (error: any) {
    console.warn('Notice generating timetable fallback:', error);
    return {
      success: false,
      errors: [error.message || 'An unexpected error occurred during generation.'],
    };
  }
};

const enrichTimetableWithStaff = (timetable: Timetable, staffMap: Map<string, string>): Timetable => {
  if (!timetable || !Array.isArray(timetable.entries)) return timetable;
  const enrichedEntries = timetable.entries.map(entry => {
    if (entry.staffCode) {
      const liveName = staffMap.get(entry.staffCode.toUpperCase());
      if (liveName) {
        return {
          ...entry,
          staffName: liveName,
        };
      }
    }
    return entry;
  });
  return {
    ...timetable,
    entries: enrichedEntries,
  };
};

export const getAllTimetables = async (): Promise<Timetable[]> => {
  const user = await waitForAuth();
  if (!user || !user.uid) {
    return [];
  }
  const localList = getLocalTimetables();
  try {
    const [timetablesSnap, staffList] = await Promise.all([
      getDocs(collection(db, TIMETABLES_COLLECTION)),
      getAllStaff(),
    ]);

    const staffMap = new Map<string, string>();
    staffList.forEach(s => staffMap.set(s.staffCode.toUpperCase(), s.name));

    const firestoreTimetables = timetablesSnap.docs.map(doc => {
      const data = { id: doc.id, ...doc.data() } as Timetable;
      return enrichTimetableWithStaff(data, staffMap);
    });

    // Merge with any local timetables not yet in firestore
    const idSet = new Set(firestoreTimetables.map(t => t.id));
    const merged = [...firestoreTimetables];
    for (const lt of localList) {
      if (!idSet.has(lt.id)) {
        merged.push(enrichTimetableWithStaff(lt, staffMap));
      }
    }

    // Cache remote items locally
    firestoreTimetables.forEach(t => saveLocalTimetable(t));

    return merged.length > 0 ? merged : localList.map(t => enrichTimetableWithStaff(t, staffMap));
  } catch (error: any) {
    console.warn('[timetableService] Notice reading timetables from Firestore, using local cached store:', error?.message || error);
    const staffList = await getAllStaff().catch(() => defaultMasterStaff);
    const staffMap = new Map<string, string>();
    staffList.forEach(s => staffMap.set(s.staffCode.toUpperCase(), s.name));
    return localList.map(t => enrichTimetableWithStaff(t, staffMap));
  }
};

export const getTimetableById = async (id: string): Promise<Timetable | null> => {
  const user = await waitForAuth();
  if (!user || !user.uid) return null;
  try {
    const docRef = doc(db, TIMETABLES_COLLECTION, id);
    const [docSnap, staffList] = await Promise.all([
      getDoc(docRef).catch(() => null),
      getAllStaff().catch(() => []),
    ]);

    const staffMap = new Map<string, string>();
    staffList.forEach(s => staffMap.set(s.staffCode.toUpperCase(), s.name));

    if (docSnap && docSnap.exists()) {
      const raw = { id: docSnap.id, ...docSnap.data() } as Timetable;
      const enriched = enrichTimetableWithStaff(raw, staffMap);
      saveLocalTimetable(enriched);
      return enriched;
    }

    const localList = getLocalTimetables();
    const foundLocal = localList.find(t => t.id === id);
    if (foundLocal) {
      return enrichTimetableWithStaff(foundLocal, staffMap);
    }
    return null;
  } catch (error) {
    console.warn('Notice fetching timetable by ID:', error);
    const localList = getLocalTimetables();
    const foundLocal = localList.find(t => t.id === id);
    return foundLocal || null;
  }
};

export const getAllPublishedTimetables = async (department?: string): Promise<Timetable[]> => {
  try {
    const timetablesRef = collection(db, TIMETABLES_COLLECTION);
    const q = query(timetablesRef, where('status', '==', 'PUBLISHED'));
    const snapshot = await getDocs(q);

    let staffList: StaffProfile[] = [];
    try {
      staffList = await getAllStaff();
    } catch (err) {
      // Expected for non-admins
    }
    const staffMap = new Map<string, string>();
    staffList.forEach(s => staffMap.set(s.staffCode.toUpperCase(), s.name));

    const published = snapshot.docs.map(d => {
      const raw = { id: d.id, ...d.data() } as Timetable;
      return enrichTimetableWithStaff(raw, staffMap);
    });

    if (department) {
      const normTarget = normalizeDept(department);
      return published.filter(t => normalizeDept(t.department) === normTarget || t.department.toLowerCase().includes(department.toLowerCase()));
    }
    return published;
  } catch (error) {
    console.warn('Notice fetching all published timetables from Firestore, falling back to cached:', error);
    const all = await getAllTimetables();
    const published = all.filter(t => t.status === 'PUBLISHED');
    if (department) {
      const normTarget = normalizeDept(department);
      return published.filter(t => normalizeDept(t.department) === normTarget || t.department.toLowerCase().includes(department.toLowerCase()));
    }
    return published;
  }
};

export const getPublishedTimetable = async (department?: string, year?: string): Promise<Timetable | null> => {
  try {
    const allPublished = await getAllPublishedTimetables(department);
    if (allPublished.length === 0) return null;

    if (year) {
      const matchingYear = allPublished.find(t => matchYear(t.year, year));
      if (matchingYear) return matchingYear;
    }

    return allPublished[0];
  } catch (error) {
    console.warn('Notice fetching published timetable:', error);
    return null;
  }
};

export const saveTimetableDraft = async (timetable: Timetable): Promise<void> => {
  saveLocalTimetable(timetable);
  try {
    if (!timetable.id) {
      const timetablesRef = collection(db, TIMETABLES_COLLECTION);
      const res = await addDoc(timetablesRef, {
        ...timetable,
        status: timetable.status || 'DRAFT',
        updatedAt: serverTimestamp()
      });
      timetable.id = res.id;
      saveLocalTimetable(timetable);
      return;
    }

    const docRef = doc(db, TIMETABLES_COLLECTION, timetable.id);
    await updateDoc(docRef, {
      entries: timetable.entries,
      qualityScore: timetable.qualityScore || 90,
      validation: timetable.validation || null,
      stats: timetable.stats || null,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Notice saving timetable draft in Firestore, cached locally:', err);
  }
};

export const updateTimetableStatus = async (id: string, status: TimetableStatus): Promise<void> => {
  try {
    const docRef = doc(db, TIMETABLES_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Notice updating timetable status in Firestore, updating locally:', err);
  }

  const localList = getLocalTimetables();
  const localTarget = localList.find(t => t.id === id);
  if (localTarget) {
    localTarget.status = status;
    saveLocalTimetable(localTarget);
  }
  
  if (status === 'PUBLISHED') {
    const t = await getTimetableById(id);
    if (t) await syncStaffPublishedTimetables(t);
  } else {
    await archiveStaffPublishedTimetables();
  }
};

export const publishTimetable = async (id: string, isPublished: boolean = true): Promise<void> => {
  const status: TimetableStatus = isPublished ? 'PUBLISHED' : 'DRAFT';
  try {
    const docRef = doc(db, TIMETABLES_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      ...(isPublished ? { publishedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Notice publishing timetable in Firestore, publishing locally:', err);
  }

  const localList = getLocalTimetables();
  const localTarget = localList.find(t => t.id === id);
  if (localTarget) {
    localTarget.status = status;
    saveLocalTimetable(localTarget);
  }

  const t = await getTimetableById(id);
  if (t) {
    if (isPublished) {
      await syncStaffPublishedTimetables(t);
    } else {
      await unpublishStaffTimetableForYear(t.year, t.id);
    }
  }
};

/**
 * Synchronizes personal published timetable slices for each staff member into
 * /staff/{staffId}/timetable/published and /staff/{staffId}/timetable/published_{year}
 * This ensures year-wise independent access and privacy.
 */
export const syncStaffPublishedTimetables = async (timetable: Timetable): Promise<void> => {
  try {
    const staffList = await getAllStaff();
    const normY = normalizeYear(timetable.year) || 'active';
    for (const staff of staffList) {
      if (!staff.id || !staff.staffCode) continue;
      const staffCodeUpper = staff.staffCode.trim().toUpperCase();
      
      // Filter entries strictly for this staff member (plus institutional locked sessions like Naan Mudhalvan)
      // Tag each entry with year and semester
      const staffEntries = timetable.entries
        .filter(
          e => (e.staffCode && e.staffCode.trim().toUpperCase() === staffCodeUpper) || e.type === 'SPECIAL'
        )
        .map(e => ({
          ...e,
          year: e.year || timetable.year,
          semester: e.semester || timetable.semester,
        }));

      const yearPayload = {
        timetableId: timetable.id,
        name: timetable.name,
        department: timetable.department,
        year: timetable.year,
        semester: timetable.semester,
        academicYear: resolveTimetableAcademicYear(timetable.academicYear),
        status: 'PUBLISHED',
        publishedAt: serverTimestamp(),
        staffCode: staff.staffCode,
        staffName: staff.name,
        entries: staffEntries,
        stats: {
          totalClasses: staffEntries.length,
          theoryHours: staffEntries.filter(e => e.type === 'THEORY').length,
          labHours: staffEntries.filter(e => e.type === 'LAB').length,
          specialHours: staffEntries.filter(e => e.type === 'SPECIAL').length,
        },
        updatedAt: serverTimestamp(),
      };

      // Store in year-specific document
      const yearDocRef = doc(db, 'staff', staff.id, 'timetable', `published_${normY}`);
      await setDoc(yearDocRef, yearPayload);

      // Aggregate all active published cohorts for this staff member
      const existingYearEntries: TimetableEntry[] = [...staffEntries];
      for (const yr of ['II', 'III', 'IV']) {
        if (yr === normY) continue;
        try {
          const snap = await getDoc(doc(db, 'staff', staff.id, 'timetable', `published_${yr}`));
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.entries)) {
              existingYearEntries.push(...data.entries);
            }
          }
        } catch {
          // ignore individual read error
        }
      }

      // De-duplicate entries by day and slotIndex (prioritize actual faculty class over special)
      const mergedMap = new Map<string, TimetableEntry>();
      for (const ent of existingYearEntries) {
        const key = `${ent.day}_${ent.slotIndex}`;
        if (!mergedMap.has(key) || ent.staffCode === staff.staffCode) {
          mergedMap.set(key, ent);
        }
      }
      const combinedEntries = Array.from(mergedMap.values());

      const combinedPayload = {
        timetableId: timetable.id,
        name: `Faculty Schedule - ${staff.name}`,
        department: staff.department || timetable.department,
        year: 'ALL',
        semester: timetable.semester,
        academicYear: resolveTimetableAcademicYear(timetable.academicYear),
        status: 'PUBLISHED',
        publishedAt: serverTimestamp(),
        staffCode: staff.staffCode,
        staffName: staff.name,
        entries: combinedEntries,
        stats: {
          totalClasses: combinedEntries.length,
          theoryHours: combinedEntries.filter(e => e.type === 'THEORY').length,
          labHours: combinedEntries.filter(e => e.type === 'LAB').length,
          specialHours: combinedEntries.filter(e => e.type === 'SPECIAL').length,
        },
        updatedAt: serverTimestamp(),
      };

      const defaultDocRef = doc(db, 'staff', staff.id, 'timetable', 'published');
      await setDoc(defaultDocRef, combinedPayload);
    }
  } catch (error) {
    console.error('Error synchronizing staff published timetables:', error);
  }
};

/**
 * Unpublishes only a specific year's timetable for all staff members, leaving
 * other years completely intact.
 */
export const unpublishStaffTimetableForYear = async (year: string, timetableId?: string): Promise<void> => {
  try {
    const staffList = await getAllStaff();
    const normY = normalizeYear(year) || 'active';
    for (const staff of staffList) {
      if (!staff.id) continue;
      try {
        const yearDocRef = doc(db, 'staff', staff.id, 'timetable', `published_${normY}`);
        await deleteDoc(yearDocRef);

        // Re-aggregate remaining years
        const remainingEntries: TimetableEntry[] = [];
        for (const yr of ['II', 'III', 'IV']) {
          if (yr === normY) continue;
          try {
            const snap = await getDoc(doc(db, 'staff', staff.id, 'timetable', `published_${yr}`));
            if (snap.exists()) {
              const data = snap.data();
              if (Array.isArray(data.entries)) {
                remainingEntries.push(...data.entries);
              }
            }
          } catch {
            // ignore
          }
        }

        const defaultDocRef = doc(db, 'staff', staff.id, 'timetable', 'published');
        if (remainingEntries.length === 0) {
          await deleteDoc(defaultDocRef);
        } else {
          // De-duplicate
          const mergedMap = new Map<string, TimetableEntry>();
          for (const ent of remainingEntries) {
            const key = `${ent.day}_${ent.slotIndex}`;
            if (!mergedMap.has(key) || ent.staffCode === staff.staffCode) {
              mergedMap.set(key, ent);
            }
          }
          const combinedEntries = Array.from(mergedMap.values());
          await setDoc(defaultDocRef, {
            timetableId: timetableId || defaultDocRef.id,
            name: `Faculty Schedule - ${staff.name}`,
            department: staff.department || 'CSE',
            year: 'ALL',
            status: 'PUBLISHED',
            staffCode: staff.staffCode,
            staffName: staff.name,
            entries: combinedEntries,
            stats: {
              totalClasses: combinedEntries.length,
              theoryHours: combinedEntries.filter(e => e.type === 'THEORY').length,
              labHours: combinedEntries.filter(e => e.type === 'LAB').length,
              specialHours: combinedEntries.filter(e => e.type === 'SPECIAL').length,
            },
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        // Ignore single doc failure
      }
    }
  } catch (error) {
    console.error('Error unpublishing staff timetable for year:', error);
  }
};

/**
 * Archives all staff published timetables across all years.
 */
export const archiveStaffPublishedTimetables = async (): Promise<void> => {
  try {
    const staffList = await getAllStaff();
    for (const staff of staffList) {
      if (!staff.id) continue;
      try {
        const staffTimetableDocRef = doc(db, 'staff', staff.id, 'timetable', 'published');
        await deleteDoc(staffTimetableDocRef);
        // Also clean up year-specific subcollection docs
        for (const yr of ['II', 'III', 'IV', 'active']) {
          await deleteDoc(doc(db, 'staff', staff.id, 'timetable', `published_${yr}`));
        }
      } catch (err) {
        // Ignore single doc failure
      }
    }
  } catch (error) {
    console.error('Error archiving staff published timetables:', error);
  }
};

/**
 * Retrieves the published timetable for a specific staff member from their private
 * subcollection `/staff/{staffId}/timetable/published`.
 * Returns null if no published timetable exists or if it has not been published yet.
 */
export const getMyStaffTimetable = async (staffId: string, year?: string): Promise<Timetable | null> => {
  if (!staffId) return null;
  try {
    const norm = year && year !== 'ALL' ? normalizeYear(year) : null;
    const docId = norm ? `published_${norm}` : 'published';
    const docRef = doc(db, 'staff', staffId, 'timetable', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Timetable;
      if (data.status === 'PUBLISHED') {
        return {
          id: docSnap.id,
          ...data,
        };
      }
    }
    return null;
  } catch (err) {
    console.warn('Notice fetching staff timetable from Firestore:', err);
    return null;
  }
};

export const subscribeToMyStaffTimetable = (
  staffId: string,
  onUpdate: (timetable: Timetable | null) => void,
  year?: string
): (() => void) => {
  if (!staffId) {
    onUpdate(null);
    return () => {};
  }
  
  const norm = year && year !== 'ALL' ? normalizeYear(year) : null;
  const docId = norm ? `published_${norm}` : 'published';
  const docRef = doc(db, 'staff', staffId, 'timetable', docId);
  
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Timetable;
        if (data.status === 'PUBLISHED') {
          onUpdate({
            id: docSnap.id,
            ...data,
          });
          return;
        }
      }
      onUpdate(null);
    },
    (err) => {
      console.warn('Notice subscribing to staff timetable:', err);
      onUpdate(null);
    }
  );
};

export const publishTimetableSafely = async (
  timetable: Timetable,
  publisherName: string = 'Administrator'
): Promise<{ success: boolean; message: string; validation?: ValidationResult }> => {
  if (!timetable.id) return { success: false, message: 'Invalid timetable ID.' };

  // 1. Run live validation
  const validation = await validateExistingTimetable(timetable.id);
  if (!validation || !validation.valid || (validation.conflicts && validation.conflicts.length > 0)) {
    return {
      success: false,
      message: `Cannot publish timetable with active conflicts (${validation?.conflicts?.length || 0} issues). Please resolve before publishing.`,
      validation: validation || undefined
    };
  }

  // 2. Archive any previously published timetable in same department and same year
  const timetablesRef = collection(db, TIMETABLES_COLLECTION);
  const q = query(
    timetablesRef, 
    where('department', '==', timetable.department), 
    where('status', '==', 'PUBLISHED')
  );
  const prevPublishedSnap = await getDocs(q);
  for (const prevDoc of prevPublishedSnap.docs) {
    const prevData = prevDoc.data() as Timetable;
    if (prevDoc.id !== timetable.id && matchYear(prevData.year, timetable.year)) {
      await updateDoc(doc(db, TIMETABLES_COLLECTION, prevDoc.id), {
        status: 'ARCHIVED',
        updatedAt: serverTimestamp()
      });
    }
  }

  // 3. Mark current as PUBLISHED
  const docRef = doc(db, TIMETABLES_COLLECTION, timetable.id);
  await updateDoc(docRef, {
    status: 'PUBLISHED',
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 3.5. Synchronize each staff member's isolated published timetable
  await syncStaffPublishedTimetables({ ...timetable, status: 'PUBLISHED' });

  // 4. Create Version Snapshot
  await createVersionSnapshot({
    timetable: { ...timetable, status: 'PUBLISHED' },
    status: 'PUBLISHED',
    summary: `Official publication by ${publisherName} with 0 conflicts & Quality Score ${timetable.qualityScore || 95}%`,
    createdBy: publisherName
  });

  return {
    success: true,
    message: `Timetable for ${timetable.department} has been officially published. It is now live for all faculty and staff members.`
  };
};

export const deleteTimetable = async (id: string): Promise<void> => {
  const t = await getTimetableById(id);
  try {
    const docRef = doc(db, TIMETABLES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Notice deleting timetable from Firestore, removing locally:', err);
  }
  removeLocalTimetable(id);
  if (t?.status === 'PUBLISHED') {
    await unpublishStaffTimetableForYear(t.year, t.id);
  }
};

export const deleteMultipleTimetables = async (ids: string[]): Promise<void> => {
  for (const id of ids) {
    const t = await getTimetableById(id);
    try {
      await deleteDoc(doc(db, TIMETABLES_COLLECTION, id));
    } catch (err) {
      console.warn('Notice deleting timetable from Firestore, removing locally:', err);
    }
    removeLocalTimetable(id);
    if (t?.status === 'PUBLISHED') {
      await unpublishStaffTimetableForYear(t.year, t.id);
    }
  }
};

export const validateExistingTimetable = async (id: string): Promise<ValidationResult | null> => {
  const timetable = await getTimetableById(id);
  if (!timetable) return null;

  const [subjects, timeSlots] = await Promise.all([
    getAllSubjects(),
    getAllTimeSlots(),
  ]);

  const periodSlots = timeSlots.map(s => ({
    id: s.id || `${s.day}_${s.order}`,
    day: s.day,
    slotIndex: s.order,
    startTime: s.startTime,
    endTime: s.endTime,
    type: s.type as any,
    isMorning: s.order < 5,
    isAfternoon: s.order >= 5,
  }));

  const validation = TimetableValidator.validate(timetable.entries, subjects, periodSlots);
  const quality = ScheduleOptimizer.calculateQuality(timetable.entries, subjects, periodSlots);
  validation.qualityScore = quality.score;
  validation.qualityMetrics = quality.metrics;

  return validation;
};

// API Call Wrappers
export const moveClassApi = async (params: {
  timetable: Timetable;
  entryId: string;
  targetDay: string;
  targetSlotIndex: number;
  subjects: Subject[];
  rooms: Room[];
}) => {
  const res = await fetch('/api/timetable/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
};

export const regenerateSubjectApi = async (params: {
  timetable: Timetable;
  subjectCode: string;
  subjects: Subject[];
  rooms: Room[];
}) => {
  const res = await fetch('/api/timetable/regenerate-subject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
};

export const autoFixConflictsApi = async (params: {
  timetable: Timetable;
  subjects: Subject[];
  rooms: Room[];
}) => {
  const res = await fetch('/api/timetable/auto-fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
};

export const createExtractedTimetable = async (
  extracted: ExtractedTimetableImageResult,
  createdBy: string = 'Gemini AI Vision'
): Promise<Timetable> => {
  const [subjects, rooms] = await Promise.all([
    getAllSubjects(),
    getAllRooms(),
  ]);

  const entries: TimetableEntry[] = extracted.gridEntries.map((grid, idx) => {
    const matchedSubject = subjects.find(s => s.subjectCode === grid.subjectCode);
    const assignedStaff = matchedSubject?.assignedStaff?.[0] || '';
    return {
      id: `entry_img_${Date.now()}_${idx}`,
      day: grid.day,
      slotIndex: grid.slotIndex,
      startTime: grid.startTime,
      endTime: grid.endTime,
      subjectCode: grid.subjectCode,
      subjectName: grid.subjectName,
      staffCode: grid.staffCode || assignedStaff || '',
      staffName: grid.staffName || 'Faculty',
      roomNumber: grid.roomNumber || '304',
      type: grid.type === 'LAB' ? 'LAB' : grid.type === 'SPECIAL' ? 'SPECIAL' : 'THEORY',
      source: 'AI_SUGGESTED',
    };
  });

  const theoryHours = entries.filter((e) => e.type === 'THEORY').length;
  const labHours = entries.filter((e) => e.type === 'LAB').length;
  const specialHours = entries.filter((e) => e.type === 'SPECIAL').length;

  const stats: TimetableStats = {
    totalClasses: entries.length,
    theoryHours,
    labHours,
    specialHours,
  };

  const periodSlots = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].flatMap((day) =>
    defaultMasterTimeSlots.map((s) => ({
      id: `${day}_${s.order}`,
      day,
      slotIndex: s.order,
      order: s.order,
      startTime: s.startTime,
      endTime: s.endTime,
      type: s.type as any,
      isMorning: s.order < 5,
      isAfternoon: s.order >= 5,
    }))
  );

  const validation = TimetableValidator.validate(entries, subjects, periodSlots);
  const quality = ScheduleOptimizer.calculateQuality(entries, subjects, periodSlots);
  validation.qualityScore = quality.score || extracted.confidenceScore || 90;
  validation.qualityMetrics = quality.metrics;

  const timetablesRef = collection(db, TIMETABLES_COLLECTION);
  let versionNumber = 1;
  try {
    const existingSnap = await getDocs(
      query(timetablesRef, where('department', '==', extracted.department))
    );
    versionNumber = existingSnap.size + 1;
  } catch {
    const localList = getLocalTimetables().filter(t => normalizeDept(t.department) === normalizeDept(extracted.department));
    versionNumber = localList.length + 1;
  }

  const newDoc = {
    name: extracted.timetableName || `${extracted.department} Sem ${extracted.semester} (Image Extracted)`,
    department: extracted.department,
    year: extracted.year,
    semester: extracted.semester,
    academicYear: resolveTimetableAcademicYear(extracted.academicYear),
    status: 'DRAFT' as TimetableStatus,
    version: versionNumber,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    qualityScore: validation.qualityScore,
    entries,
    validation,
    stats,
    isGenerated: true,
  };

  let createdId = `tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = await addDoc(timetablesRef, newDoc);
    createdId = docRef.id;
  } catch (err) {
    console.warn('Notice creating manual timetable in Firestore, saving locally:', err);
  }

  const created: Timetable = {
    id: createdId,
    ...newDoc,
  } as Timetable;

  saveLocalTimetable(created);

  try {
    await createVersionSnapshot({
      timetable: created,
      status: 'DRAFT',
      summary: `Imported from timetable image via Gemini Vision. Confidence: ${extracted.confidenceScore || 90}%`,
      createdBy,
    });
  } catch (vErr) {
    console.warn('Could not record initial version snapshot:', vErr);
  }

  return created;
};

export const getLatestTimetable = async (): Promise<Timetable | null> => {
  try {
    const list = await getAllTimetables();
    return list.length > 0 ? list[0] : null;
  } catch (error) {
    console.warn('Notice fetching latest timetable:', error);
    return null;
  }
};

