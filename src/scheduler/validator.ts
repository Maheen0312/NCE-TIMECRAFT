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

    // 4. Year-Specific Rules & Special Sessions Validation
    const targetYear = options.year || (subjects.find(s => s.year)?.year) || 'III';
    const isFinalYear = matchYear(targetYear, 'IV');
    const isThirdYear = matchYear(targetYear, 'III');
    const isSecondYear = matchYear(targetYear, 'II');

    const isNaanMuthalvanEntry = (e?: TimetableEntry) => {
      if (!e) return false;
      const name = (e.subjectName || '').toLowerCase();
      const code = (e.subjectCode || '').toUpperCase();
      return (
        code === 'NM' ||
        code === 'NM-301' ||
        code === 'NM-201' ||
        name.includes('naan') ||
        name.includes('mudhalvan') ||
        name.includes('muthalvan')
      );
    };

    const isCareerGuidanceEntry = (e?: TimetableEntry) => {
      if (!e) return false;
      const name = (e.subjectName || '').toLowerCase();
      const code = (e.subjectCode || '').toUpperCase();
      return (
        code === 'CG401' ||
        name.includes('career') ||
        name.includes('guidance') ||
        name.includes('placement') ||
        name.includes('project')
      );
    };

    // FINAL YEAR (IV) RULES:
    if (isFinalYear) {
      // Rule A: Final Year must NEVER have Naan Muthalvan
      const nmEntriesInFinalYear = entries.filter(e => isNaanMuthalvanEntry(e));
      if (nmEntriesInFinalYear.length > 0) {
        const desc = 'Hard Constraint Violation: Final Year must NEVER schedule Naan Muthalvan. Naan Muthalvan is reserved for lower years.';
        conflicts.push(desc);
        lockedSessionConflicts.push(desc);
        detailedConflicts.push({
          type: 'LOCKED_VIOLATION',
          message: desc,
          canAutoFix: false,
        });
      }

      // Rule B: Final Year Wednesday afternoon (Periods 5, 6, 7 -> slots 6, 7, 8) is strictly Career Guidance / Placement Training / Project Work
      for (const slotIdx of [6, 7, 8]) {
        const periodNum = slotIdx === 6 ? 5 : slotIdx === 7 ? 6 : 7;
        const wedEntry = entries.find(e => e.day === 'Wednesday' && e.slotIndex === slotIdx);
        if (!isCareerGuidanceEntry(wedEntry)) {
          const desc = `Hard Constraint Violation: Final Year Wednesday Period ${periodNum} must be strictly reserved for "Career Guidance / Placement Training / Project Work".`;
          lockedSessionConflicts.push(desc);
          conflicts.push(desc);
          detailedConflicts.push({
            type: 'LOCKED_VIOLATION',
            message: desc,
            day: 'Wednesday',
            slotIndex: slotIdx,
            canAutoFix: false,
          });
        }
      }

      // Rule C: Final Year has 4 subjects
      const regularFinalEntries = entries.filter(e => e.type === 'THEORY' || e.type === 'LAB');
      const allocatedSubjects = new Set(regularFinalEntries.map(e => e.subjectCode).filter(Boolean));
      if (allocatedSubjects.size > 4) {
        const desc = `Hard Constraint Violation: Final Year has ONLY 4 allocated subjects. Found ${allocatedSubjects.size} subjects.`;
        conflicts.push(desc);
        detailedConflicts.push({
          type: 'LOCKED_VIOLATION',
          message: desc,
          canAutoFix: false,
        });
      }

      // Rule D: Final Year must NOT have blank teaching periods during normal teaching hours
      // Teaching periods: Mon (7), Tue (7), Wed morning (4), Thu (7), Fri (7) = 32 teaching periods total
      const teachingSlotMatrix: { day: string; slotIndex: number; periodNumber: number }[] = [
        ...['Monday', 'Tuesday', 'Thursday', 'Friday'].flatMap(day => [
          { day, slotIndex: 0, periodNumber: 1 },
          { day, slotIndex: 1, periodNumber: 2 },
          { day, slotIndex: 3, periodNumber: 3 },
          { day, slotIndex: 4, periodNumber: 4 },
          { day, slotIndex: 6, periodNumber: 5 },
          { day, slotIndex: 7, periodNumber: 6 },
          { day, slotIndex: 8, periodNumber: 7 },
        ]),
        { day: 'Wednesday', slotIndex: 0, periodNumber: 1 },
        { day: 'Wednesday', slotIndex: 1, periodNumber: 2 },
        { day: 'Wednesday', slotIndex: 3, periodNumber: 3 },
        { day: 'Wednesday', slotIndex: 4, periodNumber: 4 },
      ];

      for (const reqSlot of teachingSlotMatrix) {
        const entry = entries.find(e => e.day === reqSlot.day && e.slotIndex === reqSlot.slotIndex);
        if (!entry || (entry.type !== 'THEORY' && entry.type !== 'LAB' && entry.type !== 'SPECIAL')) {
          const desc = `Hard Constraint Violation: Final Year must not have blank teaching periods during normal teaching hours. Missing class on ${reqSlot.day} Period ${reqSlot.periodNumber}.`;
          conflicts.push(desc);
          detailedConflicts.push({
            type: 'TIME_CONFLICT',
            message: desc,
            day: reqSlot.day,
            slotIndex: reqSlot.slotIndex,
            canAutoFix: false,
          });
        }
      }
    } else if (isThirdYear) {
      // 3RD YEAR (III) RULES:
      // Wednesday Afternoon Hard Constraint: Naan Muthalvan on Wednesday Periods 5, 6, 7 (slots 6, 7, 8)
      const isWedLocked = options.reserveWedAfternoon !== false;
      if (isWedLocked) {
        for (const slotIdx of [6, 7, 8]) {
          const periodNum = slotIdx === 6 ? 5 : slotIdx === 7 ? 6 : 7;
          const wedEntry = entries.find(e => e.day === 'Wednesday' && e.slotIndex === slotIdx);
          if (!isNaanMuthalvanEntry(wedEntry)) {
            const desc = `Hard Constraint Violation: 3rd Year Wednesday Period ${periodNum} must be strictly reserved for "Naan Muthalvan".`;
            lockedSessionConflicts.push(desc);
            conflicts.push(desc);
            detailedConflicts.push({
              type: 'LOCKED_VIOLATION',
              message: desc,
              day: 'Wednesday',
              slotIndex: slotIdx,
              canAutoFix: false,
            });
          }
        }

        // No regular subject or lab classes allowed on Wednesday Afternoon
        const wednesdayAfternoonClasses = entries.filter(
          e => e.day === 'Wednesday' && (e.slotIndex === 6 || e.slotIndex === 7 || e.slotIndex === 8) && (e.type === 'THEORY' || e.type === 'LAB')
        );
        if (wednesdayAfternoonClasses.length > 0) {
          const desc = 'Hard Constraint Violation: No regular subject or lab classes are permitted on Wednesday afternoon for 3rd Year.';
          conflicts.push(desc);
          detailedConflicts.push({
            type: 'LOCKED_VIOLATION',
            message: desc,
            day: 'Wednesday',
            canAutoFix: false,
          });
        }
      }
    } else if (isSecondYear) {
      // 2ND YEAR (II) RULES:
      // Naan Muthalvan occurs on configured day (e.g. Thursday PM) - verify it is present if configured
      const nmEntriesIn2ndYear = entries.filter(e => isNaanMuthalvanEntry(e));
      if (nmEntriesIn2ndYear.length > 0) {
        const nmDay = nmEntriesIn2ndYear[0].day;
        // Verify no regular classes overlap with 2nd Year Naan Muthalvan
        const overlaps = entries.filter(
          e => e.day === nmDay && [6, 7, 8].includes(e.slotIndex) && (e.type === 'THEORY' || e.type === 'LAB')
        );
        if (overlaps.length > 0) {
          const desc = `Hard Constraint Violation: No regular classes allowed during 2nd Year Naan Muthalvan on ${nmDay} afternoon.`;
          conflicts.push(desc);
          detailedConflicts.push({
            type: 'LOCKED_VIOLATION',
            message: desc,
            day: nmDay,
            canAutoFix: false,
          });
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
      const [day, subjectCode] = key.split('_');
      if (isFinalYear) {
        if (group.length > 2) {
          const desc = `Distribution Violation: Final Year subject ${subjectCode} is scheduled ${group.length} times on ${day}. Max 2 periods per day allowed.`;
          conflicts.push(desc);
          detailedConflicts.push({
            type: 'CONSECUTIVE_LIMIT',
            message: desc,
            day,
            subjectCode,
            canAutoFix: true,
          });
        } else if (group.length === 2) {
          const sortedSlots = group.map(g => g.slotIndex).sort((a, b) => a - b);
          if (sortedSlots[1] - sortedSlots[0] === 1) {
            const desc = `Consecutive Violation: Final Year subject ${subjectCode} has 2 consecutive periods on ${day} (slots ${sortedSlots[0]} and ${sortedSlots[1]}).`;
            conflicts.push(desc);
            detailedConflicts.push({
              type: 'CONSECUTIVE_LIMIT',
              message: desc,
              day,
              subjectCode,
              canAutoFix: true,
            });
          }
        }
      } else {
        if (group.length > 1) {
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
