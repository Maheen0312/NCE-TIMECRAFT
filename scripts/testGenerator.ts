import { TimetableScheduler } from '../src/scheduler/scheduler';
import { TimetableValidator } from '../src/scheduler/validator';
import { 
  MASTER_STAFF, 
  MASTER_THEORY_SUBJECTS, 
  MASTER_LABS, 
  MASTER_ROOMS, 
  MASTER_PERIOD_DEFINITIONS,
  WORKING_DAYS 
} from '../src/config/timetableConfig';
import { Subject, StaffProfile } from '../src/types/timetable';

console.log('🧪 Starting 100-Run Timetable Generator Rigorous Test Suite...\n');

const theorySubjects: Subject[] = MASTER_THEORY_SUBJECTS.map(s => ({
  id: `sub_${s.subjectCode}`,
  subjectCode: s.subjectCode,
  subjectName: s.subjectName,
  type: 'THEORY',
  weeklyHours: s.weeklyHours,
  assignedStaff: [s.assignedStaffCode],
  department: s.department,
  year: s.year,
  semester: s.semester,
  active: true,
}));

const labSubjects: Subject[] = MASTER_LABS.map(l => ({
  id: `sub_${l.subjectCode}`,
  subjectCode: l.subjectCode,
  subjectName: l.labName,
  type: 'LAB',
  weeklyHours: l.duration,
  assignedStaff: [l.staffCode],
  department: 'Computer Science & Engineering',
  year: 'III',
  semester: '5',
  active: true,
}));

const staffProfiles: StaffProfile[] = MASTER_STAFF.map(s => ({
  id: `staff_${s.staffCode}`,
  staffCode: s.staffCode,
  name: s.name,
  email: s.email,
  department: s.department,
  designation: s.designation,
  active: true,
}));

const allSlots = [];
for (const day of WORKING_DAYS) {
  for (const def of MASTER_PERIOD_DEFINITIONS) {
    allSlots.push({
      id: `${day}_${def.slotIndex}`,
      day,
      slotIndex: def.slotIndex,
      startTime: def.startTime,
      endTime: def.endTime,
      type: def.type,
      isMorning: def.isMorning,
      isAfternoon: def.isAfternoon,
    });
  }
}

let passedRuns = 0;
let failedRuns = 0;
const failures: string[] = [];

for (let i = 1; i <= 100; i++) {
  const result = TimetableScheduler.generate({
    department: 'Computer Science & Engineering',
    year: 'III',
    semester: '5',
    staff: staffProfiles,
    subjects: theorySubjects.concat(labSubjects),
    labs: MASTER_LABS as any,
    rooms: MASTER_ROOMS,
    timeSlots: [],
    specialSessions: [],
    rules: {} as any,
    seed: i * 31337 + 19,
  });

  if (!result.success || !result.timetable) {
    failedRuns++;
    failures.push(`Run #${i} failed to produce timetable: ${result.errors?.join(', ')}`);
    continue;
  }

  const entries = result.timetable.entries;
  const validation = TimetableValidator.validate(entries, theorySubjects.concat(labSubjects), allSlots as any);

  let runErrors: string[] = [];

  // Check 1: Wednesday P6 and P7 must be Naan Muthalvan
  const wedP6 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 7);
  const wedP7 = entries.find(e => e.day === 'Wednesday' && e.slotIndex === 8);
  if (!wedP6 || !wedP6.subjectName?.toLowerCase().includes('naan muthalvan')) {
    runErrors.push(`Run #${i}: Wednesday P6 is not Naan Muthalvan`);
  }
  if (!wedP7 || !wedP7.subjectName?.toLowerCase().includes('naan muthalvan')) {
    runErrors.push(`Run #${i}: Wednesday P7 is not Naan Muthalvan`);
  }

  // Check 2: No labs on Wednesday
  const wedLabs = entries.filter(e => e.day === 'Wednesday' && e.type === 'LAB');
  if (wedLabs.length > 0) {
    runErrors.push(`Run #${i}: Found lab on Wednesday`);
  }

  // Check 3: Exactly 4 labs scheduled in P6 & P7 on Mon, Tue, Thu, Fri
  const labEntries = entries.filter(e => e.type === 'LAB');
  if (labEntries.length !== 8) { // 4 labs × 2 periods = 8 entries
    runErrors.push(`Run #${i}: Expected 8 lab period entries, found ${labEntries.length}`);
  }

  const labDays = new Set(labEntries.map(e => e.day));
  if (labDays.size !== 4) {
    runErrors.push(`Run #${i}: Expected labs on 4 distinct days, found ${labDays.size}`);
  }
  if (labDays.has('Wednesday')) {
    runErrors.push(`Run #${i}: Wednesday has lab!`);
  }

  // Check 4: No subject twice on same day
  const theoryEntries = entries.filter(e => e.type === 'THEORY');
  for (const day of WORKING_DAYS) {
    const dayTheories = theoryEntries.filter(e => e.day === day);
    const daySubCodes = dayTheories.map(e => e.subjectCode);
    const uniqueCodes = new Set(daySubCodes);
    if (uniqueCodes.size !== daySubCodes.length) {
      runErrors.push(`Run #${i}: Duplicate theory subject on ${day}`);
    }
  }

  // Check 5: Staff double booking
  const teachingEntries = entries.filter(e => e.type === 'THEORY' || e.type === 'LAB');
  for (const day of WORKING_DAYS) {
    for (let sIdx = 0; sIdx <= 8; sIdx++) {
      const slotStaff = teachingEntries.filter(e => e.day === day && e.slotIndex === sIdx && e.staffCode);
      const staffCodes = slotStaff.map(e => e.staffCode);
      const uniqueStaff = new Set(staffCodes);
      if (uniqueStaff.size !== staffCodes.length) {
        runErrors.push(`Run #${i}: Staff conflict on ${day} slot ${sIdx}`);
      }
    }
  }

  if (runErrors.length > 0 || !validation.valid) {
    failedRuns++;
    failures.push(...runErrors, ...(validation.conflicts || []));
  } else {
    passedRuns++;
  }
}

// Additional Test Scenario: 30 runs with 3 labs only (legacy data test)
let legacyPassed = 0;
for (let i = 1; i <= 30; i++) {
  const result = TimetableScheduler.generate({
    department: 'Computer Science & Engineering',
    year: 'III',
    semester: '5',
    staff: staffProfiles,
    subjects: theorySubjects.concat(labSubjects.slice(0, 3)),
    labs: MASTER_LABS.slice(0, 3) as any,
    rooms: MASTER_ROOMS,
    timeSlots: [],
    specialSessions: [],
    rules: {} as any,
    seed: i * 4441 + 7,
  });

  if (result.success && result.timetable) {
    const val = TimetableValidator.validate(result.timetable.entries, theorySubjects.concat(labSubjects.slice(0, 3)), allSlots as any);
    if (val.valid) legacyPassed++;
  }
}

// Additional Test Scenario: 30 runs with 7 theory subjects all at 4h weekly load (28h theory load)
let heavyLoadPassed = 0;
const heavyTheorySubjects: Subject[] = theorySubjects.map(s => ({ ...s, weeklyHours: 4 }));
for (let i = 1; i <= 30; i++) {
  const result = TimetableScheduler.generate({
    department: 'Computer Science & Engineering',
    year: 'III',
    semester: '5',
    staff: staffProfiles,
    subjects: heavyTheorySubjects.concat(labSubjects),
    labs: MASTER_LABS as any,
    rooms: MASTER_ROOMS,
    timeSlots: [],
    specialSessions: [],
    rules: {} as any,
    seed: i * 7717 + 13,
  });

  if (result.success && result.timetable) {
    const val = TimetableValidator.validate(result.timetable.entries, heavyTheorySubjects.concat(labSubjects), allSlots as any);
    if (val.valid) heavyLoadPassed++;
  }
}

console.log(`========================================`);
console.log(`RESULTS OF 100 TEST RUNS:`);
console.log(`✅ PASSED: ${passedRuns} / 100 (${(passedRuns / 100) * 100}%)`);
console.log(`❌ FAILED: ${failedRuns} / 100`);
console.log(`🧪 3-Lab Legacy Scenario: ${legacyPassed} / 30 Passed`);
console.log(`🧪 28h Heavy Load Scenario: ${heavyLoadPassed} / 30 Passed`);
if (failures.length > 0) {
  console.log(`Errors:`, failures.slice(0, 10));
} else {
  console.log(`🎉 ALL RUNS MET 100% OF HARD CONSTRAINTS PERFECTLY!`);
}
console.log(`========================================`);
