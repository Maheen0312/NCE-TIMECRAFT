import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { TimeSlot } from '@/types/timetable';

const SLOTS_COLLECTION = 'timeSlots';

export const defaultMasterTimeSlots: Omit<TimeSlot, 'id'>[] = [
  { day: 'Monday', startTime: '09:10', endTime: '10:00', type: 'CLASS', order: 0, active: true },
  { day: 'Monday', startTime: '10:00', endTime: '10:50', type: 'CLASS', order: 1, active: true },
  { day: 'Monday', startTime: '10:50', endTime: '11:10', type: 'BREAK', order: 2, active: true },
  { day: 'Monday', startTime: '11:10', endTime: '12:00', type: 'CLASS', order: 3, active: true },
  { day: 'Monday', startTime: '12:00', endTime: '12:50', type: 'CLASS', order: 4, active: true },
  { day: 'Monday', startTime: '12:50', endTime: '01:40', type: 'LUNCH', order: 5, active: true },
  { day: 'Monday', startTime: '01:40', endTime: '02:30', type: 'CLASS', order: 6, active: true },
  { day: 'Monday', startTime: '02:30', endTime: '03:20', type: 'CLASS', order: 7, active: true },
  { day: 'Monday', startTime: '03:20', endTime: '04:20', type: 'CLASS', order: 8, active: true },
];

export const getAllTimeSlots = async (): Promise<TimeSlot[]> => {
  try {
    const slotsRef = collection(db, SLOTS_COLLECTION);
    const querySnapshot = await getDocs(slotsRef);
    const slots = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TimeSlot));

    if (slots.length === 0) {
      // Return default template
      return defaultMasterTimeSlots.map((s, idx) => ({ id: `default_${idx}`, ...s }));
    }

    return slots.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.warn('Notice fetching time slots from Firestore, falling back to master slots template:', error);
    return defaultMasterTimeSlots.map((s, idx) => ({ id: `default_${idx}`, ...s }));
  }
};

export const saveTimeSlot = async (data: Omit<TimeSlot, 'id'>): Promise<string> => {
  const slotsRef = collection(db, SLOTS_COLLECTION);
  const docRef = await addDoc(slotsRef, {
    ...data,
    order: Number(data.order) || 0,
    active: data.active !== undefined ? data.active : true,
  });
  return docRef.id;
};

export const updateTimeSlot = async (id: string, data: Partial<TimeSlot>): Promise<void> => {
  const docRef = doc(db, SLOTS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteTimeSlot = async (id: string): Promise<void> => {
  const docRef = doc(db, SLOTS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getTimeSlots = getAllTimeSlots;

