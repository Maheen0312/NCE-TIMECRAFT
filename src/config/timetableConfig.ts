import { StaffProfile, Subject, Lab, Room, TimeSlot } from '@/types/timetable';

/**
 * NCE TIMECRAFT - Centralized Master Configuration
 * All staff, subjects, laboratories, rooms, and scheduling constraints are defined here as the single source of truth.
 */

export interface MasterStaffConfig {
  staffCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  isLabFaculty: boolean;
}

export interface MasterSubjectConfig {
  subjectCode: string;
  subjectName: string;
  type: 'THEORY' | 'LAB';
  weeklyHours: number;
  assignedStaffCode: string;
  department: string;
  year: string;
  semester: string;
}

export interface MasterLabConfig {
  labCode: string;
  labName: string;
  subjectCode: string;
  staffCode: string;
  capacity: number;
  duration: number; // 2 periods
  defaultRoom: string;
  year: string;
  semester: string;
}

export const MASTER_STAFF: MasterStaffConfig[] = [
  { staffCode: 'MRH', name: 'Mrs. M. Rabiyathul Hussaina', email: 'mrh@nce.edu', department: 'Computer Science & Engineering', designation: 'Associate Professor', isLabFaculty: true },
  { staffCode: 'JT', name: 'Mrs. J. Tamilarsi', email: 'tamilarsi@nce.edu', department: 'Computer Science & Engineering', designation: 'Associate Professor', isLabFaculty: true },
  { staffCode: 'KSE', name: 'Mr. K. Sam Eliser', email: 'kse@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
  { staffCode: 'UP', name: 'Mrs. U. Priyanka', email: 'priyanka@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
  { staffCode: 'SSS', name: 'Mrs. S. Sweety Sonia', email: 'sss@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: true },
  { staffCode: 'SKS', name: 'Mrs. S. K. Sujitha', email: 'sujitha@gmail.com', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: true },
  { staffCode: 'MSM', name: 'Mr. M. S. Mohamed Mohideen', email: 'mohideenmaheen@gmail.com', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
  { staffCode: 'PSI', name: 'Mr. P. Syed Ibrahim', email: 'psi@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
  { staffCode: 'SS', name: 'Mrs. S. Sweetha', email: 'sweetha@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
  { staffCode: 'SM', name: 'Staff SM', email: 'sm@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
  { staffCode: 'MSA', name: 'Mr. M. S. Akash', email: 'akash@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: true },
  { staffCode: 'GP', name: 'Mrs. G. Pitchammal', email: 'pitchammal@nce.edu', department: 'Computer Science & Engineering', designation: 'Professor & HOD', isLabFaculty: false },
  { staffCode: 'AS', name: 'Mrs. A. Swetha', email: 'swetha@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
  { staffCode: 'MM', name: 'Ms. M. Muthuselvi', email: 'muthuselvi@nce.edu', department: 'Computer Science & Engineering', designation: 'Assistant Professor', isLabFaculty: false },
];

export const MASTER_THEORY_SUBJECTS: MasterSubjectConfig[] = [
  // --- YEAR II (Semester 3) Subjects ---
  { subjectCode: 'MA2508', subjectName: 'Discrete Mathematics', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'PSI', department: 'Computer Science & Engineering', year: 'II', semester: '3' },
  { subjectCode: 'CS2511', subjectName: 'Operating Systems', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'KSE', department: 'Computer Science & Engineering', year: 'II', semester: '3' },
  { subjectCode: 'CS2510', subjectName: 'Object Oriented Software Engineering', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'SM', department: 'Computer Science & Engineering', year: 'II', semester: '3' },
  { subjectCode: 'CS2508', subjectName: 'Data Structures', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'UP', department: 'Computer Science & Engineering', year: 'II', semester: '3' },
  { subjectCode: 'CS2509', subjectName: 'Java Programming', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'SS', department: 'Computer Science & Engineering', year: 'II', semester: '3' },
  { subjectCode: 'SD2501', subjectName: 'Skill Development Course - I', type: 'THEORY', weeklyHours: 2, assignedStaffCode: 'GP', department: 'Computer Science & Engineering', year: 'II', semester: '3' },

  // --- YEAR III (Semester 5) Subjects ---
  { subjectCode: 'CS3591', subjectName: 'Computer Networks', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'MRH', department: 'Computer Science & Engineering', year: 'III', semester: '5' },
  { subjectCode: 'CS3501', subjectName: 'Compiler Design', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'JT', department: 'Computer Science & Engineering', year: 'III', semester: '5' },
  { subjectCode: 'CB3491', subjectName: 'Cryptography and Cyber Security', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'AS', department: 'Computer Science & Engineering', year: 'III', semester: '5' },
  { subjectCode: 'CS3151', subjectName: 'Distributed Computing', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'UP', department: 'Computer Science & Engineering', year: 'III', semester: '5' },
  { subjectCode: 'CS3353', subjectName: 'Cloud Computing', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'SSS', department: 'Computer Science & Engineering', year: 'III', semester: '5' },
  { subjectCode: 'CS3370', subjectName: 'UI & UX Design', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'SKS', department: 'Computer Science & Engineering', year: 'III', semester: '5' },
  { subjectCode: 'MX3084', subjectName: 'Disaster Management', type: 'THEORY', weeklyHours: 2, assignedStaffCode: 'MSM', department: 'Computer Science & Engineering', year: 'III', semester: '5' },

  // --- FINAL YEAR / YEAR IV (Semester 7) Subjects ---
  { subjectCode: 'GE3791', subjectName: 'Human Values and Ethics', type: 'THEORY', weeklyHours: 2, assignedStaffCode: 'AS', department: 'Computer Science & Engineering', year: 'IV', semester: '7' },
  { subjectCode: 'GE3752', subjectName: 'Total Quality Management', type: 'THEORY', weeklyHours: 4, assignedStaffCode: 'JT', department: 'Computer Science & Engineering', year: 'IV', semester: '7' },
  { subjectCode: 'FD352', subjectName: 'Traditional Indian Foods', type: 'THEORY', weeklyHours: 3, assignedStaffCode: 'MM', department: 'Computer Science & Engineering', year: 'IV', semester: '7' },
  { subjectCode: 'AI3021', subjectName: 'IT in Agriculture', type: 'THEORY', weeklyHours: 3, assignedStaffCode: 'SSS', department: 'Computer Science & Engineering', year: 'IV', semester: '7' },
];

export const MASTER_LABS: MasterLabConfig[] = [
  // --- YEAR II (Semester 3) Labs ---
  { labCode: 'EN2503', labName: 'English Communication Skills Lab', subjectCode: 'EN2503', staffCode: 'MSA', capacity: 35, duration: 2, defaultRoom: 'LAB-02', year: 'II', semester: '3' },

  // --- YEAR III (Semester 5) Labs ---
  { labCode: 'CS3511', labName: 'Compiler Design Laboratory', subjectCode: 'CS3501.', staffCode: 'JT', capacity: 35, duration: 2, defaultRoom: 'LAB-02', year: 'III', semester: '5' },
  { labCode: 'CS3512', labName: 'Computer Networks Laboratory', subjectCode: 'CS3591.', staffCode: 'MRH', capacity: 35, duration: 2, defaultRoom: 'LAB-01', year: 'III', semester: '5' },
  { labCode: 'CCS335', labName: 'Cloud Computing Lab', subjectCode: 'CCS335', staffCode: 'SSS', capacity: 35, duration: 2, defaultRoom: 'LAB-04', year: 'III', semester: '5' },
  { labCode: 'CCS370', labName: 'UI/UX Design Lab', subjectCode: 'CCS370', staffCode: 'SKS', capacity: 35, duration: 2, defaultRoom: 'LAB-03', year: 'III', semester: '5' },

  // --- FINAL YEAR / YEAR IV (Semester 7) Labs ---
  { labCode: 'CS3711', labName: 'Summer Internship', subjectCode: 'CS3711', staffCode: 'GP', capacity: 35, duration: 2, defaultRoom: 'LAB-01', year: 'IV', semester: '7' },
];

export const MASTER_ROOMS: Room[] = [
  { roomNumber: 'CSE-101', roomName: 'Classroom 101 (Year III)', type: 'CLASSROOM', capacity: 65, active: true },
  { roomNumber: 'CSE-102', roomName: 'Classroom 102 (Year II)', type: 'CLASSROOM', capacity: 65, active: true },
  { roomNumber: 'CSE-201', roomName: 'Smart Lecture Hall 201', type: 'CLASSROOM', capacity: 70, active: true },
  { roomNumber: 'LAB-01', roomName: 'Networks Laboratory (CS Lab 1)', type: 'LAB', capacity: 40, active: true },
  { roomNumber: 'LAB-02', roomName: 'Compiler Laboratory (CS Lab 2)', type: 'LAB', capacity: 40, active: true },
  { roomNumber: 'LAB-03', roomName: 'UI/UX Design Studio (CS Lab 3)', type: 'LAB', capacity: 40, active: true },
  { roomNumber: 'LAB-04', roomName: 'Cloud Computing Lab (CS Lab 4)', type: 'LAB', capacity: 40, active: true },
];

export const MASTER_PERIOD_DEFINITIONS = [
  { slotIndex: 0, periodNumber: 1, startTime: '09:10', endTime: '10:00', time: '09:10 - 10:00', label: 'Period 1', type: 'CLASS' as const, isMorning: true, isAfternoon: false },
  { slotIndex: 1, periodNumber: 2, startTime: '10:00', endTime: '10:50', time: '10:00 - 10:50', label: 'Period 2', type: 'CLASS' as const, isMorning: true, isAfternoon: false },
  { slotIndex: 2, periodNumber: null, startTime: '10:50', endTime: '11:10', time: '10:50 - 11:10', label: 'Tea Break', type: 'BREAK' as const, isMorning: true, isAfternoon: false },
  { slotIndex: 3, periodNumber: 3, startTime: '11:10', endTime: '12:00', time: '11:10 - 12:00', label: 'Period 3', type: 'CLASS' as const, isMorning: true, isAfternoon: false },
  { slotIndex: 4, periodNumber: 4, startTime: '12:00', endTime: '12:50', time: '12:00 - 12:50', label: 'Period 4', type: 'CLASS' as const, isMorning: true, isAfternoon: false },
  { slotIndex: 5, periodNumber: null, startTime: '12:50', endTime: '01:40', time: '12:50 - 01:40', label: 'Lunch Break', type: 'LUNCH' as const, isMorning: false, isAfternoon: true },
  { slotIndex: 6, periodNumber: 5, startTime: '01:40', endTime: '02:30', time: '01:40 - 02:30', label: 'Period 5', type: 'CLASS' as const, isMorning: false, isAfternoon: true },
  { slotIndex: 7, periodNumber: 6, startTime: '02:30', endTime: '03:20', time: '02:30 - 03:20', label: 'Period 6', type: 'CLASS' as const, isMorning: false, isAfternoon: true },
  { slotIndex: 8, periodNumber: 7, startTime: '03:20', endTime: '04:20', time: '03:20 - 04:20', label: 'Period 7', type: 'CLASS' as const, isMorning: false, isAfternoon: true },
];

export const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const LAB_AVAILABLE_DAYS = ['Monday', 'Tuesday', 'Thursday', 'Friday']; // Wednesday afternoon is strictly Naan Muthalvan

export const NAAN_MUTHALVAN_CONFIG = {
  name: 'Naan Muthalvan',
  code: 'NM-301',
  day: 'Wednesday',
  periodSlotIndices: [6, 7, 8], // Entire Wednesday Afternoon: Period 5 (01:40-02:30), Period 6 (02:30-03:20) and Period 7 (03:20-04:20)
  description: 'Mandatory Tamil Nadu State Skill & Employability Initiative (Wednesday Afternoon Fully Reserved Block)',
};

/**
 * Utility helper functions
 */
export function getStaffNameByCode(code?: string): string {
  if (!code) return '';
  const trimmed = code.trim().toUpperCase();
  const found = MASTER_STAFF.find(s => s.staffCode.toUpperCase() === trimmed);
  if (found) return found.name;
  if (trimmed === 'SM') return 'Staff SM';
  if (trimmed === 'SS') return 'Mrs. S. Sweetha';
  if (trimmed === 'SSS') return 'Mrs. S. Sweety Sonia';
  if (trimmed === 'KSE') return 'Mr. K. Sam Eliser';
  return code;
}

export function getSubjectNameByCode(code?: string): string {
  if (!code) return '';
  const theory = MASTER_THEORY_SUBJECTS.find(s => s.subjectCode === code);
  if (theory) return theory.subjectName;
  const lab = MASTER_LABS.find(l => l.subjectCode === code || l.labCode === code);
  if (lab) return lab.labName;
  if (code === 'NM-301' || code === 'NM') return 'Naan Muthalvan';
  return code;
}
