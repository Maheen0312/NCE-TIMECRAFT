import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { NotificationItem, NotificationType } from '@/types/timetable';

const COLLECTION_NAME = 'notifications';

export const subscribeToNotifications = (
  userId: string,
  role: 'admin' | 'staff' | string,
  callback: (notifications: NotificationItem[]) => void
): Unsubscribe => {
  try {
    const notificationsRef = collection(db, COLLECTION_NAME);
    // Admins receive notifications directed to 'ADMIN', 'ALL', or their specific UID
    // Staff receive notifications directed to 'ALL', their staffCode, or their specific UID
    let q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as NotificationItem[];

        // Client-side filtering by user target
        const filtered = all.filter((n) => {
          if (role === 'admin') {
            return n.userId === 'ADMIN' || n.userId === 'ALL' || n.userId === userId;
          }
          return n.userId === 'ALL' || n.userId === userId;
        });

        callback(filtered);
      },
      (error) => {
        console.warn('Firestore notification listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to notifications:', err);
    return () => {};
  }
};

export const getNotifications = async (
  userId: string,
  role: 'admin' | 'staff' | string
): Promise<NotificationItem[]> => {
  try {
    const notificationsRef = collection(db, COLLECTION_NAME);
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    const all = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as NotificationItem[];

    return all.filter((n) => {
      if (role === 'admin') {
        return n.userId === 'ADMIN' || n.userId === 'ALL' || n.userId === userId;
      }
      return n.userId === 'ALL' || n.userId === userId;
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const createNotification = async (
  notification: Omit<NotificationItem, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const notificationsRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(notificationsRef, {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return '';
  }
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (
  userId: string,
  role: 'admin' | 'staff' | string
): Promise<void> => {
  try {
    const current = await getNotifications(userId, role);
    const unread = current.filter((n) => !n.read && n.id);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((item) => {
      if (item.id) {
        const ref = doc(db, COLLECTION_NAME, item.id);
        batch.update(ref, { read: true });
      }
    });
    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

export const deleteNotification = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};

export const clearAllNotifications = async (
  userId: string,
  role: 'admin' | 'staff' | string
): Promise<void> => {
  try {
    const list = await getNotifications(userId, role);
    if (list.length === 0) return;

    const batch = writeBatch(db);
    list.forEach((item) => {
      if (item.id) {
        const ref = doc(db, COLLECTION_NAME, item.id);
        batch.delete(ref);
      }
    });
    await batch.commit();
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

// Convenience helpers
export const notifyTimetablePublished = async (
  department: string,
  year: string,
  semester: string,
  version: number,
  timetableId: string
) => {
  // Notify Admin
  await createNotification({
    userId: 'ADMIN',
    type: 'TIMETABLE_PUBLISHED',
    title: `✓ Timetable Version ${version} Published`,
    message: `${department} Year ${year} Sem ${semester} timetable has been successfully published to staff and students.`,
    read: false,
    relatedId: timetableId,
    link: '/admin/timetable',
  });

  // Notify Staff
  await createNotification({
    userId: 'ALL',
    type: 'TIMETABLE_PUBLISHED',
    title: `📅 New Academic Timetable Published`,
    message: `The official timetable for ${department} (Year ${year} Sem ${semester}, Version ${version}) is now active. Check your personalized schedule.`,
    read: false,
    relatedId: timetableId,
    link: '/staff/timetable',
  });
};

export const notifyConflictDetected = async (
  department: string,
  conflictCount: number,
  timetableId: string
) => {
  await createNotification({
    userId: 'ADMIN',
    type: 'CONFLICT_DETECTED',
    title: `⚠ ${conflictCount} Scheduling Conflict${conflictCount > 1 ? 's' : ''} Detected`,
    message: `${conflictCount} resource constraint issues detected in ${department} timetable. Review or run Auto-Fix.`,
    read: false,
    relatedId: timetableId,
    link: '/admin/timetable',
  });
};

export const notifyGenerationCompleted = async (
  department: string,
  year: string,
  semester: string,
  qualityScore: number,
  timetableId: string
) => {
  await createNotification({
    userId: 'ADMIN',
    type: 'GENERATION_COMPLETED',
    title: `✨ Timetable Generated Successfully`,
    message: `Automated schedule generated for ${department} Year ${year} Sem ${semester} with ${qualityScore}% quality health score.`,
    read: false,
    relatedId: timetableId,
    link: '/admin/timetable',
  });
};

export const notifyAiAnalysisCompleted = async (
  department: string,
  timetableId: string
) => {
  await createNotification({
    userId: 'ADMIN',
    type: 'AI_ANALYSIS_COMPLETED',
    title: `✨ AI Diagnostics & Recommendations Ready`,
    message: `Comprehensive AI intelligence audit complete for ${department}. Actionable optimizations available in the editor.`,
    read: false,
    relatedId: timetableId,
    link: '/admin/timetable',
  });
};
