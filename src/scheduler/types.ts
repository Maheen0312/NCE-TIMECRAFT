import { 
  StaffProfile, 
  Subject, 
  Lab, 
  Room, 
  TimeSlot, 
  SpecialSession, 
  SchedulingRules, 
  TimetableEntry, 
  ValidationResult 
} from '../types/timetable';

export interface SchedulerInput {
  department: string;
  year: string;
  semester: string;
  staff: StaffProfile[];
  subjects: Subject[];
  labs: Lab[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  specialSessions: SpecialSession[];
  rules: SchedulingRules;
  seed?: number;
  consistentMode?: boolean;
  existingAllocations?: TimetableEntry[];
}

export interface PeriodSlot {
  id: string;
  day: string;
  slotIndex: number;
  startTime: string;
  endTime: string;
  type: 'CLASS' | 'BREAK' | 'LUNCH' | 'SPECIAL';
  isMorning: boolean;
  isAfternoon: boolean;
}

export interface SlotAllocation {
  slot: PeriodSlot;
  entry?: TimetableEntry;
  isReserved: boolean;
  reservedReason?: string;
}

export interface SchedulerOutput {
  success: boolean;
  timetable?: {
    name: string;
    department: string;
    year: string;
    semester: string;
    qualityScore: number;
    entries: TimetableEntry[];
    validation: ValidationResult;
    stats: {
      totalClasses: number;
      theoryHours: number;
      labHours: number;
      specialHours: number;
    };
  };
  errors?: string[];
  suggestions?: string[];
}
