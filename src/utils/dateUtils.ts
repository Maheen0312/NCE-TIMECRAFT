/**
 * NCE TIMECRAFT - Centralized Date, Time & Engineering Academic Year Utility
 *
 * Enforces:
 * 1. Strict Asia/Kolkata (IST - Indian Standard Time, UTC+5:30) timezone calculation.
 * 2. Dynamic Engineering College Academic Year cycle (July -> June):
 *    - July through December: CURRENT YEAR - NEXT YEAR (e.g. Sept 2026 -> "2026 - 2027")
 *    - January through June: PREVIOUS YEAR - CURRENT YEAR (e.g. Jan 2027 -> "2026 - 2027", July 2027 -> "2027 - 2028")
 * 3. Dynamic current date formatting (e.g. "05 Sept 2026" with strict "Sept" abbreviation).
 * 4. Dynamic current IST time formatting (e.g. "12:52 PM IST").
 * 5. Dynamic generation timestamps for Quick Image and Official HD PDF exports.
 * 6. Historical metadata preservation without hardcoded fallbacks.
 */

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
] as const;

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export interface ISTDateParts {
  day: number;
  dayFormatted: string; // e.g. "05"
  month: number; // 1 to 12
  monthIndex: number; // 0 to 11
  monthShort: string; // e.g. "Sept", "Jan"
  monthFull: string; // e.g. "September"
  year: number; // e.g. 2026
  hour12: number; // 1 to 12
  hour24: number; // 0 to 23
  minute: number; // 0 to 59
  minuteFormatted: string; // e.g. "05", "52"
  second: number;
  secondFormatted: string;
  period: 'AM' | 'PM';
  academicYear: string; // e.g. "2026 - 2027"
  academicYearCompact: string; // e.g. "2026-2027"
  semesterType: 'ODD' | 'EVEN';
  semesterName: string; // "ODD SEMESTER" | "EVEN SEMESTER"
  effectiveDate: string; // e.g. "15.07.2026" (July for Odd, Jan for Even)
  formattedDate: string; // e.g. "05 Sept 2026"
  formattedTime: string; // e.g. "12:52 PM IST"
  fullTimestamp: string; // e.g. "05 Sept 2026 • 12:52 PM IST"
}

// Server clock synchronization offset (in milliseconds)
let serverTimeOffsetMs = 0;
let isSyncing = false;

/**
 * Synchronizes client clock with the authoritative backend server time.
 * Prevents client-side OS clock drift or device timezone discrepancies.
 */
export async function syncWithServerTime(): Promise<number> {
  if (typeof window === 'undefined' || isSyncing) return serverTimeOffsetMs;
  isSyncing = true;
  try {
    const t0 = Date.now();
    const res = await fetch('/api/server-time');
    if (res.ok) {
      const data = await res.json();
      const t1 = Date.now();
      const roundTrip = (t1 - t0) / 2;
      const accurateServerNow = (Number(data.serverTime) || Date.now()) + roundTrip;
      serverTimeOffsetMs = accurateServerNow - t1;
    }
  } catch (err) {
    // Graceful fallback to client clock
  } finally {
    isSyncing = false;
  }
  return serverTimeOffsetMs;
}

// Auto-trigger sync on initial browser load
if (typeof window !== 'undefined') {
  syncWithServerTime();
}

/**
 * Returns the authoritative Date instance (synced with backend server).
 */
export function getAuthoritativeNow(): Date {
  return new Date(Date.now() + serverTimeOffsetMs);
}

/**
 * Extracts comprehensive, timezone-accurate IST date parts from any Date or current runtime.
 */
export function getISTDateParts(date?: Date): ISTDateParts {
  const targetDate = date || getAuthoritativeNow();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  });

  const parts = formatter.formatToParts(targetDate);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const day = parseInt(partMap.day, 10);
  const month = parseInt(partMap.month, 10);
  const year = parseInt(partMap.year, 10);
  const monthIndex = Math.max(0, Math.min(11, month - 1));
  const monthShort = MONTH_NAMES_SHORT[monthIndex];
  const monthFull = MONTH_NAMES_FULL[monthIndex];
  const dayFormatted = String(day).padStart(2, '0');

  const hour12 = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const minuteFormatted = String(minute).padStart(2, '0');
  const second = parseInt(partMap.second || '0', 10);
  const secondFormatted = String(second).padStart(2, '0');
  const rawPeriod = (partMap.dayPeriod || '').toUpperCase();
  const period: 'AM' | 'PM' = rawPeriod.includes('P') ? 'PM' : 'AM';

  // 24-hour conversion
  let hour24 = hour12;
  if (period === 'PM' && hour12 < 12) hour24 = hour12 + 12;
  if (period === 'AM' && hour12 === 12) hour24 = 0;

  // Engineering College Academic Cycle: July -> June
  // Month 7-12 (monthIndex 6-11): CURRENT YEAR - NEXT YEAR (e.g., July 2026 - Dec 2026 -> 2026 - 2027)
  // Month 1-6 (monthIndex 0-5): PREVIOUS YEAR - CURRENT YEAR (e.g., Jan 2027 - June 2027 -> 2026 - 2027)
  const isSecondHalfOfYear = monthIndex >= 6; // July through December
  const startYear = isSecondHalfOfYear ? year : year - 1;
  const endYear = isSecondHalfOfYear ? year + 1 : year;
  const academicYear = `${startYear} - ${endYear}`;
  const academicYearCompact = `${startYear}-${endYear}`;

  const semesterType: 'ODD' | 'EVEN' = isSecondHalfOfYear ? 'ODD' : 'EVEN';
  const semesterName = isSecondHalfOfYear ? 'ODD SEMESTER' : 'EVEN SEMESTER';

  // Official commencement date for engineering term
  const effectiveDate = isSecondHalfOfYear ? `15.07.${startYear}` : `02.01.${endYear}`;

  const formattedDate = `${dayFormatted} ${monthShort} ${year}`;
  const formattedTime = `${hour12}:${minuteFormatted} ${period} IST`;
  const fullTimestamp = `${formattedDate} • ${formattedTime}`;

  return {
    day,
    dayFormatted,
    month,
    monthIndex,
    monthShort,
    monthFull,
    year,
    hour12,
    hour24,
    minute,
    minuteFormatted,
    second,
    secondFormatted,
    period,
    academicYear,
    academicYearCompact,
    semesterType,
    semesterName,
    effectiveDate,
    formattedDate,
    formattedTime,
    fullTimestamp,
  };
}

/**
 * Returns the current Engineering Academic Year based on IST runtime date.
 * E.g., September 2026 -> "2026 - 2027"
 */
export function getCurrentEngineeringAcademicYear(date?: Date): string {
  return getISTDateParts(date).academicYear;
}

/**
 * Returns formatted date in Indian Standard Time (Asia/Kolkata).
 * E.g. "05 Sept 2026"
 */
export function getCurrentISTDate(date?: Date): string {
  return getISTDateParts(date).formattedDate;
}

/**
 * Returns formatted time in Indian Standard Time (Asia/Kolkata).
 * E.g. "12:52 PM IST"
 */
export function getCurrentISTTime(date?: Date): string {
  return getISTDateParts(date).formattedTime;
}

/**
 * Returns full generation timestamp for official exports.
 * E.g. "Generated: 05 Sept 2026 • 12:52 PM IST"
 */
export function getExportGeneratedTimestamp(date?: Date): string {
  return `Generated: ${getISTDateParts(date).fullTimestamp}`;
}

/**
 * Resolves academic year for a timetable:
 * - Preserves legitimate historical stored values (e.g. "2023 - 2024")
 * - Replaces obsolete hardcoded defaults ("2025 - 2026", "2024–2025", etc.) with the dynamic current academic year
 * - Automatically falls back to dynamic current academic year if missing/empty
 */
export function resolveTimetableAcademicYear(storedAcademicYear?: string, date?: Date): string {
  if (storedAcademicYear && storedAcademicYear.trim()) {
    const trimmed = storedAcademicYear.trim();
    // Detect and upgrade obsolete hardcoded template placeholders
    const obsoletePlaceholders = ['2025 - 2026', '2025-2026', '2024–2025', '2024-2025', '2024 - 2025'];
    if (!obsoletePlaceholders.includes(trimmed)) {
      return trimmed;
    }
  }
  return getCurrentEngineeringAcademicYear(date);
}

/**
 * Resolves semester type name (e.g. "ODD SEMESTER" or "EVEN SEMESTER")
 */
export function resolveSemesterType(storedSemester?: string, date?: Date): string {
  if (storedSemester) {
    const semNum = parseInt(storedSemester, 10);
    if (!isNaN(semNum)) {
      return semNum % 2 !== 0 ? 'ODD SEMESTER' : 'EVEN SEMESTER';
    }
  }
  return getISTDateParts(date).semesterName;
}

/**
 * Resolves the institutional effective date (e.g. "15.07.2026")
 */
export function resolveEffectiveDate(date?: Date): string {
  return getISTDateParts(date).effectiveDate;
}
