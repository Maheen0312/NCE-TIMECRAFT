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
console.log(`RESULTS OF 100 TEST RUNS (YEAR III):`);
console.log(`✅ PASSED: ${passedRuns} / 100 (${(passedRuns / 100) * 100}%)`);
console.log(`❌ FAILED: ${failedRuns} / 100`);
console.log(`🧪 3-Lab Legacy Scenario: ${legacyPassed} / 30 Passed`);
console.log(`🧪 28h Heavy Load Scenario: ${heavyLoadPassed} / 30 Passed`);
if (failures.length > 0) {
  console.log(`Errors:`, failures.slice(0, 10));
} else {
  console.log(`🎉 ALL YEAR III RUNS MET 100% OF HARD CONSTRAINTS PERFECTLY!`);
}
console.log(`========================================\n`);

// ==========================================
// TEST SCENARIO: FINAL YEAR (IV)
// ==========================================
console.log(`🧪 Starting Final Year (IV) Rigorous Test Suite (50 Runs)...`);
const finalYearSubjects: Subject[] = [
  { id: 'sub_ge3791', subjectCode: 'GE3791', subjectName: 'Human Values and Ethics', type: 'THEORY', weeklyHours: 8, assignedStaff: ['STF01'], department: 'Computer Science & Engineering', year: 'IV', semester: '7', active: true },
  { id: 'sub_ge3752', subjectCode: 'GE3752', subjectName: 'Total Quality Management', type: 'THEORY', weeklyHours: 8, assignedStaff: ['STF02'], department: 'Computer Science & Engineering', year: 'IV', semester: '7', active: true },
  { id: 'sub_fd352', subjectCode: 'FD352', subjectName: 'Foundation Skills in Integrated Product Development', type: 'THEORY', weeklyHours: 8, assignedStaff: ['STF03'], department: 'Computer Science & Engineering', year: 'IV', semester: '7', active: true },
  { id: 'sub_ai3021', subjectCode: 'AI3021', subjectName: 'Deep Learning and Generative AI', type: 'THEORY', weeklyHours: 8, assignedStaff: ['STF04'], department: 'Computer Science & Engineering', year: 'IV', semester: '7', active: true },
];

let finalYearPassed = 0;
let finalYearFailed = 0;
const finalYearErrors: string[] = [];

for (let i = 1; i <= 50; i++) {
  const result = TimetableScheduler.generate({
    department: 'Computer Science & Engineering',
    year: 'IV',
    semester: '7',
    staff: staffProfiles,
    subjects: finalYearSubjects,
    labs: [],
    rooms: MASTER_ROOMS,
    timeSlots: [],
    specialSessions: [],
    rules: {} as any,
    seed: i * 991 + 73,
  });

  if (!result.success || !result.timetable) {
    finalYearFailed++;
    finalYearErrors.push(`Final Year Run #${i} failed: ${result.errors?.join(', ')}`);
    continue;
  }

  const entries = result.timetable.entries;
  const val = TimetableValidator.validate(entries, finalYearSubjects, allSlots as any, { year: 'IV' });

  // Assertions for Final Year:
  // 1. NEVER Naan Muthalvan
  const hasNM = entries.some(e => (e.subjectName || '').toLowerCase().includes('naan') || (e.subjectCode || '').toUpperCase().includes('NM'));
  if (hasNM) {
    finalYearErrors.push(`Final Year Run #${i}: Naan Mudhalvan found in Final Year!`);
  }

  // 2. Wednesday afternoon is Career Guidance
  const wedCG = entries.filter(e => e.day === 'Wednesday' && [6, 7, 8].includes(e.slotIndex) && (e.subjectCode === 'CG401' || (e.subjectName || '').toLowerCase().includes('career')));
  if (wedCG.length !== 3) {
    finalYearErrors.push(`Final Year Run #${i}: Wednesday afternoon is missing Career Guidance (found ${wedCG.length}/3)`);
  }

  // 3. Exactly 32 teaching periods filled
  const teachingEntries = entries.filter(e => e.type === 'THEORY');
  if (teachingEntries.length !== 32) {
    finalYearErrors.push(`Final Year Run #${i}: Expected 32 teaching periods, got ${teachingEntries.length}`);
  }

  // 4. Exactly 4 subjects allocated
  const subCodes = new Set(teachingEntries.map(e => e.subjectCode));
  if (subCodes.size !== 4) {
    finalYearErrors.push(`Final Year Run #${i}: Expected 4 subjects, got ${subCodes.size}`);
  }

  if (val.valid && !hasNM && wedCG.length === 3 && teachingEntries.length === 32 && subCodes.size === 4) {
    finalYearPassed++;
  } else {
    finalYearFailed++;
    if (val.conflicts?.length) {
      finalYearErrors.push(...val.conflicts);
    }
  }
}

console.log(`========================================`);
console.log(`RESULTS OF FINAL YEAR (IV) TEST RUNS:`);
console.log(`✅ PASSED: ${finalYearPassed} / 50 (${(finalYearPassed / 50) * 100}%)`);
console.log(`❌ FAILED: ${finalYearFailed} / 50`);
if (finalYearErrors.length > 0) {
  console.log(`Errors:`, finalYearErrors.slice(0, 10));
} else {
  console.log(`🎉 ALL FINAL YEAR RUNS MET 100% OF HARD CONSTRAINTS PERFECTLY!`);
}
console.log(`========================================\n`);

// ==========================================
// TEST SCENARIO: YEAR II (2nd Year)
// ==========================================
console.log(`🧪 Starting Year II Rigorous Test Suite (50 Runs)...`);
const year2TheorySubjects: Subject[] = MASTER_THEORY_SUBJECTS.filter(s => s.year === 'II').map(s => ({
  id: `sub_${s.subjectCode}`,
  subjectCode: s.subjectCode,
  subjectName: s.subjectName,
  type: 'THEORY',
  weeklyHours: s.weeklyHours,
  assignedStaff: [s.assignedStaffCode],
  department: s.department,
  year: 'II',
  semester: '3',
  active: true,
}));

const year2LabSubjects: Subject[] = MASTER_LABS.filter(l => l.year === 'II').map(l => ({
  id: `sub_${l.subjectCode}`,
  subjectCode: l.subjectCode,
  subjectName: l.labName,
  type: 'LAB',
  weeklyHours: l.duration,
  assignedStaff: [l.staffCode],
  department: 'Computer Science & Engineering',
  year: 'II',
  semester: '3',
  active: true,
}));

let year2Passed = 0;
let year2Failed = 0;
const year2Errors: string[] = [];

for (let i = 1; i <= 50; i++) {
  const result = TimetableScheduler.generate({
    department: 'Computer Science & Engineering',
    year: 'II',
    semester: '3',
    staff: staffProfiles,
    subjects: year2TheorySubjects.concat(year2LabSubjects),
    labs: MASTER_LABS.filter(l => l.year === 'II') as any,
    rooms: MASTER_ROOMS,
    timeSlots: [],
    specialSessions: [],
    rules: {} as any,
    seed: i * 883 + 41,
  });

  if (!result.success || !result.timetable) {
    year2Failed++;
    year2Errors.push(`Year II Run #${i} failed: ${result.errors?.join(', ')}`);
    continue;
  }

  const entries = result.timetable.entries;
  const val = TimetableValidator.validate(entries, year2TheorySubjects.concat(year2LabSubjects), allSlots as any, { year: 'II' });

  // Assertions for Year II:
  // 1. Thursday afternoon has Naan Muthalvan
  const thuNM = entries.filter(e => e.day === 'Thursday' && [6, 7, 8].includes(e.slotIndex) && (e.subjectCode === 'NM-201' || (e.subjectName || '').toLowerCase().includes('naan')));
  if (thuNM.length !== 3) {
    year2Errors.push(`Year II Run #${i}: Thursday afternoon missing Naan Mudhalvan (found ${thuNM.length}/3)`);
  }

  // 2. Wednesday afternoon is NOT locked as Naan Muthalvan
  const wedNM = entries.filter(e => e.day === 'Wednesday' && [6, 7, 8].includes(e.slotIndex) && (e.subjectCode === 'NM-201' || (e.subjectName || '').toLowerCase().includes('naan')));
  if (wedNM.length > 0) {
    year2Errors.push(`Year II Run #${i}: Year II inherited Wednesday Naan Mudhalvan!`);
  }

  if (val.valid && thuNM.length === 3 && wedNM.length === 0) {
    year2Passed++;
  } else {
    year2Failed++;
    if (val.conflicts?.length) {
      year2Errors.push(...val.conflicts);
    }
  }
}

console.log(`========================================`);
console.log(`RESULTS OF YEAR II TEST RUNS:`);
console.log(`✅ PASSED: ${year2Passed} / 50 (${(year2Passed / 50) * 100}%)`);
console.log(`❌ FAILED: ${year2Failed} / 50`);
if (year2Errors.length > 0) {
  console.log(`Errors:`, year2Errors.slice(0, 10));
} else {
  console.log(`🎉 ALL YEAR II RUNS MET 100% OF HARD CONSTRAINTS PERFECTLY!`);
}
console.log(`========================================\n`);
