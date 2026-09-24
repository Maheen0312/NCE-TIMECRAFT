import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { SpecialSession } from '@/types/timetable';

const SESSIONS_COLLECTION = 'specialSessions';

export const defaultNaanMudhalvanSession: SpecialSession = {
  name: 'Naan Mudhalvan',
  day: 'Wednesday',
  period: 'AFTERNOON',
  type: 'SPECIAL',
  locked: true,
  description: 'Mandatory Tamil Nadu State Skill Initiative - Wednesday Afternoon Locked Session',
};

export const defaultCareerGuidanceSession: SpecialSession = {
  name: 'Career Guidance',
  day: 'ALL',
  period: 'AFTERNOON',
  year: 'IV',
  type: 'SPECIAL',
  locked: true,
  description: 'Final Year Special Session: Career Guidance & Placement Training (Locked Session)',
};

export const getAllSpecialSessions = async (): Promise<SpecialSession[]> => {
  const defaultSessions = [
    { id: 'naan_mudhalvan_default', ...defaultNaanMudhalvanSession },
    { id: 'career_guidance_default', ...defaultCareerGuidanceSession }
  ];

  try {
    const sessionsRef = collection(db, SESSIONS_COLLECTION);
    const querySnapshot = await getDocs(sessionsRef);
    const sessions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SpecialSession));

    if (sessions.length === 0) {
      return defaultSessions;
    }

    // Ensure institutional defaults are included if missing
    const hasNM = sessions.some(s => s.name?.toLowerCase().includes('naan'));
    const hasCG = sessions.some(s => s.name?.toLowerCase().includes('career'));
    const result = [...sessions];
    if (!hasNM) result.push({ id: 'naan_mudhalvan_default', ...defaultNaanMudhalvanSession });
    if (!hasCG) result.push({ id: 'career_guidance_default', ...defaultCareerGuidanceSession });

    return result;
  } catch (error) {
    console.warn('Notice fetching special sessions from Firestore, falling back to default sessions:', error);
    return defaultSessions;
  }
};

export const createSpecialSession = async (data: Omit<SpecialSession, 'id'>): Promise<string> => {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const docRef = await addDoc(sessionsRef, {
    ...data,
    type: 'SPECIAL',
    locked: data.locked !== undefined ? data.locked : true,
  });
  return docRef.id;
};

export const updateSpecialSession = async (id: string, data: Partial<SpecialSession>): Promise<void> => {
  if (id === 'career_guidance_default' || (data.name && data.name.toLowerCase().includes('career guidance') && data.locked === false)) {
    throw new Error('Career Guidance is a locked Final Year special session and cannot be modified.');
  }
  const docRef = doc(db, SESSIONS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteSpecialSession = async (id: string): Promise<void> => {
  if (id === 'career_guidance_default') {
    throw new Error('Career Guidance is a locked Final Year special session and cannot be modified.');
  }
  const docRef = doc(db, SESSIONS_COLLECTION, id);
  await deleteDoc(docRef);
};
