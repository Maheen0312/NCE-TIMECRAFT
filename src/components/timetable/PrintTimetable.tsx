import React from 'react';
import { Timetable, Subject, StaffProfile } from '@/types/timetable';
import { MASTER_PERIOD_DEFINITIONS as periodDefinitions } from '@/config/timetableConfig';
import { resolveTimetableAcademicYear, getExportGeneratedTimestamp } from '@/utils/dateUtils';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface PrintTimetableProps {
  timetable: Timetable;
  subjects?: Subject[];
  staff?: StaffProfile[];
}

export const PrintTimetable: React.FC<PrintTimetableProps> = ({
  timetable,
  subjects = [],
  staff = [],
}) => {
  const getSlotEntry = (day: string, slotIndex: number) => {
    return timetable.entries.find((e) => e.day === day && e.slotIndex === slotIndex);
  };

  return (
    <div id="printable-timetable" className="p-8 bg-white text-black font-sans max-w-[1100px] mx-auto hidden print:block">
      {/* College Letterhead */}
      <div className="text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-xl font-black uppercase tracking-wider">
          NATIONAL COLLEGE OF ENGINEERING
        </h1>
        <p className="text-xs font-semibold text-gray-800">
          (Approved by AICTE, Affiliated to Anna University, Chennai)
        </p>
        <p className="text-xs font-medium text-gray-700">
          Maruthakulam, Tirunelveli - 627 151, Tamil Nadu
        </p>
        <div className="mt-3 inline-block px-4 py-1 border border-black font-bold text-sm uppercase">
          DEPARTMENT OF {timetable.department.toUpperCase()} — CLASS TIME TABLE
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-4 gap-2 text-xs font-medium border border-black p-2 mb-4">
        <div><strong>Academic Year:</strong> {resolveTimetableAcademicYear(timetable.academicYear)}</div>
        <div><strong>Year / Sem:</strong> Year {timetable.year} / Sem {timetable.semester}</div>
        <div><strong>Status:</strong> {timetable.status}</div>
        <div><strong>Version:</strong> v{timetable.version || 1}</div>
      </div>

      {/* Grid Table */}
      <table className="w-full border-collapse border border-black text-center text-xs mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 w-20">Day / Period</th>
            {periodDefinitions.map((p) => (
              <th key={p.slotIndex} className="border border-black p-1.5 text-[11px]">
                <div className="font-bold">{p.label}</div>
                <div className="text-[9px] font-mono">{p.time}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daysOfWeek.map((day) => (
            <tr key={day} className="h-14">
              <td className="border border-black p-2 font-bold bg-gray-50">{day}</td>
              {periodDefinitions.map((p) => {
                const isBreak = p.type === 'BREAK' || p.type === 'LUNCH';
                const isNaanMudhalvan = day === 'Wednesday' && p.slotIndex >= 6;
                const entry = getSlotEntry(day, p.slotIndex);

                if (isBreak) {
                  return (
                    <td key={p.slotIndex} className="border border-black bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                      {p.type === 'BREAK' ? 'TEA' : 'LUNCH'}
                    </td>
                  );
                }

                if (isNaanMudhalvan) {
                  return (
                    <td key={p.slotIndex} className="border border-black bg-gray-100 text-[10px] font-bold p-1">
                      <div className="text-black font-bold">NM-301</div>
                      <div className="text-[9px] text-gray-700">Naan Mudhalvan</div>
                    </td>
                  );
                }

                return (
                  <td key={p.slotIndex} className="border border-black p-1 align-middle">
                    {entry ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-black text-xs">{entry.subjectCode}</span>
                        <span className="text-[9px] text-gray-700 font-mono">
                          [{entry.staffCode}] {entry.roomNumber ? `• ${entry.roomNumber}` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Faculty & Course Allocation Legend */}
      <div className="text-xs mb-8">
        <h4 className="font-bold border-b border-black pb-1 mb-2 uppercase">
          Subject Allocation & Faculty In-Charge
        </h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          {subjects.map((s, idx) => (
            <div key={s.id || `${s.subjectCode}_${idx}`} className="flex justify-between border-b border-gray-200 py-0.5">
              <span><strong>{s.subjectCode}</strong>: {s.subjectName}</span>
              <span className="font-mono">[{s.assignedStaff?.join(', ') || 'TBA'}]</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Blocks */}
      <div className="grid grid-cols-3 text-center text-xs font-bold pt-12">
        <div>Time Table Coordinator</div>
        <div>Head of Department</div>
        <div>Principal</div>
      </div>

      {/* Verification Timestamp Watermark */}
      <div className="mt-8 pt-2 border-t border-gray-300 flex justify-between text-[9px] font-mono text-gray-500">
        <span>NCE TIMECRAFT ACADEMIC PRINT</span>
        <span>{getExportGeneratedTimestamp()}</span>
      </div>
    </div>
  );
};
