/**
 * NCE TIMECRAFT - Year & Semester Configuration & Normalization Utilities
 * Supports:
 * - 2nd Year (Semester 3 & 4)
 * - 3rd Year (Semester 5 & 6)
 * - Final Year / 4th Year (Semester 7 & 8)
 * 
 * Safely handles any legacy representations ("II", "2", "Year II", "III", "3", "IV", "4", etc.)
 */

export type CanonicalYear = 'II' | 'III' | 'IV';

export interface YearConfig {
  key: CanonicalYear;
  displayName: string;
  label: string;
  shortName: string;
  semesters: string[];
  defaultSemester: string;
  roman: string;
  numeric: string;
  defaultRoomNumber: string;
}

export const YEAR_CONFIGS: YearConfig[] = [
  {
    key: 'II',
    displayName: '2nd Year',
    label: '2nd Year',
    shortName: 'Year II',
    semesters: ['3', '4'],
    defaultSemester: '3',
    roman: 'II',
    numeric: '2',
    defaultRoomNumber: 'CSE-102',
  },
  {
    key: 'III',
    displayName: '3rd Year',
    label: '3rd Year',
    shortName: 'Year III',
    semesters: ['5', '6'],
    defaultSemester: '5',
    roman: 'III',
    numeric: '3',
    defaultRoomNumber: 'CSE-101',
  },
  {
    key: 'IV',
    displayName: 'Final Year',
    label: 'Final Year',
    shortName: 'Year IV',
    semesters: ['7', '8'],
    defaultSemester: '7',
    roman: 'IV',
    numeric: '4',
    defaultRoomNumber: 'CSE-201',
  },
];

/**
 * Normalizes any year string/number to the canonical representation ('II', 'III', 'IV').
 */
export function normalizeYear(year?: string | number | null): CanonicalYear | '' {
  if (year === undefined || year === null) return '';
  const str = String(year).trim().toUpperCase();
  if (!str) return '';

  // 4th / Final Year checks
  if (
    str === 'IV' ||
    str === '4' ||
    str === '4TH' ||
    str === '4TH YEAR' ||
    str.includes('FINAL') ||
    str.includes('FOURTH') ||
    str === 'YEAR IV'
  ) {
    return 'IV';
  }

  // 3rd Year checks
  if (
    str === 'III' ||
    str === '3' ||
    str === '3RD' ||
    str === '3RD YEAR' ||
    str.includes('THIRD') ||
    str === 'YEAR III'
  ) {
    return 'III';
  }

  // 2nd Year checks
  if (
    str === 'II' ||
    str === '2' ||
    str === '2ND' ||
    str === '2ND YEAR' ||
    str.includes('SECOND') ||
    str === 'YEAR II'
  ) {
    return 'II';
  }

  // 1st Year (fallback if ever encountered)
  if (str === 'I' || str === '1') {
    return 'II';
  }

  return '';
}

/**
 * Returns human-friendly display name: "2nd Year", "3rd Year", or "Final Year".
 */
export function formatYearDisplay(year?: string | number | null): string {
  const norm = normalizeYear(year);
  switch (norm) {
    case 'II':
      return '2nd Year';
    case 'III':
      return '3rd Year';
    case 'IV':
      return 'Final Year';
    default:
      return year ? String(year) : '3rd Year';
  }
}

/**
 * Returns true if two year representations reference the same academic year.
 */
export function matchYear(y1?: string | number | null, y2?: string | number | null): boolean {
  if (!y1 && !y2) return true;
  if (!y1 || !y2) return false;
  const n1 = normalizeYear(y1);
  const n2 = normalizeYear(y2);
  if (n1 && n2) return n1 === n2;
  return String(y1).trim().toUpperCase() === String(y2).trim().toUpperCase();
}

/**
 * Infers Canonical Year from Semester (e.g. Sem 3 or 4 -> 'II').
 */
export function getYearForSemester(sem?: string | number | null): CanonicalYear | '' {
  if (!sem) return '';
  const s = String(sem).trim();
  if (s === '3' || s === '4') return 'II';
  if (s === '5' || s === '6') return 'III';
  if (s === '7' || s === '8') return 'IV';
  return '';
}

/**
 * Gets valid semesters for a given year.
 */
export function getSemestersForYear(year?: string | number | null): string[] {
  const norm = normalizeYear(year);
  switch (norm) {
    case 'II':
      return ['3', '4'];
    case 'III':
      return ['5', '6'];
    case 'IV':
      return ['7', '8'];
    default:
      return ['1', '2', '3', '4', '5', '6', '7', '8'];
  }
}

/**
 * Checks whether a subject matches the target year and/or semester.
 */
export function subjectMatchesYearAndSem(
  subject: { year?: string; semester?: string },
  targetYear?: string,
  targetSem?: string
): boolean {
  const normTargetYear = targetYear ? normalizeYear(targetYear) : '';
  const subNormYear = subject.year ? normalizeYear(subject.year) : getYearForSemester(subject.semester);

  // If a target year is provided, match by year or semester inference
  if (normTargetYear) {
    if (subNormYear && subNormYear !== normTargetYear) {
      return false;
    }
  }

  // If target semester is provided, match semester
  if (targetSem) {
    const subSem = subject.semester ? String(subject.semester).trim() : '';
    const tSem = String(targetSem).trim();
    if (subSem && subSem !== tSem) {
      return false;
    }
  }

  return true;
}
