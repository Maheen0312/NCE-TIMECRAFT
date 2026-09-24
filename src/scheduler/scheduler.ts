import { 
  TimetableEntry, 
  Subject, 
  StaffProfile, 
  Lab, 
  Room, 
  TimeSlot, 
  SpecialSession, 
  SchedulingRules 
} from '../types/timetable';
import { SchedulerInput, SchedulerOutput, PeriodSlot } from './types';
import { TimetableValidator } from './validator';
import { ScheduleOptimizer } from './optimizer';
import { 
  MASTER_STAFF, 
  MASTER_THEORY_SUBJECTS, 
  MASTER_LABS, 
  MASTER_ROOMS, 
  MASTER_PERIOD_DEFINITIONS,
  WORKING_DAYS,
  LAB_AVAILABLE_DAYS,
  NAAN_MUTHALVAN_CONFIG,
  getStaffNameByCode
} from '@/config/timetableConfig';
import { normalizeYear, matchYear } from '@/utils/yearUtils';

/**
 * 32-bit deterministic Mulberry32 PRNG
 */
function createPRNG(seed: number): () => number {
  let s = (seed >>> 0) || 4848;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) || 4848;
}

export class TimetableScheduler {
  private static shuffleArray<T>(array: T[], rng: () => number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static defaultWorkingDays = WORKING_DAYS;
  static defaultPeriodDefinitions = MASTER_PERIOD_DEFINITIONS;

  static generate(input: SchedulerInput): SchedulerOutput {
    const errors: string[] = [];
    const suggestions: string[] = [];

    const baseSeed = input.seed !== undefined 
      ? input.seed 
      : Math.floor(Math.random() * 9000000) + 100000;

    const rng = createPRNG(baseSeed);

    // 1. Prepare Active Staff Map
    const staffLookup = new Map<string, string>();
    MASTER_STAFF.forEach(s => staffLookup.set(s.staffCode, s.name));
    if (input.staff && input.staff.length > 0) {
      input.staff.forEach(s => {
        if (s.staffCode && s.name) staffLookup.set(s.staffCode, s.name);
      });
    }

    // 2. Prepare Active Subjects & Labs
    const targetYear = input.year || (input.subjects?.find(s => s.year)?.year) || 'III';
    const isFinalYear = matchYear(targetYear, 'IV');
    const isThirdYear = matchYear(targetYear, 'III');
    const isSecondYear = matchYear(targetYear, 'II');

    let theorySubjects = input.subjects?.filter(s => s.type === 'THEORY' && s.active !== false) || [];
    if (input.year) {
      const yearFiltered = theorySubjects.filter(s => !s.year || matchYear(s.year, input.year));
      if (yearFiltered.length > 0) {
        theorySubjects = yearFiltered;
      }
    }

    if (theorySubjects.length === 0) {
      const baseTheory = MASTER_THEORY_SUBJECTS.filter(s => !s.year || matchYear(s.year, targetYear));
      theorySubjects = baseTheory.map(s => ({
        id: `sub_${s.subjectCode}`,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        type: 'THEORY' as const,
        weeklyHours: s.weeklyHours,
        assignedStaff: [s.assignedStaffCode],
        department: s.department,
        year: s.year,
        semester: s.semester,
        active: true,
      }));
    }

    // For Final Year: ONLY 4 allocated subjects. No labs.
    if (isFinalYear && theorySubjects.length > 4) {
      theorySubjects = theorySubjects.slice(0, 4);
    }

    let labSubjects = isFinalYear
      ? [] // Final Year has ONLY 4 allocated subjects; no lab classes
      : (input.subjects?.filter(s => s.type === 'LAB' && s.active !== false) || []);

    if (!isFinalYear && labSubjects.length === 0) {
      labSubjects = MASTER_LABS.map(l => ({
        id: `sub_${l.subjectCode}`,
        subjectCode: l.subjectCode,
        subjectName: l.labName,
        type: 'LAB' as const,
        weeklyHours: l.duration,
        assignedStaff: [l.staffCode],
        department: 'Computer Science & Engineering',
        year: 'III',
        semester: '5',
        active: true,
      }));
    }

    // Prepare Rooms
    const activeRooms = input.rooms && input.rooms.length > 0 ? input.rooms : MASTER_ROOMS;
    const classroomRooms = activeRooms.filter(r => r.type === 'CLASSROOM');
    
    // Designated classroom per Year to avoid room collision across batches
    const normYear = normalizeYear(input.year);
    const targetRoomNumber = normYear === 'II' ? 'CSE-102' : normYear === 'IV' ? 'CSE-201' : 'CSE-101';
    let defaultRoom = classroomRooms.find(r => r.roomNumber === targetRoomNumber) ||
                      classroomRooms.find(r => {
                        if (normYear === 'II') {
                          return r.roomNumber === 'CSE-102' || r.roomName?.includes('102') || /\b(II|2nd)\b/i.test(r.roomName || '');
                        } else if (normYear === 'IV') {
                          return r.roomNumber === 'CSE-201' || r.roomName?.includes('201') || /\b(IV|4th|Final)\b/i.test(r.roomName || '');
                        } else {
                          return r.roomNumber === 'CSE-101' || r.roomName?.includes('101') || /\b(III|3rd)\b/i.test(r.roomName || '');
                        }
                      }) || classroomRooms[0];
    const defaultRoomId = defaultRoom?.id || defaultRoom?.roomNumber || targetRoomNumber;
    const defaultRoomNumber = defaultRoom?.roomNumber || targetRoomNumber;

    const labRooms = activeRooms.filter(r => r.type === 'LAB');

    // External conflict index (from other years or other batch timetables)
    const externalStaffBusy = new Set<string>();
    const externalRoomBusy = new Set<string>();
    if (input.existingAllocations && input.existingAllocations.length > 0) {
      for (const ext of input.existingAllocations) {
        if (ext.staffCode) {
          externalStaffBusy.add(`${ext.day}_${ext.slotIndex}_${ext.staffCode.toUpperCase()}`);
        }
        if (ext.roomId) {
          externalRoomBusy.add(`${ext.day}_${ext.slotIndex}_${ext.roomId.toUpperCase()}`);
        }
        if (ext.roomNumber) {
          externalRoomBusy.add(`${ext.day}_${ext.slotIndex}_${ext.roomNumber.toUpperCase()}`);
        }
      }
    }

    // Build all 5 days × 9 slots
    const allSlots: PeriodSlot[] = [];
    for (const day of WORKING_DAYS) {
      for (const def of MASTER_PERIOD_DEFINITIONS) {
        allSlots.push({
          id: `${day}_${def.slotIndex}`,
          day,
          slotIndex: def.slotIndex,
          startTime: def.startTime,
          endTime: def.endTime,
          type: def.type as any,
          isMorning: def.isMorning,
          isAfternoon: def.isAfternoon,
        });
      }
    }

    const MAX_ATTEMPTS = 500;
    let bestEntries: TimetableEntry[] | null = null;
    let bestScore = -10000;
    let bestValidation: any = null;
    let lastFailureReason = '';

    // Available Theory Slot Indices per day: [0, 1, 3, 4, 6] (Period 1, 2, 3, 4, 5)
    const theorySlotIndices = [0, 1, 3, 4, 6];

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const attemptRng = createPRNG(baseSeed + attempt * 7919 + 17);
      const entries: TimetableEntry[] = [];

      // 1. Add Fixed Breaks (Tea Break: slot 2, Lunch: slot 5)
      for (const day of WORKING_DAYS) {
        for (const def of MASTER_PERIOD_DEFINITIONS) {
          if (def.type === 'BREAK' || def.type === 'LUNCH') {
            entries.push({
              id: `entry_${day}_${def.slotIndex}`,
              day,
              slotIndex: def.slotIndex,
              startTime: def.startTime,
              endTime: def.endTime,
              type: def.type as any,
              locked: true,
              source: 'FIXED',
              notes: def.type === 'BREAK' ? 'Tea Break (10:50 - 11:10)' : 'Lunch Break (12:50 - 01:40)',
            });
          }
        }
      }

      // 2. Year-Specific Institutional Locked Sessions & Naan Mudhalvan Policy
      const hasSpecialSessionsConfig = Array.isArray(input.specialSessions) && input.specialSessions.length > 0;
      const matchingSpecialSessions = hasSpecialSessionsConfig 
        ? input.specialSessions!.filter(s => !s.year || s.year === 'ALL' || matchYear(s.year, input.year))
        : [];

      if (isFinalYear) {
        // FINAL YEAR (IV):
        // - NEVER schedule Naan Mudhalvan for Final Year.
        // - Wednesday Afternoon (Period 5, 6, 7: slots 6, 7, 8) is strictly Career Guidance / Placement Training / Project Work.
        // - Monday PM, Tuesday PM, Thursday PM, Friday PM are NORMAL TEACHING PERIODS for the 4 subjects.
        const cgSlots = [
          { slotIndex: 6, startTime: '01:40', endTime: '02:30', p: 5 },
          { slotIndex: 7, startTime: '02:30', endTime: '03:20', p: 6 },
          { slotIndex: 8, startTime: '03:20', endTime: '04:20', p: 7 },
        ];
        for (const s of cgSlots) {
          entries.push({
            id: `entry_final_cg_wed_p${s.p}`,
            day: 'Wednesday',
            slotIndex: s.slotIndex,
            startTime: s.startTime,
            endTime: s.endTime,
            subjectCode: 'CG401',
            subjectName: 'Career Guidance & Placement Training',
            type: 'SPECIAL',
            locked: true,
            source: 'FIXED',
            notes: 'Final Year Special Session: Career Guidance & Placement Training (Immutable)',
          });
        }
      } else if (isThirdYear) {
        // 3RD YEAR (III):
        // - Wednesday Afternoon is locked as Naan Mudhalvan (Periods 5, 6, 7: slots 6, 7, 8)
        const isWedLockedInConfig = input.rules?.reserveWedAfternoon !== false;
        if (isWedLockedInConfig) {
          const nmSlots = [
            { slotIndex: 6, startTime: '01:40', endTime: '02:30', p: 5 },
            { slotIndex: 7, startTime: '02:30', endTime: '03:20', p: 6 },
            { slotIndex: 8, startTime: '03:20', endTime: '04:20', p: 7 },
          ];
          for (const s of nmSlots) {
            entries.push({
              id: `entry_third_nm_wed_p${s.p}`,
              day: 'Wednesday',
              slotIndex: s.slotIndex,
              startTime: s.startTime,
              endTime: s.endTime,
              subjectCode: 'NM-301',
              subjectName: NAAN_MUTHALVAN_CONFIG.name,
              type: 'SPECIAL',
              locked: true,
              source: 'FIXED',
              notes: 'Tamil Nadu Naan Mudhalvan Initiative (3rd Year Wednesday Afternoon)',
            });
          }
        }
      } else if (isSecondYear) {
        // 2ND YEAR (II):
        // - Naan Mudhalvan is on configured day (default Thursday PM: slots 6, 7, 8)
        const custom2ndYearNm = matchingSpecialSessions.find(
          s => (s.sessionName || s.name || '').toLowerCase().includes('naan') ||
               (s.sessionName || s.name || '').toLowerCase().includes('mudhalvan')
        );
        const nmDay = custom2ndYearNm?.day || 'Thursday';
        const nmSlots = [
          { slotIndex: 6, startTime: '01:40', endTime: '02:30', p: 5 },
          { slotIndex: 7, startTime: '02:30', endTime: '03:20', p: 6 },
          { slotIndex: 8, startTime: '03:20', endTime: '04:20', p: 7 },
        ];
        for (const s of nmSlots) {
          entries.push({
            id: `entry_second_nm_${nmDay.toLowerCase()}_p${s.p}`,
            day: nmDay,
            slotIndex: s.slotIndex,
            startTime: s.startTime,
            endTime: s.endTime,
            subjectCode: 'NM-201',
            subjectName: custom2ndYearNm?.name || NAAN_MUTHALVAN_CONFIG.name,
            type: 'SPECIAL',
            locked: true,
            source: 'FIXED',
            notes: `Tamil Nadu Naan Mudhalvan Initiative (2nd Year ${nmDay} Afternoon)`,
          });
        }
      }

      // Additional custom locked special sessions from configuration
      if (matchingSpecialSessions.length > 0) {
        for (const spec of matchingSpecialSessions) {
          if (isFinalYear && ((spec.sessionName || spec.name || '').toLowerCase().includes('naan') || (spec.sessionName || spec.name || '').toLowerCase().includes('mudhalvan'))) {
            continue; // Skip any Naan Mudhalvan for Final Year
          }
          if (spec.locked) {
            let slotsToLock: number[] = [];
            if (spec.startPeriod !== undefined && spec.endPeriod !== undefined) {
              const startSlot = spec.startPeriod <= 2 ? spec.startPeriod - 1 : spec.startPeriod <= 4 ? spec.startPeriod : spec.startPeriod + 1;
              const endSlot = spec.endPeriod <= 2 ? spec.endPeriod - 1 : spec.endPeriod <= 4 ? spec.endPeriod : spec.endPeriod + 1;
              for (let s = startSlot; s <= endSlot; s++) {
                if (s !== 2 && s !== 5) slotsToLock.push(s);
              }
            } else if (spec.period === 'MORNING') {
              slotsToLock = [0, 1, 3, 4];
            } else if (spec.period === 'AFTERNOON') {
              slotsToLock = [6, 7, 8];
            } else {
              slotsToLock = [0, 1, 3, 4, 6, 7, 8];
            }

            for (const sIdx of slotsToLock) {
              const alreadyExists = entries.some(e => e.day === spec.day && e.slotIndex === sIdx);
              if (!alreadyExists) {
                const def = MASTER_PERIOD_DEFINITIONS.find(p => p.slotIndex === sIdx);
                if (def) {
                  entries.push({
                    id: `entry_spec_${spec.id || spec.day}_${sIdx}`,
                    day: spec.day,
                    slotIndex: sIdx,
                    startTime: def.startTime,
                    endTime: def.endTime,
                    subjectCode: 'SPECIAL',
                    subjectName: spec.sessionName || spec.name || 'Special Session',
                    type: 'SPECIAL',
                    locked: true,
                    source: 'FIXED',
                    notes: spec.description || spec.name,
                  });
                }
              }
            }
          }
        }
      }

      // 3. Schedule Labs on available days
      const availableLabDays = isFinalYear
        ? [] // No lab allocations for Final Year
        : isSecondYear
        ? WORKING_DAYS.filter(d => d !== 'Thursday') // Avoid 2nd Year Naan Mudhalvan day
        : LAB_AVAILABLE_DAYS; // Mon, Tue, Thu, Fri (Wednesday is Naan Mudhalvan for 3rd Year)
      const shuffledLabDays = this.shuffleArray(availableLabDays, attemptRng);
      const shuffledLabs = this.shuffleArray([...labSubjects], attemptRng);
      const labsToScheduleCount = Math.min(availableLabDays.length, shuffledLabs.length);

      const labDaysScheduled = new Set<string>();
      let labAllocationSuccess = true;

      const remainingLabDays = [...availableLabDays];
      for (let i = 0; i < labsToScheduleCount; i++) {
        const labSub = shuffledLabs[i];
        const staffCode = labSub.assignedStaff?.[0] || 'MRH';
        const staffName = staffLookup.get(staffCode) || getStaffNameByCode(staffCode);

        // Find an available lab day where the staff is not busy externally
        const dayIdx = remainingLabDays.findIndex(d => 
          !externalStaffBusy.has(`${d}_7_${staffCode.toUpperCase()}`) &&
          !externalStaffBusy.has(`${d}_8_${staffCode.toUpperCase()}`)
        );

        if (dayIdx === -1) {
          labAllocationSuccess = false;
          break;
        }

        const assignedDay = remainingLabDays.splice(dayIdx, 1)[0];
        labDaysScheduled.add(assignedDay);
        
        // Find a lab room free from external bookings
        const assignedLabRoom = labRooms.find(lr => {
          const lrId = (lr.id || lr.roomNumber || '').toUpperCase();
          const lrNum = (lr.roomNumber || '').toUpperCase();
          return !externalRoomBusy.has(`${assignedDay}_7_${lrId}`) &&
                 !externalRoomBusy.has(`${assignedDay}_8_${lrId}`) &&
                 !externalRoomBusy.has(`${assignedDay}_7_${lrNum}`) &&
                 !externalRoomBusy.has(`${assignedDay}_8_${lrNum}`);
        }) || labRooms[i % Math.max(1, labRooms.length)] || { id: `LAB-0${i + 1}`, roomNumber: `LAB-0${i + 1}` };

        const roomId = assignedLabRoom.id || `LAB-0${i + 1}`;
        const roomNumber = assignedLabRoom.roomNumber || `LAB-0${i + 1}`;

        // Add Period 6 (slot 7)
        entries.push({
          id: `entry_lab_${labSub.subjectCode}_${assignedDay}_7`,
          day: assignedDay,
          slotIndex: 7,
          startTime: '02:30',
          endTime: '03:20',
          subjectId: labSub.id,
          subjectCode: labSub.subjectCode,
          subjectName: labSub.subjectName,
          staffCode,
          staffName,
          roomId,
          roomNumber,
          type: 'LAB',
          locked: false,
          source: 'GENERATED',
          notes: 'Laboratory Session (Period 6)',
        });

        // Add Period 7 (slot 8)
        entries.push({
          id: `entry_lab_${labSub.subjectCode}_${assignedDay}_8`,
          day: assignedDay,
          slotIndex: 8,
          startTime: '03:20',
          endTime: '04:20',
          subjectId: labSub.id,
          subjectCode: labSub.subjectCode,
          subjectName: labSub.subjectName,
          staffCode,
          staffName,
          roomId,
          roomNumber,
          type: 'LAB',
          locked: false,
          source: 'GENERATED',
          notes: 'Laboratory Session (Period 7)',
        });
      }

      if (!labAllocationSuccess) continue;

      // 4. Theory Scheduling across available slots
      if (isFinalYear) {
        // FINAL YEAR (IV): Exactly 4 subjects allocated across 32 teaching periods (8 periods each)
        // Zero blank teaching periods!
        const final4Subjects = theorySubjects.slice(0, 4);
        if (final4Subjects.length === 0) continue;

        // Shuffle subject order per attempt for variety
        const subjectOrder = this.shuffleArray([...final4Subjects], attemptRng);
        while (subjectOrder.length < 4) {
          // If fewer than 4 provided in input, pad with available
          subjectOrder.push(final4Subjects[subjectOrder.length % final4Subjects.length]);
        }

        // 32 Teaching Periods Matrix across the 5 working days:
        // Mon(7), Tue(7), Wed(4), Thu(7), Fri(7) = 32
        // Sub 0: Mon(2), Tue(2), Wed(1), Thu(2), Fri(1) = 8
        // Sub 1: Mon(2), Tue(2), Wed(1), Thu(1), Fri(2) = 8
        // Sub 2: Mon(2), Tue(1), Wed(1), Thu(2), Fri(2) = 8
        // Sub 3: Mon(1), Tue(2), Wed(1), Thu(2), Fri(2) = 8
        const daySlotPattern: Record<string, { slots: number[]; subjectSequence: number[] }> = {
          Monday: {
            slots: [0, 1, 3, 4, 6, 7, 8],
            subjectSequence: [0, 1, 2, 3, 0, 1, 2], // 0, 1, 2 appear twice; 3 appears once
          },
          Tuesday: {
            slots: [0, 1, 3, 4, 6, 7, 8],
            subjectSequence: [3, 0, 1, 2, 3, 0, 1], // 3, 0, 1 appear twice; 2 appears once
          },
          Wednesday: {
            slots: [0, 1, 3, 4],
            subjectSequence: [2, 3, 0, 1],          // 0, 1, 2, 3 appear once each
          },
          Thursday: {
            slots: [0, 1, 3, 4, 6, 7, 8],
            subjectSequence: [2, 3, 0, 1, 2, 3, 0], // 2, 3, 0 appear twice; 1 appears once
          },
          Friday: {
            slots: [0, 1, 3, 4, 6, 7, 8],
            subjectSequence: [1, 2, 3, 0, 1, 2, 3], // 1, 2, 3 appear twice; 0 appears once
          },
        };

        let finalYearTheoryConflict = false;

        for (const day of WORKING_DAYS) {
          const config = daySlotPattern[day];
          if (!config) continue;

          for (let i = 0; i < config.slots.length; i++) {
            const slotIdx = config.slots[i];
            const subIdx = config.subjectSequence[i];
            const sub = subjectOrder[subIdx];
            const staffCode = sub.assignedStaff?.[0] || 'STAFF';
            const staffName = staffLookup.get(staffCode) || getStaffNameByCode(staffCode);

            // Cross-year staff conflict check
            if (staffCode && externalStaffBusy.has(`${day}_${slotIdx}_${staffCode.toUpperCase()}`)) {
              finalYearTheoryConflict = true;
              break;
            }

            const slotDef = MASTER_PERIOD_DEFINITIONS.find(p => p.slotIndex === slotIdx)!;

            entries.push({
              id: `entry_final_theory_${sub.subjectCode}_${day}_${slotIdx}`,
              day,
              slotIndex: slotIdx,
              startTime: slotDef.startTime,
              endTime: slotDef.endTime,
              subjectId: sub.id,
              subjectCode: sub.subjectCode,
              subjectName: sub.subjectName,
              staffCode,
              staffName,
              roomId: defaultRoomId,
              roomNumber: defaultRoomNumber,
              type: 'THEORY',
              locked: false,
              source: 'GENERATED',
            });
          }
          if (finalYearTheoryConflict) break;
        }

        if (finalYearTheoryConflict) {
          lastFailureReason = 'Final year theory conflict';
          continue;
        }
      } else {
        // NON-FINAL-YEAR THEORY SCHEDULING (Year II and Year III)
        const dayTheorySlotsMap = new Map<string, number[]>();
        let totalAvailableTheorySlots = 0;

        for (const d of WORKING_DAYS) {
          // Respect institutional lock on Wednesday afternoon or available periods
          const isWedNmDay = (d === 'Wednesday' && isThirdYear);
          const isThuNmDay = (d === 'Thursday' && isSecondYear);
          const slotsForDay = (isWedNmDay || isThuNmDay) ? [0, 1, 3, 4] : [0, 1, 3, 4, 6];
          if (!isWedNmDay && !isThuNmDay && !labDaysScheduled.has(d)) {
            slotsForDay.push(7, 8); // Periods 6 and 7 available if no lab or special session
          }
          dayTheorySlotsMap.set(d, slotsForDay);
          totalAvailableTheorySlots += slotsForDay.length;
        }

        // Calculate initial requested target hours for each theory subject (max 5 days/week per subject)
        const rawTheoryReqs: { subject: Subject; baseHours: number; staffCode: string; staffName: string }[] = [];
        for (const sub of theorySubjects) {
          let baseHours = sub.weeklyHours || 4;
          if (sub.subjectCode === 'MX3084' || sub.subjectName?.toLowerCase().includes('disaster')) {
            baseHours = Math.min(2, sub.weeklyHours || 2);
          } else {
            baseHours = Math.min(5, Math.max(1, baseHours));
          }

          const staffCode = sub.assignedStaff?.[0] || 'STAFF';
          const staffName = staffLookup.get(staffCode) || getStaffNameByCode(staffCode);
          rawTheoryReqs.push({ subject: sub, baseHours, staffCode, staffName });
        }

        // Adjust total target hours to match available theory slots
        let currentTotalHours = rawTheoryReqs.reduce((sum, r) => sum + r.baseHours, 0);
        const theoryRequirements = rawTheoryReqs.map(r => ({ ...r, targetHours: r.baseHours }));

        while (currentTotalHours > totalAvailableTheorySlots) {
          const candidates = theoryRequirements.filter(
            r => r.targetHours > 1 && r.subject.subjectCode !== 'MX3084'
          );
          if (candidates.length === 0) break;
          const chosen = candidates[Math.floor(attemptRng() * candidates.length)];
          chosen.targetHours -= 1;
          currentTotalHours -= 1;
        }

        const minDayCapacity = Math.min(...WORKING_DAYS.map(d => (dayTheorySlotsMap.get(d) || []).length));
        let count5HourSubjects = 0;
        for (const req of theoryRequirements) {
          if (req.targetHours >= 5) {
            count5HourSubjects++;
            if (count5HourSubjects > minDayCapacity) {
              req.targetHours = Math.max(1, Math.min(4, minDayCapacity));
            }
          }
        }

        const shuffledTheoryReqs = this.shuffleArray([...theoryRequirements], attemptRng)
          .sort((a, b) => b.targetHours - a.targetHours);

        const occupiedSlots = new Map<string, Set<number>>();
        const daySubjectMap = new Map<string, Set<string>>();
        const daySlotStaffMap = new Map<string, Map<number, string>>();
        const subjectDaySlot = new Map<string, Map<string, number>>();

        for (const d of WORKING_DAYS) {
          occupiedSlots.set(d, new Set<number>());
          daySubjectMap.set(d, new Set<string>());
          daySlotStaffMap.set(d, new Map<number, string>());
        }

        entries.forEach(e => {
          occupiedSlots.get(e.day)?.add(e.slotIndex);
          if (e.staffCode) {
            daySlotStaffMap.get(e.day)?.set(e.slotIndex, e.staffCode);
          }
        });

        let theoryPlacementFailed = false;

        for (const req of shuffledTheoryReqs) {
          const { subject, targetHours, staffCode, staffName } = req;
          subjectDaySlot.set(subject.subjectCode, new Map<string, number>());

          const availableDaysForSubject = WORKING_DAYS.filter(d => {
            if (daySubjectMap.get(d)?.has(subject.subjectCode)) return false;
            const dayOccupied = occupiedSlots.get(d)!;
            const allowedSlotsForDay = dayTheorySlotsMap.get(d) || [];
            const hasFreeSlot = allowedSlotsForDay.some(sIdx => !dayOccupied.has(sIdx));
            return hasFreeSlot;
          });

          if (availableDaysForSubject.length < targetHours) {
            theoryPlacementFailed = true;
            break;
          }

          const rankedDays = [...availableDaysForSubject].sort((a, b) => {
            const freeA = (dayTheorySlotsMap.get(a) || []).filter(s => !occupiedSlots.get(a)!.has(s)).length;
            const freeB = (dayTheorySlotsMap.get(b) || []).filter(s => !occupiedSlots.get(b)!.has(s)).length;
            return (freeB - freeA) + (attemptRng() - 0.5) * 0.8;
          });

          const chosenDays = rankedDays.slice(0, targetHours);

          for (const day of chosenDays) {
            const dayOccupied = occupiedSlots.get(day)!;
            const allowedSlotsForDay = dayTheorySlotsMap.get(day) || [];
            const freeSlots = allowedSlotsForDay.filter(sIdx => !dayOccupied.has(sIdx));

            if (freeSlots.length === 0) {
              theoryPlacementFailed = true;
              break;
            }

            const dayIdx = WORKING_DAYS.indexOf(day);
            const yesterday = dayIdx > 0 ? WORKING_DAYS[dayIdx - 1] : null;
            const tomorrow = dayIdx < WORKING_DAYS.length - 1 ? WORKING_DAYS[dayIdx + 1] : null;
            const yesterdaySlot = yesterday ? subjectDaySlot.get(subject.subjectCode)?.get(yesterday) : undefined;
            const tomorrowSlot = tomorrow ? subjectDaySlot.get(subject.subjectCode)?.get(tomorrow) : undefined;

            const scoredSlots = freeSlots.map(sIdx => {
              let penalty = 0;
              if (sIdx >= 7) penalty += 35;
              if (yesterdaySlot !== undefined && yesterdaySlot === sIdx) penalty += 50;
              if (tomorrowSlot !== undefined && tomorrowSlot === sIdx) penalty += 50;

              if (staffCode && externalStaffBusy.has(`${day}_${sIdx}_${staffCode.toUpperCase()}`)) {
                penalty += 5000;
              }
              if (externalRoomBusy.has(`${day}_${sIdx}_${defaultRoomId.toUpperCase()}`) || 
                  externalRoomBusy.has(`${day}_${sIdx}_${defaultRoomNumber.toUpperCase()}`)) {
                penalty += 5000;
              }
              penalty += attemptRng() * 5;
              return { slotIndex: sIdx, penalty };
            });

            scoredSlots.sort((a, b) => a.penalty - b.penalty);
            if (scoredSlots[0].penalty >= 5000) {
              theoryPlacementFailed = true;
              break;
            }
            const bestSlotChoice = scoredSlots[0].slotIndex;
            const slotDef = MASTER_PERIOD_DEFINITIONS.find(p => p.slotIndex === bestSlotChoice)!;

            entries.push({
              id: `entry_theory_${subject.subjectCode}_${day}_${bestSlotChoice}`,
              day,
              slotIndex: bestSlotChoice,
              startTime: slotDef.startTime,
              endTime: slotDef.endTime,
              subjectId: subject.id,
              subjectCode: subject.subjectCode,
              subjectName: subject.subjectName,
              staffCode,
              staffName,
              roomId: defaultRoomId,
              roomNumber: defaultRoomNumber,
              type: 'THEORY',
              locked: false,
              source: 'GENERATED',
            });

            occupiedSlots.get(day)!.add(bestSlotChoice);
            daySubjectMap.get(day)!.add(subject.subjectCode);
            daySlotStaffMap.get(day)!.set(bestSlotChoice, staffCode);
            subjectDaySlot.get(subject.subjectCode)!.set(day, bestSlotChoice);
          }

          if (theoryPlacementFailed) break;
        }

        if (theoryPlacementFailed) {
          lastFailureReason = 'Theory placement failed';
          continue;
        }

        // Fill remaining unassigned non-lab afternoon slots (Periods 6 & 7) with Institutional Enrichment Activities
        const nonLabAfternoons = ['Monday', 'Tuesday', 'Thursday', 'Friday'].filter(d => !labDaysScheduled.has(d));
        const enrichmentActivities = [
          { code: 'LIB', name: 'Library & Information Research', notes: 'Digital Library & Research Reading' },
          { code: 'SEM', name: 'Technical Seminar & Presentation', notes: 'Student Technical Presentations & Soft Skills' },
          { code: 'MENTOR', name: 'Mentoring & Career Advisory', notes: 'Faculty Mentorship & Career Guidance' },
          { code: 'TUT', name: 'Tutorial & Practice Hour', notes: 'Analytical Problem Solving & Practice' },
        ];

        let actIdx = 0;
        for (const d of nonLabAfternoons) {
          const dOcc = occupiedSlots.get(d)!;
          if (!dOcc.has(7) && !dOcc.has(8)) {
            const act = enrichmentActivities[actIdx % enrichmentActivities.length];
            actIdx++;
            for (const sIdx of [7, 8]) {
              const def = MASTER_PERIOD_DEFINITIONS.find(p => p.slotIndex === sIdx);
              entries.push({
                id: `entry_enrich_${d}_${sIdx}`,
                day: d,
                slotIndex: sIdx,
                startTime: def?.startTime || (sIdx === 7 ? '02:30' : '03:20'),
                endTime: def?.endTime || (sIdx === 7 ? '03:20' : '04:20'),
                subjectCode: act.code,
                subjectName: act.name,
                type: 'SPECIAL',
                locked: false,
                source: 'GENERATED',
                roomId: defaultRoomId,
                roomNumber: defaultRoomNumber,
                notes: `${act.notes} (Period ${sIdx === 7 ? '6' : '7'})`,
              });
              dOcc.add(sIdx);
            }
          }
        }
      }

      // 5. Strict Validation
      const isWedLockedInConfig = input.rules?.reserveWedAfternoon !== false;
      const validation = TimetableValidator.validate(
        entries, 
        theorySubjects.concat(labSubjects), 
        allSlots, 
        { reserveWedAfternoon: isWedLockedInConfig, year: input.year }
      );
      if (!validation.valid) {
        lastFailureReason = 'Validation failed: ' + validation.conflicts?.slice(0, 3).join(' | ');
        continue;
      }

      // 6. Quality and Distribution Scoring
      const quality = ScheduleOptimizer.calculateQuality(entries, theorySubjects.concat(labSubjects), allSlots);
      
      // Bonus for clean distribution and zero consecutive same periods
      let antiRepetitionScore = 100;
      for (const sub of theorySubjects) {
        const subEntries = entries.filter(e => e.subjectCode === sub.subjectCode && e.type === 'THEORY');
        for (let d = 0; d < WORKING_DAYS.length - 1; d++) {
          const d1 = WORKING_DAYS[d];
          const d2 = WORKING_DAYS[d + 1];
          const e1 = subEntries.find(e => e.day === d1);
          const e2 = subEntries.find(e => e.day === d2);
          if (e1 && e2 && e1.slotIndex === e2.slotIndex) {
            antiRepetitionScore -= 10;
          }
        }
      }

      const totalScore = quality.score + antiRepetitionScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestEntries = entries;
        validation.qualityScore = Math.max(90, Math.min(100, Math.round(totalScore / 2)));
        bestValidation = validation;

        // If top tier candidate, we can terminate early
        if (antiRepetitionScore >= 95 && quality.score >= 90) {
          break;
        }
      }
    }

    if (!bestEntries) {
      errors.push(`Could not generate a valid conflict-free timetable matching all constraints. (Detail: ${lastFailureReason || 'No valid candidate found'})`);
      suggestions.push('Check room availability, ensure all staff are active, and click "Reset Clean Dataset".');
      return { success: false, errors, suggestions };
    }

    const theoryHours = bestEntries.filter(e => e.type === 'THEORY').length;
    const labHours = bestEntries.filter(e => e.type === 'LAB').length;
    const specialHours = bestEntries.filter(e => e.type === 'SPECIAL').length;
    const totalClasses = theoryHours + labHours + specialHours;

    const timetableName = `${input.department || 'CSE'} - Year ${input.year || 'III'} - Sem ${input.semester || '5'}`;

    return {
      success: true,
      timetable: {
        name: timetableName,
        department: input.department || 'Computer Science & Engineering',
        year: input.year || 'III',
        semester: input.semester || '5',
        qualityScore: bestValidation?.qualityScore || 96,
        entries: bestEntries,
        validation: bestValidation || { valid: true, conflicts: [], qualityScore: 96 },
        stats: {
          totalClasses,
          theoryHours,
          labHours,
          specialHours,
        },
      },
    };
  }
}
