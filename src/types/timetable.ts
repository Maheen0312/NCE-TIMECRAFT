export type SubjectType = 'THEORY' | 'LAB' | 'SPECIAL';
export type RoomType = 'CLASSROOM' | 'LAB' | 'SEMINAR_HALL';
export type TimeSlotType = 'CLASS' | 'BREAK' | 'LUNCH' | 'SPECIAL';
export type SpecialPeriodType = 'MORNING' | 'AFTERNOON' | 'FULL_DAY' | 'CUSTOM';
export type TimetableStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type EntrySource = 'GENERATED' | 'MANUAL' | 'FIXED' | 'AI_SUGGESTED';
export type EntryType = 'THEORY' | 'LAB' | 'SPECIAL' | 'BREAK' | 'LUNCH' | 'LOCKED';

export interface StaffProfile {
  id?: string;
  staffCode: string;
  name: string;
  email: string;
  designation?: string;
  phone?: string;
  title?: string;
  department: string;
  active: boolean;
  userId?: string | null;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export interface Subject {
  id?: string;
  subjectCode: string;
  subjectName: string;
  type: SubjectType;
  weeklyHours: number;
  assignedStaff: string[]; // staff codes, e.g. ["JT"]
  department: string;
  year: string;
  semester: string;
  active: boolean;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export interface Lab {
  id?: string;
  labCode: string;
  labName: string;
  capacity: number;
  duration: number; // e.g. 2 periods
  preferredPeriod: 'Morning' | 'Afternoon' | 'Any';
  department?: string;
  active: boolean;
}

export interface Room {
  id?: string;
  roomNumber: string;
  roomName?: string;
  type: RoomType;
  capacity: number;
  building?: string;
  floor?: string;
  department?: string;
  active: boolean;
}

export interface TimeSlot {
  id?: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // e.g. "09:10"
  endTime: string;   // e.g. "10:00"
  order: number;     // 0 to 8
  type: TimeSlotType;
  name?: string;
  active?: boolean;
}

export interface SpecialSession {
  id?: string;
  name: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'ALL';
  period: SpecialPeriodType;
  type: 'SPECIAL';
  locked: boolean;
  department?: string;
  description?: string;
  year?: string; // 'ALL' | 'II' | 'III' | 'IV'
}

export interface UnavailableSlot {
  day: string;
  slotIndex: number;
  reason?: string;
}

export interface SchedulingRules {
  id?: string;
  theoryDefaultHours: number;    // default 4
  labDefaultDuration: number;    // default 2 continuous periods
  workingDays: string[];         // Monday - Friday
  preferTheoryMorning: boolean;  // true
  preferLabsAfternoon: boolean;  // true
  avoidConsecutiveSameSubject: boolean;
  maxConsecutiveClasses: number; // default 3
  reserveWedAfternoon?: boolean; // Institutional locked session toggle (Naan Mudhalvan)
  staffAvailability?: {
    [staffCode: string]: UnavailableSlot[];
  };
  roomAvailability?: {
    [roomNumber: string]: UnavailableSlot[];
  };
  staffPreferences?: {
    [staffCode: string]: {
      preferMorning?: boolean;
      preferAfternoon?: boolean;
      avoidPeriods?: number[];
    };
  };
  subjectPreferences?: {
    [subjectCode: string]: {
      preferredDay?: string;
      preferredSession?: 'Morning' | 'Afternoon';
    };
  };
}

export interface TimetableEntry {
  id: string;
  day: string;
  slotIndex: number;            // 0 to 8
  startTime: string;
  endTime: string;
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
  staffCode?: string;
  staffName?: string;
  roomId?: string;
  roomNumber?: string;
  type: EntryType;
  locked?: boolean;
  source?: EntrySource;
  notes?: string;
  year?: string;
  semester?: string;
}

export interface ValidationConflict {
  type: 'STAFF_CONFLICT' | 'ROOM_CONFLICT' | 'LAB_CONFLICT' | 'TIME_CONFLICT' | 'WEEKLY_HOURS' | 'LOCKED_SESSION' | 'ROOM_TYPE' | 'LAB_CONTINUITY' | 'WORKING_DAY' | 'BREAK' | 'LUNCH' | 'COLLISION' | 'UNASSIGNED' | 'OVERLOAD' | 'CONSECUTIVE_LIMIT' | 'LOCKED_VIOLATION';
  message: string;
  day?: string;
  slotIndex?: number;
  subjectCode?: string;
  staffCode?: string;
  roomNumber?: string;
  canAutoFix?: boolean;
}

export interface MissingHourDetail {
  subjectCode: string;
  subjectName: string;
  required: number;
  scheduled: number;
  missing?: number;
  diff?: number;
}

export interface QualityMetrics {
  subjectDistribution?: number;
  workloadBalance?: number;
  morningTheoryRatio?: number;
  afternoonLabRatio?: number;
  roomUtilization?: number;
  freePeriodEfficiency?: number;
  labContinuousCompliance?: number;
  staffSpreadScore?: number;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: string[];
  warnings?: string[];
  detailedConflicts?: ValidationConflict[];
  missingHours?: MissingHourDetail[];
  staffConflicts?: string[];
  roomConflicts?: string[];
  labConflicts?: string[];
  lockedSessionConflicts?: string[];
  qualityScore?: number;
  qualityMetrics?: QualityMetrics;
}

export interface TimetableStats {
  totalClasses: number;
  theoryHours: number;
  labHours: number;
  specialHours: number;
  freeSlots?: number;
}

export interface TimetableChangeLog {
  id?: string;
  action: 'MOVE_CLASS' | 'ADD_CLASS' | 'EDIT_CLASS' | 'DELETE_CLASS' | 'REGENERATE' | 'AUTO_FIX' | 'PUBLISH' | 'RESTORE' | 'AI_APPLY';
  entryId?: string;
  subjectCode?: string;
  from?: {
    day: string;
    slotIndex: number;
    startTime?: string;
    roomNumber?: string;
  };
  to?: {
    day: string;
    slotIndex: number;
    startTime?: string;
    roomNumber?: string;
  };
  description: string;
  changedBy: string;
  changedAt: string | any;
}

export interface TimetableVersion {
  id?: string;
  timetableId: string;
  version: number;
  name: string;
  department: string;
  year: string;
  semester: string;
  status: TimetableStatus;
  qualityScore: number;
  conflictCount: number;
  scheduledHours: number;
  academicYear?: string;
  createdBy: string;
  createdAt: string | any;
  publishedAt?: string | any;
  summary?: string;
  entriesSnapshot: TimetableEntry[];
}

export interface Timetable {
  id?: string;
  name: string;
  department: string;
  year: string;
  semester: string;
  academicYear?: string;
  status: TimetableStatus;
  version: number;
  createdBy?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
  publishedAt?: string | any;
  qualityScore?: number;
  entries: TimetableEntry[];
  validation?: ValidationResult;
  stats?: TimetableStats;
  changeHistory?: TimetableChangeLog[];
  isTemporary?: boolean;
  isGenerated?: boolean;
}

// AI Assistant & Suggestion Types
export interface AiTimetableSuggestionChange {
  entryId: string;
  subjectCode: string;
  from: {
    day: string;
    slotIndex: number;
    startTime: string;
  };
  to: {
    day: string;
    slotIndex: number;
    startTime: string;
  };
}

export interface AiTimetableSuggestion {
  type: 'SUGGESTION' | 'EXPLANATION' | 'ANALYSIS' | 'GENERAL';
  message: string;
  change?: AiTimetableSuggestionChange;
  reason?: string;
  confidence?: number;
}

export interface AiAnalysisResult {
  overallAnalysis: string;
  strengths: string[];
  issues: string[];
  recommendations: string[];
  qualityExplanation: string;
  workloadSummary: {
    staffCode: string;
    staffName: string;
    totalHours: number;
    distribution: string;
  }[];
}

export interface ExtractedDataRecord {
  id: string;
  subjectName: string;
  subjectCode: string;
  staffName: string;
  staffCode: string;
  weeklyHours: number;
  type: SubjectType;
  department: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ExtractedTimetableGridEntry {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  slotIndex: number; // 0 to 6
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  staffCode?: string;
  staffName?: string;
  roomNumber?: string;
  type: 'THEORY' | 'LAB' | 'SPECIAL' | 'LOCKED';
}

export interface ExtractedSubjectRecord {
  subjectCode: string;
  subjectName: string;
  type: 'THEORY' | 'LAB' | 'SPECIAL';
  weeklyHours: number;
  assignedStaff: string[];
  staffName?: string;
}

export interface ExtractedFacultyRecord {
  staffCode: string;
  name: string;
  department?: string;
}

export interface ExtractedTimetableImageResult {
  timetableName: string;
  department: string;
  year: string;
  semester: string;
  academicYear?: string;
  section?: string;
  classAdvisor?: string;
  classroomNumber?: string;
  gridEntries: ExtractedTimetableGridEntry[];
  subjects: ExtractedSubjectRecord[];
  facultyList: ExtractedFacultyRecord[];
  roomsDetected: string[];
  rawSummary?: string;
  confidenceScore?: number;
}

// ================= PHASE 5 TYPES =================

export type NotificationType =
  | 'TIMETABLE_PUBLISHED'
  | 'TIMETABLE_UPDATED'
  | 'CONFLICT_DETECTED'
  | 'GENERATION_COMPLETED'
  | 'GENERATION_FAILED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'TIMETABLE_REVIEW_REQUIRED'
  | 'SYSTEM_INFO';

export interface NotificationItem {
  id?: string;
  userId: string; // 'ADMIN', 'ALL', or specific user UID / staffCode
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string | any;
  relatedId?: string;
  link?: string;
}

export type AuditAction =
  | 'CREATE_STAFF'
  | 'UPDATE_STAFF'
  | 'DELETE_STAFF'
  | 'CREATE_SUBJECT'
  | 'UPDATE_SUBJECT'
  | 'DELETE_SUBJECT'
  | 'CREATE_ROOM'
  | 'UPDATE_ROOM'
  | 'DELETE_ROOM'
  | 'CREATE_LAB'
  | 'UPDATE_LAB'
  | 'DELETE_LAB'
  | 'GENERATE_TIMETABLE'
  | 'EDIT_TIMETABLE'
  | 'AUTO_FIX_TIMETABLE'
  | 'PUBLISH_TIMETABLE'
  | 'RESTORE_VERSION'
  | 'AI_SUGGESTION_APPLIED'
  | 'SEED_DATABASE'
  | 'UPDATE_SETTINGS';

export type AuditResource =
  | 'STAFF'
  | 'SUBJECT'
  | 'ROOM'
  | 'LAB'
  | 'TIMETABLE'
  | 'VERSION'
  | 'SETTINGS'
  | 'SYSTEM';

export interface AuditLog {
  id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: string;
  timestamp: string | any;
  metadata?: any;
}

export interface AcademicYearConfig {
  id?: string;
  academicYear: string; // e.g. "2026–2027"
  department: string;   // e.g. "Computer Science and Engineering"
  year: string;         // e.g. "III"
  semester: string;     // e.g. "5"
  active: boolean;
  label?: string;
}

export interface CollegeSettings {
  id?: string;
  collegeName: string;
  collegeCode?: string;
  department: string;
  academicYear: string;
  semester: string | number;
  year?: string;
  hodName?: string;
  principalName?: string;
  workingDays?: string[];
  workingDaysPerWeek?: number;
  periodsPerDay?: number;
  periodDurationMinutes?: number;
  naanMudhalvanDay?: string;
  naanMudhalvanSlots?: number[];
  enableAiAssistant?: boolean;
  notificationEmails?: string[];
  autoAiAnalysis?: boolean;
  notificationPreferences?: {
    publishAlerts: boolean;
    conflictAlerts: boolean;
    aiCompletionAlerts: boolean;
  };
  staffAvailability?: {
    [staffCode: string]: UnavailableSlot[];
  };
  roomAvailability?: {
    [roomNumber: string]: UnavailableSlot[];
  };
  staffPreferences?: {
    [staffCode: string]: {
      preferMorning?: boolean;
      preferAfternoon?: boolean;
      avoidPeriods?: number[];
    };
  };
  subjectPreferences?: {
    [subjectCode: string]: {
      preferredDay?: string;
      preferredSession?: 'Morning' | 'Afternoon';
    };
  };
  updatedAt?: string | any;
}

export interface StaffWorkloadSummary {
  staffCode: string;
  staffName: string;
  department: string;
  requiredHours: number;
  scheduledHours: number;
  freePeriods: number;
  maxConsecutive: number;
  status: 'Complete' | 'Underallocated' | 'Overallocated';
  consecutiveAlert?: boolean;
  subjectsAssigned: string[];
}

export interface SubjectAnalyticsSummary {
  subjectCode: string;
  subjectName: string;
  type: SubjectType;
  requiredHours: number;
  scheduledHours: number;
  remainingHours: number;
  assignedStaff: string[];
  staffNames: string[];
  status: 'Complete' | 'Incomplete' | 'Overallocated';
  missingMessage?: string;
}

export interface RoomUtilizationSummary {
  roomNumber: string;
  roomName?: string;
  type: RoomType;
  capacity: number;
  occupiedSlots: number;
  availableSlots: number;
  utilizationRate: number; // percentage e.g. 65
}

export interface LabUtilizationSummary {
  labCode: string;
  labName: string;
  occupiedHours: number;
  availableHours: number;
  utilizationRate: number;
}

export interface HealthScoreBreakdown {
  overallScore: number;
  conflictFreeScore: number;
  weeklyHoursScore: number;
  roomUtilizationScore: number;
  staffDistributionScore: number;
  subjectDistributionScore: number;
}

export interface TimetableAnalyticsData {
  timetableId: string;
  department: string;
  year: string;
  semester: string;
  academicYear: string;
  totalClasses: number;
  totalScheduledHours: number;
  totalFreeSlots: number;
  morningClassesCount: number;
  afternoonClassesCount: number;
  healthScore: HealthScoreBreakdown;
  staffWorkloads: StaffWorkloadSummary[];
  subjectAnalytics: SubjectAnalyticsSummary[];
  roomUtilizations: RoomUtilizationSummary[];
  labUtilizations: LabUtilizationSummary[];
  mostUsedRooms: RoomUtilizationSummary[];
  leastUsedRooms: RoomUtilizationSummary[];
  aiSummaryText: string;
  aiRecommendations: string[];
}
