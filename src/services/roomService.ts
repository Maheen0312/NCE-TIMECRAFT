import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { Room } from '@/types/timetable';
import { MASTER_ROOMS } from '@/config/timetableConfig';

export type { Room };

const ROOMS_COLLECTION = 'rooms';

const defaultMasterRooms: Room[] = MASTER_ROOMS.map(r => ({
  id: `room_${r.roomNumber}`,
  roomNumber: r.roomNumber,
  roomName: r.roomName,
  type: r.type,
  capacity: r.capacity,
  department: 'Computer Science & Engineering',
  active: true,
}));

export const getAllRooms = async (): Promise<Room[]> => {
  try {
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const querySnapshot = await getDocs(roomsRef);
    const rawRooms = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Room));

    // Deduplicate by normalized roomNumber
    const seen = new Set<string>();
    const uniqueRooms: Room[] = [];
    for (const r of rawRooms) {
      const code = (r.roomNumber || r.id).trim().toUpperCase();
      if (!seen.has(code)) {
        seen.add(code);
        uniqueRooms.push(r);
      }
    }
    return uniqueRooms.length > 0 ? uniqueRooms : defaultMasterRooms;
  } catch (error) {
    console.warn('Notice fetching rooms from Firestore, falling back to master rooms configuration:', error);
    return defaultMasterRooms;
  }
};

export const getRoomByNumber = async (roomNumber: string): Promise<Room | null> => {
  try {
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const q = query(roomsRef, where('roomNumber', '==', roomNumber));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Room;
    }
    return null;
  } catch (error) {
    console.error('Error fetching room by number:', error);
    return null;
  }
};

export const createRoom = async (data: Omit<Room, 'id'>): Promise<string> => {
  const existing = await getRoomByNumber(data.roomNumber.trim().toUpperCase());
  if (existing) {
    throw new Error(`Room number "${data.roomNumber}" already exists.`);
  }

  const roomsRef = collection(db, ROOMS_COLLECTION);
  const docRef = await addDoc(roomsRef, {
    roomNumber: data.roomNumber.trim().toUpperCase(),
    roomName: data.roomName.trim(),
    type: data.type || 'CLASSROOM',
    capacity: Number(data.capacity) || 60,
    department: data.department || 'Computer Science & Engineering',
    active: data.active !== undefined ? data.active : true,
  });

  return docRef.id;
};

export const updateRoom = async (id: string, data: Partial<Room>): Promise<void> => {
  const docRef = doc(db, ROOMS_COLLECTION, id);
  const updateData: any = { ...data };
  if (data.roomNumber) updateData.roomNumber = data.roomNumber.trim().toUpperCase();
  if (data.capacity) updateData.capacity = Number(data.capacity);
  await updateDoc(docRef, updateData);
};

export const deleteRoom = async (id: string): Promise<void> => {
  const docRef = doc(db, ROOMS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getRooms = getAllRooms;

