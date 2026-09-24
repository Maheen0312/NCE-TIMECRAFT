import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { CollegeSettings } from '@/types/timetable';
import { logAuditEvent } from './auditService';
import { getCurrentEngineeringAcademicYear } from '@/utils/dateUtils';

const SETTINGS_DOC_ID = 'main';
const COLLECTION_NAME = 'collegeSettings';

export const defaultCollegeSettings: CollegeSettings = {
  collegeName: 'National College of Engineering',
  collegeCode: 'NCE-9513',
  department: 'Computer Science and Engineering',
  academicYear: getCurrentEngineeringAcademicYear(),
  semester: '5',
  year: 'III',
  hodName: 'Dr. S. Sundaram, Ph.D.',
  principalName: 'Dr. M. Ramanathan, Ph.D.',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  workingDaysPerWeek: 5,
  periodsPerDay: 7,
  periodDurationMinutes: 50,
  naanMudhalvanDay: 'Wednesday',
  naanMudhalvanSlots: [5, 6, 7],
  enableAiAssistant: true,
  autoAiAnalysis: true,
  notificationPreferences: {
    publishAlerts: true,
    conflictAlerts: true,
    aiCompletionAlerts: true,
  },
  staffAvailability: {},
  roomAvailability: {},
  staffPreferences: {},
  subjectPreferences: {},
};

export const getCollegeSettings = async (): Promise<CollegeSettings> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() || {};
      return {
        ...defaultCollegeSettings,
        ...data,
        collegeName: data.collegeName || defaultCollegeSettings.collegeName,
        collegeCode: data.collegeCode || defaultCollegeSettings.collegeCode,
        department: data.department || defaultCollegeSettings.department,
        academicYear: data.academicYear || defaultCollegeSettings.academicYear,
        hodName: data.hodName || defaultCollegeSettings.hodName,
        principalName: data.principalName || defaultCollegeSettings.principalName,
        workingDaysPerWeek: data.workingDaysPerWeek ?? defaultCollegeSettings.workingDaysPerWeek,
        periodsPerDay: data.periodsPerDay ?? defaultCollegeSettings.periodsPerDay,
        periodDurationMinutes: data.periodDurationMinutes ?? defaultCollegeSettings.periodDurationMinutes,
      } as CollegeSettings;
    }
    // If not exists, initialize default
    await setDoc(docRef, { ...defaultCollegeSettings, createdAt: serverTimestamp() });
    return defaultCollegeSettings;
  } catch (error) {
    console.error('Error fetching college settings:', error);
    return defaultCollegeSettings;
  }
};

export const updateCollegeSettings = async (settings: Partial<CollegeSettings>): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await logAuditEvent('UPDATE_SETTINGS', 'SETTINGS', 'main', 'Updated institutional configuration and scheduling preferences');
    return true;
  } catch (error) {
    console.error('Error updating college settings:', error);
    return false;
  }
};

export const saveCollegeSettings = updateCollegeSettings;


export interface SystemHealthStatus {
  firebase: 'Connected' | 'Disconnected';
  backend: 'Connected' | 'Unavailable';
  ai: 'Available' | 'Unavailable';
  scheduler: 'Operational' | 'Degraded';
  lastChecked: string;
}

export const checkSystemHealth = async (): Promise<SystemHealthStatus> => {
  let backendStatus: 'Connected' | 'Unavailable' = 'Unavailable';
  let aiStatus: 'Available' | 'Unavailable' = 'Unavailable';
  let firebaseStatus: 'Connected' | 'Disconnected' = 'Disconnected';

  // 1. Check Firebase
  try {
    const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
    await getDoc(docRef);
    firebaseStatus = 'Connected';
  } catch (err) {
    firebaseStatus = 'Disconnected';
  }

  // 2. Check Backend & AI
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      const data = await response.json();
      backendStatus = 'Connected';
      aiStatus = 'Available';
    }
  } catch (err) {
    backendStatus = 'Unavailable';
    aiStatus = 'Unavailable';
  }

  return {
    firebase: firebaseStatus,
    backend: backendStatus,
    ai: aiStatus,
    scheduler: backendStatus === 'Connected' ? 'Operational' : 'Degraded',
    lastChecked: new Date().toLocaleTimeString(),
  };
};
