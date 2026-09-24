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
import { waitForAuth } from '@/firebase/auth';

const SESSIONS_COLLECTION = 'specialSessions';

export const defaultNaanMudhalvan3rdYearSession: SpecialSession = {
  name: 'Naan Mudhalvan (3rd Year)',
  sessionName: 'Naan Mudhalvan',
  day: 'Wednesday',
  period: 'AFTERNOON',
  startPeriod: 5,
  endPeriod: 7,
  sessionType: 'NAAN_MUTHALVAN',
  year: 'III',
  type: 'SPECIAL',
  locked: true,
  active: true,
  description: 'Mandatory Tamil Nadu State Skill Initiative - 3rd Year Wednesday Afternoon (Periods 5, 6, 7)',
};

export const defaultNaanMudhalvan2ndYearSession: SpecialSession = {
  name: 'Naan Mudhalvan (2nd Year)',
  sessionName: 'Naan Mudhalvan',
  day: 'Thursday',
  period: 'AFTERNOON',
  startPeriod: 5,
  endPeriod: 7,
  sessionType: 'NAAN_MUTHALVAN',
  year: 'II',
  type: 'SPECIAL',
  locked: true,
  active: true,
  description: 'Tamil Nadu State Skill Initiative - 2nd Year Thursday Afternoon (Periods 5, 6, 7)',
};

export const defaultCareerGuidanceFinalYearSessions: SpecialSession[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => ({
  name: 'Career Guidance & Placement Training',
  sessionName: 'Career Guidance & Placement Training',
  day,
  period: 'AFTERNOON',
  startPeriod: 5,
  endPeriod: 7,
  sessionType: 'CAREER_GUIDANCE',
  year: 'IV',
  type: 'SPECIAL',
  locked: true,
  active: true,
  description: `Final Year Special Session: Career Guidance & Placement Training (${day} Periods 5, 6, 7)`,
}));

export const defaultCareerGuidanceFinalYearSession = defaultCareerGuidanceFinalYearSessions[2]; // Wednesday for backward compat

// Backwards-compatible aliases
export const defaultNaanMudhalvanSession = defaultNaanMudhalvan3rdYearSession;
export const defaultCareerGuidanceSession = defaultCareerGuidanceFinalYearSession;

export const getAllSpecialSessions = async (): Promise<SpecialSession[]> => {
  const defaultSessions: SpecialSession[] = [
    { id: 'naan_mudhalvan_3rd_year_default', ...defaultNaanMudhalvan3rdYearSession },
    { id: 'naan_mudhalvan_2nd_year_default', ...defaultNaanMudhalvan2ndYearSession },
    ...defaultCareerGuidanceFinalYearSessions.map((s, idx) => ({
      id: `career_guidance_final_year_${s.day.toLowerCase()}_default`,
      ...s
    })),
  ];

  await waitForAuth();
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

    // Ensure institutional defaults are included if missing for any year
    const hasNM3 = sessions.some(s => s.year === 'III' && s.name?.toLowerCase().includes('naan'));
    const hasNM2 = sessions.some(s => s.year === 'II' && s.name?.toLowerCase().includes('naan'));
    const hasCG4 = sessions.some(s => s.year === 'IV' && (s.name?.toLowerCase().includes('career') || s.name?.toLowerCase().includes('placement')));

    const result = [...sessions];
    if (!hasNM3) result.push({ id: 'naan_mudhalvan_3rd_year_default', ...defaultNaanMudhalvan3rdYearSession });
    if (!hasNM2) result.push({ id: 'naan_mudhalvan_2nd_year_default', ...defaultNaanMudhalvan2ndYearSession });
    if (!hasCG4) {
      defaultCareerGuidanceFinalYearSessions.forEach(s => {
        result.push({ id: `career_guidance_final_year_${s.day.toLowerCase()}_default`, ...s });
      });
    }

    return result;
  } catch (error: any) {
    console.error('[specialSessionService] Error fetching special sessions from Firestore:', error);
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
