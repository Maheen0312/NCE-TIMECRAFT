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
import { Timetable, TimetableVersion, TimetableStatus } from '@/types/timetable';

const VERSIONS_COLLECTION = 'timetableVersions';
const LOCAL_VERSIONS_KEY = 'nce_timetable_versions_cache';

const getLocalVersions = (): TimetableVersion[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_VERSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalVersion = (version: TimetableVersion): void => {
  if (typeof window === 'undefined' || !version) return;
  try {
    const list = getLocalVersions();
    const existingIdx = list.findIndex(v => v.id === version.id);
    if (existingIdx >= 0) {
      list[existingIdx] = version;
    } else {
      list.unshift(version);
    }
    localStorage.setItem(LOCAL_VERSIONS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not cache timetable version in localStorage:', err);
  }
};

export async function createVersionSnapshot(params: {
  timetable: Timetable;
  status: TimetableStatus;
  summary: string;
  createdBy: string;
}): Promise<string> {
  const { timetable, status, summary, createdBy } = params;

  const scheduledHours = (timetable.entries || []).filter(e => e.type === 'THEORY' || e.type === 'LAB').length;
  let snapshotId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const versionPayload = {
    timetableId: timetable.id || 'current',
    version: timetable.version || 1,
    name: timetable.name,
    department: timetable.department,
    year: timetable.year,
    semester: timetable.semester,
    status,
    qualityScore: timetable.qualityScore || 90,
    conflictCount: timetable.validation?.conflicts?.length || 0,
    scheduledHours,
    createdBy,
    createdAt: new Date().toISOString(),
    publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : null,
    summary,
    entriesSnapshot: timetable.entries || [],
  };

  try {
    const versionsRef = collection(db, VERSIONS_COLLECTION);
    const docRef = await addDoc(versionsRef, {
      ...versionPayload,
      createdAt: serverTimestamp(),
      publishedAt: status === 'PUBLISHED' ? serverTimestamp() : null,
    });
    snapshotId = docRef.id;
  } catch (error) {
    console.warn('Notice creating version snapshot in Firestore, saved locally:', error);
  }

  saveLocalVersion({
    id: snapshotId,
    ...versionPayload,
  } as unknown as TimetableVersion);

  return snapshotId;
}

export async function getTimetableVersions(timetableId?: string): Promise<TimetableVersion[]> {
  const localList = getLocalVersions();
  try {
    const versionsRef = collection(db, VERSIONS_COLLECTION);
    let q = query(versionsRef, orderBy('createdAt', 'desc'));
    
    if (timetableId) {
      q = query(versionsRef, where('timetableId', '==', timetableId), orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    const firestoreVersions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TimetableVersion));

    firestoreVersions.forEach(v => saveLocalVersion(v));

    if (timetableId) {
      return firestoreVersions.length > 0 ? firestoreVersions : localList.filter(v => v.timetableId === timetableId);
    }
    return firestoreVersions.length > 0 ? firestoreVersions : localList;
  } catch (error: any) {
    console.warn('Notice fetching timetable versions from Firestore, using local cache:', error);
    if (timetableId) {
      return localList.filter(v => v.timetableId === timetableId);
    }
    return localList;
  }
}

export async function restoreVersionAsDraft(version: TimetableVersion, restoredBy: string = 'Administrator'): Promise<Timetable> {
  const timetablesRef = collection(db, 'timetables');
  
  // Calculate next version number
  let nextVersionNum = (version.version || 1) + 1;
  try {
    const existingSnap = await getDocs(query(timetablesRef, where('department', '==', version.department)));
    nextVersionNum = existingSnap.size + 1;
  } catch {
    // fallback
  }

  const newDraftDoc = {
    name: `${version.name} (Restored from v${version.version})`,
    department: version.department,
    year: version.year,
    semester: version.semester,
    status: 'DRAFT' as const,
    version: nextVersionNum,
    createdBy: restoredBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    qualityScore: version.qualityScore,
    entries: version.entriesSnapshot || [],
    stats: {
      totalClasses: version.scheduledHours,
      theoryHours: (version.entriesSnapshot || []).filter(e => e.type === 'THEORY').length,
      labHours: (version.entriesSnapshot || []).filter(e => e.type === 'LAB').length,
      specialHours: (version.entriesSnapshot || []).filter(e => e.type === 'SPECIAL' || e.type === 'LOCKED').length,
    }
  };

  let createdId = `tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const docRef = await addDoc(timetablesRef, newDraftDoc);
    createdId = docRef.id;
  } catch (err) {
    console.warn('Notice restoring version in Firestore, saving locally:', err);
  }

  const restoredTimetable: Timetable = {
    id: createdId,
    ...newDraftDoc
  } as Timetable;

  // Snapshot restoration event
  await createVersionSnapshot({
    timetable: restoredTimetable,
    status: 'DRAFT',
    summary: `Restored state from historical Version ${version.version}`,
    createdBy: restoredBy
  });

  return restoredTimetable;
}
