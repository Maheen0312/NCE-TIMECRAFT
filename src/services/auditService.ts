import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { auth } from '@/firebase/auth';
import { AuditAction, AuditLog, AuditResource } from '@/types/timetable';

const COLLECTION_NAME = 'auditLogs';

export const logAuditEvent = async (
  action: AuditAction,
  resource: AuditResource,
  resourceId?: string,
  details?: string,
  metadata?: any
): Promise<string> => {
  try {
    const user = auth.currentUser;
    const auditLogsRef = collection(db, COLLECTION_NAME);
    
    const docRef = await addDoc(auditLogsRef, {
      userId: user?.uid || 'SYSTEM',
      userName: user?.displayName || user?.email?.split('@')[0] || 'Administrator',
      userEmail: user?.email || 'admin@nce.edu',
      action,
      resource,
      resourceId: resourceId || '',
      details: details || `Performed ${action} on ${resource}`,
      metadata: metadata || null,
      timestamp: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return '';
  }
};

export const getAuditLogs = async (
  maxCount: number = 100,
  filterAction?: string,
  filterResource?: string
): Promise<AuditLog[]> => {
  try {
    const auditLogsRef = collection(db, COLLECTION_NAME);
    let q = query(auditLogsRef, orderBy('timestamp', 'desc'), limit(maxCount));

    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp || new Date().toISOString(),
      } as AuditLog;
    });

    if (filterAction && filterAction !== 'ALL') {
      logs = logs.filter((l) => l.action === filterAction);
    }
    if (filterResource && filterResource !== 'ALL') {
      logs = logs.filter((l) => l.resource === filterResource);
    }

    return logs;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};
