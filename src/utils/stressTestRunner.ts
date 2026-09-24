import { TimetableScheduler } from '@/scheduler/scheduler';
import { TimetableValidator } from '@/scheduler/validator';
import { SchedulerInput } from '@/scheduler/types';
import { MASTER_STAFF, MASTER_THEORY_SUBJECTS, MASTER_LABS, MASTER_ROOMS, MASTER_PERIOD_DEFINITIONS, WORKING_DAYS } from '@/config/timetableConfig';

export interface StressTestRunResult {
  runIndex: number;
  seed: number;
  success: boolean;
  qualityScore: number;
  durationMs: number;
  errors: string[];
  metrics: {
    wednesdayNaanMuthalvanLocked: boolean;
    zeroWednesdayLabs: boolean;
    labsPeriod6And7Only: boolean;
    labCount: number;
    zeroStaffConflicts: boolean;
    zeroRoomConflicts: boolean;
    maxOneTheoryPerDay: boolean;
    theoryHours: number;
    labHours: number;
  };
}

export interface StressTestSuiteReport {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  passRatePercent: number;
  averageQualityScore: number;
  averageDurationMs: number;
  wednesdayLockPassRate: number;
  zeroWednesdayLabsPassRate: number;
  labP6P7PassRate: number;
  zeroConflictsPassRate: number;
  runs: StressTestRunResult[];
}

export class TimetableStressTester {
  static runSingleTest(runIndex: number, seed: number): StressTestRunResult {
    const startTime = performance.now();

    const input: SchedulerInput = {
      department: 'Computer Science & Engineering',
      year: 'III',
      semester: '5',
      seed,
      subjects: [
        ...MASTER_THEORY_SUBJECTS.map(s => ({
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
        })),
        ...MASTER_LABS.map(l => ({
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
        })),
      ],
      staff: MASTER_STAFF.map(s => ({
        id: `staff_${s.staffCode}`,
        staffCode: s.staffCode,
        name: s.name,
        email: s.email,
        department: s.department,
        designation: s.designation,
        active: true,
      })),
      rooms: MASTER_ROOMS,
      labs: MASTER_LABS.map(l => ({
        id: `lab_${l.subjectCode}`,
        labCode: l.subjectCode,
        labName: l.labName,
        capacity: 35,
        duration: l.duration,
        preferredPeriod: 'Afternoon' as const,
        department: 'Computer Science & Engineering',
        active: true,
      })),
      timeSlots: [],
      specialSessions: [],
      rules: {
        theoryDefaultHours: 4,
        labDefaultDuration: 2,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        preferTheoryMorning: true,
        preferLabsAfternoon: true,
        avoidConsecutiveSameSubject: true,
        maxConsecutiveClasses: 3,
      },
    };

    const output = TimetableScheduler.generate(input);
    const durationMs = Math.round(performance.now() - startTime);

    if (!output.success || !output.timetable) {
      return {
        runIndex,
        seed,
        success: false,
        qualityScore: 0,
        durationMs,
        errors: output.errors || ['Generation failed'],
        metrics: {
          wednesdayNaanMuthalvanLocked: false,
          zeroWednesdayLabs: false,
          labsPeriod6And7Only: false,
          labCount: 0,
          zeroStaffConflicts: false,
          zeroRoomConflicts: false,
          maxOneTheoryPerDay: false,
          theoryHours: 0,
          labHours: 0,
        },
      };
    }

    const entries = output.timetable.entries;

    // Metric 1: Wednesday Afternoon (P5, P6 & P7) strictly Naan Muthalvan
    const wedP5 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 6);
    const wedP6 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 7);
    const wedP7 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 8);
    const wednesdayNaanMuthalvanLocked = 
      Boolean(wedP5 && wedP5.subjectName?.toLowerCase().includes('naan muthalvan')) &&
      Boolean(wedP6 && wedP6.subjectName?.toLowerCase().includes('naan muthalvan')) &&
      Boolean(wedP7 && wedP7.subjectName?.toLowerCase().includes('naan muthalvan'));

    // Metric 2: Zero Wednesday labs
    const wedLabs = entries.filter(e => e.day === 'Wednesday' && e.type === 'LAB');
    const zeroWednesdayLabs = wedLabs.length === 0;

    // Metric 3: Labs Period 6 & 7 only
    const nonP6P7Labs = entries.filter(e => e.type === 'LAB' && e.slotIndex !== 7 && e.slotIndex !== 8);
    const labsPeriod6And7Only = nonP6P7Labs.length === 0;

    // Metric 4: Lab count (4 labs = 8 slots)
    const labEntries = entries.filter(e => e.type === 'LAB');
    const labCount = labEntries.length / 2;

    // Metric 5: Zero staff conflicts
    const staffSlotMap = new Map<string, number>();
    let zeroStaffConflicts = true;
    for (const e of entries) {
      if (e.staffCode && e.type !== 'BREAK' && e.type !== 'LUNCH' && e.type !== 'SPECIAL') {
        const key = `${e.day}_${e.slotIndex}_${e.staffCode}`;
        const count = (staffSlotMap.get(key) || 0) + 1;
        staffSlotMap.set(key, count);
        if (count > 1) zeroStaffConflicts = false;
      }
    }

    // Metric 6: Zero room conflicts
    const roomSlotMap = new Map<string, number>();
    let zeroRoomConflicts = true;
    for (const e of entries) {
      if (e.roomId && e.type !== 'BREAK' && e.type !== 'LUNCH') {
        const key = `${e.day}_${e.slotIndex}_${e.roomId}`;
        const count = (roomSlotMap.get(key) || 0) + 1;
        roomSlotMap.set(key, count);
        if (count > 1) zeroRoomConflicts = false;
      }
    }

    // Metric 7: Max 1 theory period per subject per day
    const daySubjectMap = new Map<string, number>();
    let maxOneTheoryPerDay = true;
    for (const e of entries) {
      if (e.type === 'THEORY' && e.subjectCode) {
        const key = `${e.day}_${e.subjectCode}`;
        const count = (daySubjectMap.get(key) || 0) + 1;
        daySubjectMap.set(key, count);
        if (count > 1) maxOneTheoryPerDay = false;
      }
    }

    const theoryHours = entries.filter(e => e.type === 'THEORY').length;
    const labHours = entries.filter(e => e.type === 'LAB').length;

    const allHardConstraintsPassed = 
      wednesdayNaanMuthalvanLocked &&
      zeroWednesdayLabs &&
      labsPeriod6And7Only &&
      zeroStaffConflicts &&
      zeroRoomConflicts &&
      maxOneTheoryPerDay;

    return {
      runIndex,
      seed,
      success: allHardConstraintsPassed,
      qualityScore: output.timetable.qualityScore,
      durationMs,
      errors: allHardConstraintsPassed ? [] : ['Hard constraint violation detected'],
      metrics: {
        wednesdayNaanMuthalvanLocked,
        zeroWednesdayLabs,
        labsPeriod6And7Only,
        labCount,
        zeroStaffConflicts,
        zeroRoomConflicts,
        maxOneTheoryPerDay,
        theoryHours,
        labHours,
      },
    };
  }

  static async runSuite(
    totalRuns: number = 100,
    onProgress?: (progressPercent: number, currentRun: number, result: StressTestRunResult) => void
  ): Promise<StressTestSuiteReport> {
    const results: StressTestRunResult[] = [];
    let passedCount = 0;
    let totalQuality = 0;
    let totalDuration = 0;

    let wedLockedCount = 0;
    let zeroWedLabsCount = 0;
    let labP6P7Count = 0;
    let zeroConflictsCount = 0;

    for (let i = 0; i < totalRuns; i++) {
      // Yield to avoid freezing UI
      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }

      const seed = 100000 + i * 7919 + Math.floor(Math.random() * 500);
      const res = this.runSingleTest(i + 1, seed);
      results.push(res);

      if (res.success) passedCount++;
      totalQuality += res.qualityScore;
      totalDuration += res.durationMs;

      if (res.metrics.wednesdayNaanMuthalvanLocked) wedLockedCount++;
      if (res.metrics.zeroWednesdayLabs) zeroWedLabsCount++;
      if (res.metrics.labsPeriod6And7Only) labP6P7Count++;
      if (res.metrics.zeroStaffConflicts && res.metrics.zeroRoomConflicts) zeroConflictsCount++;

      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalRuns) * 100), i + 1, res);
      }
    }

    return {
      totalRuns,
      passedRuns: passedCount,
      failedRuns: totalRuns - passedCount,
      passRatePercent: Math.round((passedCount / totalRuns) * 100),
      averageQualityScore: Math.round(totalQuality / totalRuns),
      averageDurationMs: Math.round(totalDuration / totalRuns),
      wednesdayLockPassRate: Math.round((wedLockedCount / totalRuns) * 100),
      zeroWednesdayLabsPassRate: Math.round((zeroWedLabsCount / totalRuns) * 100),
      labP6P7PassRate: Math.round((labP6P7Count / totalRuns) * 100),
      zeroConflictsPassRate: Math.round((zeroConflictsCount / totalRuns) * 100),
      runs: results,
    };
  }
}
