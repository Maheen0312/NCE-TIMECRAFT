import React, { forwardRef } from 'react';
import { 
  Timetable, 
  Subject, 
  StaffProfile, 
  Room, 
  TimetableEntry 
} from '@/types/timetable';
import { 
  MASTER_PERIOD_DEFINITIONS, 
  WORKING_DAYS, 
  getStaffNameByCode, 
  getSubjectNameByCode 
} from '@/config/timetableConfig';
import { 
  resolveTimetableAcademicYear, 
  resolveSemesterType, 
  resolveEffectiveDate, 
  getExportGeneratedTimestamp 
} from '@/utils/dateUtils';
import { CollegeLogo } from '@/components/common/CollegeLogo';
import { 
  Lock, 
  BookOpen, 
  FlaskConical, 
  User, 
  MapPin, 
  Coffee, 
  Utensils, 
  Calendar, 
  CheckCircle2, 
  GraduationCap 
} from 'lucide-react';

interface QuickImageExportContainerProps {
  timetable: Timetable | null;
  subjects?: Subject[];
  staff?: StaffProfile[];
  rooms?: Room[];
  exportTimestamp?: string;
}

export const QuickImageExportContainer = forwardRef<HTMLDivElement, QuickImageExportContainerProps>(
  ({ timetable, subjects = [], staff = [], rooms = [], exportTimestamp }, ref) => {
    if (!timetable) return null;

    // Helper to find slot entry
    const getSlotEntry = (day: string, slotIndex: number): TimetableEntry | undefined => {
      return timetable.entries.find(e => e.day === day && e.slotIndex === slotIndex);
    };

    // Helper to get faculty display name
    const resolveStaffName = (staffCode?: string, fallbackName?: string): string => {
      if (!staffCode) return fallbackName || 'To Be Announced';
      const staffMember = staff.find(s => s.staffCode === staffCode);
      if (staffMember?.name) return staffMember.name;
      return fallbackName || getStaffNameByCode(staffCode) || staffCode;
    };

    // Helper to get subject display name
    const resolveSubjectName = (subjectCode?: string, fallbackName?: string): string => {
      if (!subjectCode) return fallbackName || 'Class';
      const subj = subjects.find(s => s.subjectCode === subjectCode);
      if (subj?.subjectName) return subj.subjectName;
      return fallbackName || getSubjectNameByCode(subjectCode) || subjectCode;
    };

    // Pre-calculate unique subjects present in the timetable for the Key/Legend
    const uniqueSubjectCodes = Array.from(
      new Set(
        timetable.entries
          .filter(e => e.type === 'THEORY' || e.type === 'LAB')
          .map(e => e.subjectCode)
      )
    ).filter(Boolean);

    const legendEntries = uniqueSubjectCodes.map(code => {
      const entry = timetable.entries.find(e => e.subjectCode === code);
      const subj = subjects.find(s => s.subjectCode === code);
      const staffCode = entry?.staffCode || subj?.assignedStaff?.[0] || '';
      const staffName = resolveStaffName(staffCode, entry?.staffName);
      const subjectName = resolveSubjectName(code, entry?.subjectName);
      const isLab = entry?.type === 'LAB' || subj?.type === 'LAB';
      const roomNum = entry?.roomNumber || (isLab ? 'CSE Lab' : ((timetable as any).roomNumber || 'CSE-101'));
      
      const weeklyHours = timetable.entries.filter(e => e.subjectCode === code).length;

      return {
        code,
        name: subjectName,
        isLab,
        staffCode,
        staffName,
        room: roomNum,
        hours: weeklyHours || subj?.weeklyHours || (isLab ? 2 : 4),
      };
    });

    return (
      <div
        ref={ref}
        id="quick-image-export-node"
        className="w-[1440px] bg-white text-slate-900 p-8 shadow-none font-sans select-none border-2 border-slate-300"
        style={{
          boxSizing: 'border-box',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Top Header: Institutional Branding & Metadata */}
        <div className="flex items-center justify-between border-b-2 border-[#002B7F] pb-4 mb-4">
          {/* Logo & College Identification */}
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <CollegeLogo size={90} variant="full" />
            </div>
            <div>
              <div className="text-2xl font-black uppercase tracking-wider text-[#002B7F] font-serif leading-tight">
                Nellai College of Engineering
              </div>
              <div className="text-xs font-semibold text-slate-700 tracking-wide mt-0.5">
                (Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai)
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Maruthakulam, Nanguneri Taluk, Tirunelveli - 627 151, Tamil Nadu • ISO 9001:2015 Certified
              </div>
            </div>
          </div>

          {/* Department & Academic Banner */}
          <div className="text-right flex flex-col items-end">
            <div className="inline-block px-4 py-1 bg-[#002B7F] text-white text-xs font-extrabold uppercase tracking-widest rounded-sm mb-1">
              Department of {timetable.department || 'Computer Science & Engineering'}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
              <span>ACADEMIC YEAR: {resolveTimetableAcademicYear(timetable.academicYear)}</span>
              <span className="text-emerald-700 font-extrabold">• {resolveSemesterType(timetable.semester)}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Effective Date: {resolveEffectiveDate()} • Verified Master Schedule
            </div>
          </div>
        </div>

        {/* Timetable Sub-Header Strip */}
        <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-300 p-2.5 text-xs font-semibold mb-4 rounded-sm">
          <div>
            <span className="text-slate-500 font-normal">Degree & Branch:</span>{' '}
            <span className="font-extrabold text-slate-900">B.E. - {timetable.department || 'CSE'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-normal">Year / Semester / Section:</span>{' '}
            <span className="font-extrabold text-slate-900">
              {timetable.year || 'III'} / {timetable.semester || '5'} / {(timetable as any).section || 'A'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-normal">Classroom / Hall:</span>{' '}
            <span className="font-extrabold text-slate-900">{(timetable as any).roomNumber || 'CSE-101'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-normal">Timetable Status:</span>{' '}
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              {timetable.status || 'PUBLISHED'} • v{timetable.version || 1}
            </span>
          </div>
        </div>

        {/* Main 5-Day × 7-Period Timetable Grid */}
        <div className="border border-slate-400 mb-4 bg-white overflow-hidden rounded-sm">
          <table className="w-full border-collapse table-fixed text-center">
            {/* Column Width Definitions */}
            <colgroup>
              <col style={{ width: '90px' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '42px' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '42px' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>

            {/* Table Header */}
            <thead>
              <tr className="bg-[#002B7F] text-white font-bold text-xs border-b border-slate-400">
                <th className="p-2 border-r border-blue-900/60 uppercase tracking-wider text-[11px]">
                  Day / Period
                </th>
                <th className="p-2 border-r border-blue-900/60">
                  <div className="font-black text-sm">P1</div>
                  <div className="text-[10px] font-mono opacity-90 font-normal">09:10 - 10:00</div>
                </th>
                <th className="p-2 border-r border-blue-900/60">
                  <div className="font-black text-sm">P2</div>
                  <div className="text-[10px] font-mono opacity-90 font-normal">10:00 - 10:50</div>
                </th>
                <th className="p-1 border-r border-blue-900/60 bg-amber-100 text-amber-950 text-[10px] font-black w-10">
                  <div className="flex flex-col items-center justify-center py-1">
                    <Coffee className="w-3.5 h-3.5 text-amber-800 mb-0.5" />
                    <span className="[writing-mode:vertical-rl] rotate-180 uppercase tracking-tighter">
                      Tea Break (10:50-11:10)
                    </span>
                  </div>
                </th>
                <th className="p-2 border-r border-blue-900/60">
                  <div className="font-black text-sm">P3</div>
                  <div className="text-[10px] font-mono opacity-90 font-normal">11:10 - 12:00</div>
                </th>
                <th className="p-2 border-r border-blue-900/60">
                  <div className="font-black text-sm">P4</div>
                  <div className="text-[10px] font-mono opacity-90 font-normal">12:00 - 12:50</div>
                </th>
                <th className="p-1 border-r border-blue-900/60 bg-amber-100 text-amber-950 text-[10px] font-black w-10">
                  <div className="flex flex-col items-center justify-center py-1">
                    <Utensils className="w-3.5 h-3.5 text-amber-800 mb-0.5" />
                    <span className="[writing-mode:vertical-rl] rotate-180 uppercase tracking-tighter">
                      Lunch Break (12:50-01:40)
                    </span>
                  </div>
                </th>
                <th className="p-2 border-r border-blue-900/60">
                  <div className="font-black text-sm">P5</div>
                  <div className="text-[10px] font-mono opacity-90 font-normal">01:40 - 02:30</div>
                </th>
                <th className="p-2 border-r border-blue-900/60">
                  <div className="font-black text-sm">P6</div>
                  <div className="text-[10px] font-mono opacity-90 font-normal">02:30 - 03:20</div>
                </th>
                <th className="p-2">
                  <div className="font-black text-sm">P7</div>
                  <div className="text-[10px] font-mono opacity-90 font-normal">03:20 - 04:20</div>
                </th>
              </tr>
            </thead>

            {/* Table Body (All 5 Days) */}
            <tbody className="divide-y divide-slate-300">
              {WORKING_DAYS.map((day) => {
                const p1 = getSlotEntry(day, 0);
                const p2 = getSlotEntry(day, 1);
                const p3 = getSlotEntry(day, 3);
                const p4 = getSlotEntry(day, 4);
                const p5 = getSlotEntry(day, 6);
                const p6 = getSlotEntry(day, 7);
                const p7 = getSlotEntry(day, 8);

                const isWedNM = day === 'Wednesday';
                const isMergedLab = p6 && p7 && p6.type === 'LAB' && p6.subjectCode === p7.subjectCode;

                const renderClassCell = (entry?: TimetableEntry, duration = '50 Mins') => {
                  if (!entry) {
                    return (
                      <div className="h-full min-h-[92px] rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-2 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-xs font-semibold">Self Study</span>
                        <span className="text-[10px] text-slate-400 font-mono">Library / Lab</span>
                      </div>
                    );
                  }

                  const isLab = entry.type === 'LAB';
                  const staffDisplayName = resolveStaffName(entry.staffCode, entry.staffName);
                  const subjectDisplayName = resolveSubjectName(entry.subjectCode, entry.subjectName);

                  return (
                    <div
                      className={`h-full min-h-[92px] rounded-lg border p-2 flex flex-col justify-between text-left transition-all ${
                        isLab
                          ? 'bg-purple-50/95 border-purple-300 text-purple-950'
                          : 'bg-blue-50/90 border-blue-200 text-blue-950'
                      }`}
                    >
                      {/* Top Code & Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {isLab ? (
                            <FlaskConical className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          )}
                          <span className="font-mono font-black text-xs tracking-tight">
                            {entry.subjectCode}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase tracking-wider ${
                            isLab
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-blue-100 text-blue-900 border-blue-200'
                          }`}
                        >
                          {isLab ? 'LAB' : 'THEORY'}
                        </span>
                      </div>

                      {/* Subject Name */}
                      <div className="font-black text-xs leading-tight line-clamp-2 my-0.5">
                        {subjectDisplayName}
                      </div>

                      {/* Faculty & Room */}
                      <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1 font-bold text-slate-800 truncate max-w-[85px]">
                          <User className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{staffDisplayName}</span>
                        </div>
                        {entry.roomNumber && (
                          <div className="flex items-center gap-0.5 font-mono font-bold bg-white/90 px-1 py-0.5 rounded border border-slate-200 text-slate-700 shrink-0">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            <span>{entry.roomNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <tr key={day} className="h-28">
                    {/* Day Column */}
                    <td className="font-extrabold bg-slate-100 border-r border-slate-300 text-[#002B7F] text-xs p-2 align-middle">
                      <div className="text-sm font-black uppercase tracking-wider">
                        {day.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {day}
                      </div>
                    </td>

                    {/* Period 1 */}
                    <td className="border-r border-slate-300 p-1 align-middle">
                      {renderClassCell(p1)}
                    </td>

                    {/* Period 2 */}
                    <td className="border-r border-slate-300 p-1 align-middle">
                      {renderClassCell(p2)}
                    </td>

                    {/* Tea Break */}
                    <td className="bg-amber-50/70 border-r border-slate-300 p-0 text-[9px] font-black text-amber-900 select-none align-middle">
                      <div className="flex flex-col items-center justify-center gap-1 py-2">
                        <Coffee className="w-3 h-3 text-amber-700" />
                        <span className="[writing-mode:vertical-rl] rotate-180 uppercase tracking-widest font-mono">
                          TEA
                        </span>
                      </div>
                    </td>

                    {/* Period 3 */}
                    <td className="border-r border-slate-300 p-1 align-middle">
                      {renderClassCell(p3)}
                    </td>

                    {/* Period 4 */}
                    <td className="border-r border-slate-300 p-1 align-middle">
                      {renderClassCell(p4)}
                    </td>

                    {/* Lunch Break */}
                    <td className="bg-amber-50/70 border-r border-slate-300 p-0 text-[9px] font-black text-amber-900 select-none align-middle">
                      <div className="flex flex-col items-center justify-center gap-1 py-2">
                        <Utensils className="w-3 h-3 text-amber-700" />
                        <span className="[writing-mode:vertical-rl] rotate-180 uppercase tracking-widest font-mono">
                          LUNCH
                        </span>
                      </div>
                    </td>

                    {/* Wednesday Afternoon: Naan Muthalvan 3-Period Lock Block */}
                    {isWedNM ? (
                      <td colSpan={3} className="p-1.5 bg-amber-50/90 border-l border-slate-300 align-middle">
                        <div className="h-full min-h-[92px] rounded-lg border border-amber-400 bg-amber-50 p-2.5 flex flex-col justify-between text-left text-amber-950 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                              <div className="p-1 bg-amber-200 rounded text-amber-900">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-mono font-black text-sm">NM-301 • NAAN MUTHALVAN</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-300 uppercase tracking-wider">
                              State Mandatory Skill Initiative
                            </span>
                          </div>

                          <div className="my-1">
                            <div className="font-black text-xs text-amber-950">
                              Mandatory State Employability & Emerging Technology Training
                            </div>
                            <div className="text-[11px] text-amber-800 font-semibold">
                              Period 5, 6 & 7 (01:40 PM - 04:20 PM) • Entire Wednesday Afternoon Locked Block
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-800 pt-1 border-t border-amber-200">
                            <span>No Regular Theory / Lab Classes Allowed</span>
                            <span>Institutional Employability Program</span>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        {/* Period 5 */}
                        <td className="border-r border-slate-300 p-1 align-middle">
                          {renderClassCell(p5)}
                        </td>

                        {/* Consecutive Lab Merging (Period 6 & Period 7) */}
                        {isMergedLab ? (
                          <td colSpan={2} className="p-1 bg-purple-50/90 border-l border-slate-300 align-middle">
                            <div className="h-full min-h-[92px] rounded-lg border border-purple-300 bg-purple-50 p-2 flex flex-col justify-between text-left text-purple-950">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <FlaskConical className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                  <span className="font-mono font-black text-xs">
                                    {p6.subjectCode}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-200 text-purple-950 border border-purple-300">
                                  2-HOUR PRACTICAL LAB
                                </span>
                              </div>

                              <div className="font-black text-xs my-0.5">
                                {resolveSubjectName(p6.subjectCode, p6.subjectName)}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-purple-200 text-[10px]">
                                <div className="flex items-center gap-1 font-bold text-purple-900 truncate">
                                  <User className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span>{resolveStaffName(p6.staffCode, p6.staffName)} ({p6.staffCode})</span>
                                </div>
                                <div className="flex items-center gap-1 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-purple-200 text-purple-900">
                                  <MapPin className="w-2.5 h-2.5 text-purple-500" />
                                  <span>{p6.roomNumber || 'CSE Lab'}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        ) : (
                          <>
                            {/* Period 6 */}
                            <td className="border-r border-slate-300 p-1 align-middle">
                              {renderClassCell(p6)}
                            </td>
                            {/* Period 7 */}
                            <td className="p-1 align-middle">
                              {renderClassCell(p7)}
                            </td>
                          </>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Subject & Faculty Allocation Matrix Key */}
        {legendEntries.length > 0 && (
          <div className="mb-4 bg-slate-50 border border-slate-300 p-3 rounded-sm">
            <div className="text-xs font-black uppercase text-[#002B7F] tracking-wide mb-2 flex items-center justify-between">
              <span>Subject & Faculty Allocation Key (Reference Matrix):</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">
                Total Allocated Subjects: {legendEntries.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              {legendEntries.map(entry => (
                <div 
                  key={entry.code}
                  className="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-200 text-slate-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-black text-xs text-[#002B7F] shrink-0">
                      {entry.code}
                    </span>
                    <span className="font-bold truncate text-[11px]">
                      {entry.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2 text-[11px] font-mono">
                    <span className="text-slate-600 font-bold">
                      {entry.staffName} ({entry.staffCode})
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700 bg-slate-100 px-1 py-0.2 rounded font-bold">
                      {entry.room}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Institutional Signatures & Verification Footer */}
        <div className="flex items-end justify-between pt-6 border-t-2 border-slate-300 text-xs font-bold text-slate-800">
          <div className="text-center w-64">
            <div className="border-b border-dashed border-slate-400 pb-1 mb-1 font-mono text-[11px] text-slate-400">
              Verified by Coordinator
            </div>
            <div className="uppercase tracking-wide font-extrabold text-[#002B7F]">
              Time Table Coordinator
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Department of CSE</div>
          </div>

          <div className="text-center w-64">
            <div className="border-b border-dashed border-slate-400 pb-1 mb-1 font-mono text-[11px] text-slate-400">
              Approved by HOD
            </div>
            <div className="uppercase tracking-wide font-extrabold text-[#002B7F]">
              Head of the Department
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Department of CSE</div>
          </div>

          <div className="text-center w-64">
            <div className="border-b border-dashed border-slate-400 pb-1 mb-1 font-mono text-[11px] text-slate-400">
              Official Institutional Seal
            </div>
            <div className="uppercase tracking-wide font-extrabold text-[#002B7F]">
              Principal
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Nellai College of Engineering</div>
          </div>
        </div>

        {/* Subtle Watermark Strip */}
        <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>NCE TIMECRAFT SCHEDULING ENGINE v4.0 • HIGH-RESOLUTION RETINA IMAGE EXPORT</span>
          <span>{exportTimestamp || getExportGeneratedTimestamp()}</span>
        </div>
      </div>
    );
  }
);

QuickImageExportContainer.displayName = 'QuickImageExportContainer';
