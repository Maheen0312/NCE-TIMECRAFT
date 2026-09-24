import { TimetableEntry, Subject, ValidationResult, MissingHourDetail, ValidationConflict } from '../types/timetable';
import { PeriodSlot } from './types';
import { NAAN_MUTHALVAN_CONFIG, LAB_AVAILABLE_DAYS } from '@/config/timetableConfig';
import { matchYear } from '@/utils/yearUtils';

export class TimetableValidator {
  static validate(
    entries: TimetableEntry[],
    subjects: Subject[],
    timeSlots: PeriodSlot[],
    options: { reserveWedAfternoon?: boolean; year?: string } = { reserveWedAfternoon: true }
  ): ValidationResult {
    const conflicts: string[] = [];
    const detailedConflicts: ValidationConflict[] = [];
    const staffConflicts: string[] = [];
    const roomConflicts: string[] = [];
    const labConflicts: string[] = [];
    const lockedSessionConflicts: string[] = [];
    const missingHours: MissingHourDetail[] = [];

    // 1. Staff Conflicts (Same staff in multiple classes at same day & slotIndex)
    const staffMap = new Map<string, TimetableEntry[]>();
    for (const entry of entries) {
      if (entry.staffCode && entry.type !== 'BREAK' && entry.type !== 'LUNCH' && entry.type !== 'SPECIAL' && entry.type !== 'LOCKED') {
        const key = `${entry.day}_${entry.slotIndex}_${entry.staffCode}`;
        const existing = staffMap.get(key) || [];
        existing.push(entry);
        staffMap.set(key, existing);
      }
    }

    staffMap.forEach((conflictEntries, key) => {
      if (conflictEntries.length > 1) {
        const [day, slotIdx, staffCode] = key.split('_');
        const periodNum = parseInt(slotIdx, 10) + 1;
        const staffName = conflictEntries[0].staffName || staffCode;
        const desc = `Staff Conflict: ${staffName} (${staffCode}) is assigned to multiple classes on ${day} (Slot ${periodNum}).`;
        staffConflicts.push(desc);
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'STAFF_CONFLICT',
          message: desc,
          day,
          slotIndex: parseInt(slotIdx, 10),
          staffCode,
          canAutoFix: true,
        });
      }
    });

    // 2. Room Conflicts (Same room with multiple classes at same day & slotIndex)
    const roomMap = new Map<string, TimetableEntry[]>();
    for (const entry of entries) {
      if (entry.roomId && entry.type !== 'BREAK' && entry.type !== 'LUNCH' && entry.type !== 'LOCKED') {
        const key = `${entry.day}_${entry.slotIndex}_${entry.roomId}`;
        const existing = roomMap.get(key) || [];
        existing.push(entry);
        roomMap.set(key, existing);
      }
    }

    roomMap.forEach((conflictEntries, key) => {
      if (conflictEntries.length > 1) {
        const [day, slotIdx, roomId] = key.split('_');
        const periodNum = parseInt(slotIdx, 10) + 1;
        const roomNum = conflictEntries[0].roomNumber || roomId;
        const desc = `Room Conflict: Room ${roomNum} is double-booked on ${day} (Slot ${periodNum}).`;
        roomConflicts.push(desc);
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'ROOM_CONFLICT',
          message: desc,
          day,
          slotIndex: parseInt(slotIdx, 10),
          roomNumber: roomNum,
          canAutoFix: true,
        });
      }
    });

    // 3. Break and Lunch violations
    for (const entry of entries) {
      const matchingSlot = timeSlots.find(s => s.day === entry.day && s.slotIndex === entry.slotIndex);
      if (matchingSlot && (matchingSlot.type === 'BREAK' || matchingSlot.type === 'LUNCH')) {
        if (entry.type === 'THEORY' || entry.type === 'LAB') {
          const desc = `Time Violation: Class ${entry.subjectCode || 'Session'} placed during ${matchingSlot.type} on ${entry.day}.`;
          conflicts.push(desc);
          detailedConflicts.push({
            type: 'TIME_CONFLICT',
            message: desc,
            day: entry.day,
            slotIndex: entry.slotIndex,
            subjectCode: entry.subjectCode,
            canAutoFix: true,
          });
        }
      }
    }

    // 4. Wednesday Afternoon Hard Constraint: Naan Muthalvan/Mudhalvan on Wednesday Period 5 (slot 6), Period 6 (slot 7) & Period 7 (slot 8)
    const isWedLocked = options.reserveWedAfternoon !== false;
    const isNaanMuthalvanEntry = (e?: TimetableEntry) => {
      if (!e) return false;
      if (e.type !== 'SPECIAL' && e.type !== 'LOCKED') return false;
      const name = (e.subjectName || '').toLowerCase();
      const code = (e.subjectCode || '').toUpperCase();
      return (
        code === 'NM' ||
        code === 'NM-301' ||
        name.includes('naan') ||
        name.includes('mudhalvan') ||
        name.includes('muthalvan')
      );
    };

    if (isWedLocked) {
      const wednesdayP5 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 6);
      const wednesdayP6 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 7);
      const wednesdayP7 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 8);

      if (!isNaanMuthalvanEntry(wednesdayP5)) {
        const desc = 'Hard Constraint Violation: Wednesday Period 5 must be strictly reserved for "Naan Muthalvan".';
        lockedSessionConflicts.push(desc);
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LOCKED_VIOLATION',
          message: desc,
          day: 'Wednesday',
          slotIndex: 6,
          canAutoFix: false,
        });
      }

      if (!isNaanMuthalvanEntry(wednesdayP6)) {
        const desc = 'Hard Constraint Violation: Wednesday Period 6 must be strictly reserved for "Naan Muthalvan".';
        lockedSessionConflicts.push(desc);
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LOCKED_VIOLATION',
          message: desc,
          day: 'Wednesday',
          slotIndex: 7,
          canAutoFix: false,
        });
      }

      if (!isNaanMuthalvanEntry(wednesdayP7)) {
        const desc = 'Hard Constraint Violation: Wednesday Period 7 must be strictly reserved for "Naan Muthalvan".';
        lockedSessionConflicts.push(desc);
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LOCKED_VIOLATION',
          message: desc,
          day: 'Wednesday',
          slotIndex: 8,
          canAutoFix: false,
        });
      }

      // No theory or lab allowed on Wednesday Afternoon (P5, P6, P7)
      const wednesdayAfternoonClasses = entries.filter(
        e => e.day === 'Wednesday' && (e.slotIndex === 6 || e.slotIndex === 7 || e.slotIndex === 8) && (e.type === 'THEORY' || e.type === 'LAB')
      );
      if (wednesdayAfternoonClasses.length > 0) {
        const desc = 'Hard Constraint Violation: No regular subject or lab classes are permitted on Wednesday afternoon (Period 5, 6 & 7).';
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LOCKED_VIOLATION',
          message: desc,
          day: 'Wednesday',
          canAutoFix: false,
        });
      }
    }

    // 4b. Final Year Specific Hard Constraints:
    // - ONLY 4 allocated subjects.
    // - Those 4 subjects MUST appear ONLY in MORNING periods (not in afternoon).
    // - The ENTIRE AFTERNOON must be locked CAREER GUIDANCE (preserving Wednesday Naan Muthalvan if configured).
    const isFinalYear = (options.year && matchYear(options.year, 'IV')) ||
      subjects.some(s => matchYear(s.year, 'IV')) ||
      entries.some(e => ['GE3791', 'GE3752', 'FD352', 'AI3021', 'CG401'].includes(e.subjectCode || ''));

    if (isFinalYear) {
      const regularEntries = entries.filter(e => e.type === 'THEORY' || e.type === 'LAB');
      const allocatedSubjects = new Set(regularEntries.map(e => e.subjectCode).filter(Boolean));

      // Rule: Final Year has ONLY 4 allocated subjects
      if (allocatedSubjects.size > 4) {
        const desc = `Hard Constraint Violation: Final Year has ONLY 4 allocated subjects. Found ${allocatedSubjects.size} subjects.`;
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LOCKED_VIOLATION',
          message: desc,
          canAutoFix: false,
        });
      }

      // Rule: Those 4 subjects must be scheduled ONLY in MORNING periods (Period 1, 2, 3, 4 -> slots 0, 1, 3, 4)
      for (const entry of regularEntries) {
        if (entry.slotIndex >= 6 || entry.slotIndex === 5) {
          const desc = `Hard Constraint Violation: Final Year allocated subject ${entry.subjectCode || entry.subjectName} must be scheduled ONLY in morning periods. Found on ${entry.day} afternoon (Period ${entry.slotIndex + 1}).`;
          conflicts.push(desc);
          detailedConflicts.push({
            type: 'TIME_CONFLICT',
            message: desc,
            day: entry.day,
            slotIndex: entry.slotIndex,
            subjectCode: entry.subjectCode,
            canAutoFix: false,
          });
        }
      }

      // Rule: The ENTIRE AFTERNOON must be locked CAREER GUIDANCE (Period 5, 6, 7 -> slots 6, 7, 8)
      // Preserve existing Wednesday afternoon Naan Muthalvan if configured
      const isCareerGuidanceEntry = (e?: TimetableEntry) => {
        if (!e) return false;
        if (e.type !== 'SPECIAL' && e.type !== 'LOCKED') return false;
        const name = (e.subjectName || '').toLowerCase();
        const code = (e.subjectCode || '').toUpperCase();
        return code === 'CG401' || name.includes('career') || name.includes('guidance');
      };

      const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (const day of workingDays) {
        for (const slotIdx of [6, 7, 8]) {
          const periodNum = slotIdx === 6 ? 5 : slotIdx === 7 ? 6 : 7;
          const entry = entries.find(e => e.day === day && e.slotIndex === slotIdx);

          if (day === 'Wednesday' && isWedLocked) {
            if (!isNaanMuthalvanEntry(entry) && !isCareerGuidanceEntry(entry)) {
              const desc = `Hard Constraint Violation: Final Year Wednesday Period ${periodNum} must be strictly reserved for "Naan Muthalvan" or "Career Guidance".`;
              lockedSessionConflicts.push(desc);
              conflicts.push(desc);
              detailedConflicts.push({
                type: 'LOCKED_VIOLATION',
                message: desc,
                day,
                slotIndex: slotIdx,
                canAutoFix: false,
              });
            }
          } else {
            if (!isCareerGuidanceEntry(entry) || !entry?.locked) {
              const desc = `Hard Constraint Violation: Final Year ${day} Period ${periodNum} must be strictly reserved for locked "Career Guidance".`;
              lockedSessionConflicts.push(desc);
              conflicts.push(desc);
              detailedConflicts.push({
                type: 'LOCKED_VIOLATION',
                message: desc,
                day,
                slotIndex: slotIdx,
                canAutoFix: false,
              });
            }
          }
        }
      }
    }

    // 5. Lab Constraints:
    // - Labs can only be on Monday, Tuesday, Thursday, Friday (NEVER Wednesday)
    // - Each lab must be in Period 6 (slot 7) and Period 7 (slot 8)
    // - Max 1 lab session per day (max 4 distinct lab days in the week)
    const labEntries = entries.filter(e => e.type === 'LAB');
    const labDaysUsed = new Set<string>();

    const labGroups = new Map<string, TimetableEntry[]>();
    for (const lab of labEntries) {
      labDaysUsed.add(lab.day);
      const key = `${lab.day}_${lab.subjectCode || lab.staffCode}`;
      const group = labGroups.get(key) || [];
      group.push(lab);
      labGroups.set(key, group);

      if (lab.day === 'Wednesday') {
        const desc = 'Lab Rule Violation: Laboratory session scheduled on Wednesday. Labs are strictly forbidden on Wednesday afternoon.';
        labConflicts.push(desc);
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LAB_CONFLICT',
          message: desc,
          day: 'Wednesday',
          slotIndex: lab.slotIndex,
          subjectCode: lab.subjectCode,
          canAutoFix: true,
        });
      }

      if (lab.slotIndex !== 7 && lab.slotIndex !== 8) {
        const desc = `Lab Timing Violation: Lab ${lab.subjectCode} on ${lab.day} is in slot ${lab.slotIndex + 1}. Labs must strictly occupy Period 6 and Period 7.`;
        labConflicts.push(desc);
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LAB_CONFLICT',
          message: desc,
          day: lab.day,
          slotIndex: lab.slotIndex,
          subjectCode: lab.subjectCode,
          canAutoFix: true,
        });
      }
    }

    // Verify at most 4 lab sessions (one per available afternoon)
    if (labGroups.size > 4) {
      const desc = `Lab Rule Violation: Maximum 4 lab sessions allowed per week, found ${labGroups.size}.`;
      labConflicts.push(desc);
      conflicts.push(desc);
      detailedConflicts.push({
        type: 'LAB_CONFLICT',
        message: desc,
        canAutoFix: true,
      });
    }

    // 6. Anti-Repetition Checks:
    // - No subject twice in 1 day
    const daySubjectMap = new Map<string, TimetableEntry[]>();
    for (const entry of entries) {
      if (entry.type === 'THEORY' && entry.subjectCode) {
        const key = `${entry.day}_${entry.subjectCode}`;
        const group = daySubjectMap.get(key) || [];
        group.push(entry);
        daySubjectMap.set(key, group);
      }
    }

    daySubjectMap.forEach((group, key) => {
      if (group.length > 1) {
        const [day, subjectCode] = key.split('_');
        const desc = `Distribution Violation: Subject ${subjectCode} is scheduled ${group.length} times on ${day}. Max 1 period per day allowed.`;
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'CONSECUTIVE_LIMIT',
          message: desc,
          day,
          subjectCode,
          canAutoFix: true,
        });
      }
    });

    const valid = conflicts.length === 0;

    return {
      valid,
      conflicts,
      detailedConflicts,
      missingHours,
      staffConflicts,
      roomConflicts,
      labConflicts,
      lockedSessionConflicts,
      qualityScore: valid ? 95 : 0,
    };
  }
}
