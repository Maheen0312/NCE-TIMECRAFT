import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { SchedulingRules } from '@/types/timetable';

export type { SchedulingRules };

const RULES_COLLECTION = 'schedulingRules';
const DEFAULT_RULES_DOC = 'default_rules';

export const defaultRules: SchedulingRules = {
  theoryDefaultHours: 4,
  labDefaultDuration: 2,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  preferTheoryMorning: true,
  preferLabsAfternoon: true,
  avoidConsecutiveSameSubject: true,
  maxConsecutiveClasses: 3,
};

export const getSchedulingRules = async (): Promise<SchedulingRules> => {
  try {
    const docRef = doc(db, RULES_COLLECTION, DEFAULT_RULES_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...defaultRules, id: docSnap.id, ...docSnap.data() } as SchedulingRules;
    }
    return defaultRules;
  } catch (error) {
    console.warn('Notice fetching scheduling rules from Firestore, falling back to default rules:', error);
    return defaultRules;
  }
};

export const saveSchedulingRules = async (rules: Partial<SchedulingRules>): Promise<void> => {
  const docRef = doc(db, RULES_COLLECTION, DEFAULT_RULES_DOC);
  await setDoc(docRef, {
    ...defaultRules,
    ...rules,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
