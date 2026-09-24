import { Timetable, Subject, StaffProfile } from '@/types/timetable';
import { resolveTimetableAcademicYear, resolveSemesterType, getExportGeneratedTimestamp } from '@/utils/dateUtils';

export const periodDefinitions = [
  { slotIndex: 0, label: 'Period 1', time: '09:10 - 10:00', type: 'CLASS' },
  { slotIndex: 1, label: 'Period 2', time: '10:00 - 10:50', type: 'CLASS' },
  { slotIndex: 2, label: 'Break', time: '10:50 - 11:10', type: 'BREAK' },
  { slotIndex: 3, label: 'Period 3', time: '11:10 - 12:00', type: 'CLASS' },
  { slotIndex: 4, label: 'Period 4', time: '12:00 - 12:50', type: 'CLASS' },
  { slotIndex: 5, label: 'Lunch', time: '12:50 - 01:40', type: 'LUNCH' },
  { slotIndex: 6, label: 'Period 5', time: '01:40 - 02:30', type: 'CLASS' },
  { slotIndex: 7, label: 'Period 6', time: '02:30 - 03:20', type: 'CLASS' },
  { slotIndex: 8, label: 'Period 7', time: '03:20 - 04:20', type: 'CLASS' },
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Generates an isolated, self-contained printable HTML document and triggers native browser printing
 * via a hidden iframe to guarantee 100% iframe compatibility in sandboxed preview containers.
 */
export const printTimetable = (
  timetable: Timetable,
  subjects: Subject[] = [],
  staff: StaffProfile[] = []
): void => {
  const staffLookup = new Map<string, string>();
  staff.forEach(s => staffLookup.set(s.staffCode, s.name));

  const subjectLookup = new Map<string, Subject>();
  subjects.forEach(s => subjectLookup.set(s.subjectCode, s));

  // Extract unique subjects in this timetable
  const uniqueSubjectCodes = Array.from(
    new Set(
      timetable.entries
        .filter(e => e.subjectCode && e.subjectCode !== 'BREAK' && e.subjectCode !== 'LUNCH')
        .map(e => e.subjectCode!)
    )
  );

  const getSlotEntry = (day: string, slotIndex: number) => {
    return timetable.entries.find(e => e.day === day && e.slotIndex === slotIndex);
  };

  const tableRowsHtml = daysOfWeek
    .map(day => {
      const cellsHtml = periodDefinitions
        .map(p => {
          const isBreak = p.type === 'BREAK' || p.type === 'LUNCH';
          const isNaanMudhalvan = day === 'Wednesday' && p.slotIndex >= 6;
          const entry = getSlotEntry(day, p.slotIndex);

          if (isBreak) {
            return `
              <td class="break-cell">
                ${p.type === 'BREAK' ? 'TEA BREAK' : 'LUNCH BREAK'}
              </td>
            `;
          }

          if (isNaanMudhalvan) {
            return `
              <td class="special-cell">
                <div class="code font-bold">NM-301</div>
                <div class="sub-name">Naan Muthalvan</div>
                <div class="staff-code">[Special Session]</div>
              </td>
            `;
          }

          if (entry) {
            const isLab = entry.type === 'LAB';
            const staffName = entry.staffCode ? (staffLookup.get(entry.staffCode) || entry.staffCode) : '';
            return `
              <td class="class-cell ${isLab ? 'lab-cell' : ''}">
                <div class="code font-bold">${entry.subjectCode || '-'}</div>
                <div class="sub-name" style="font-size: 10px; font-weight: 500;">${entry.subjectName || ''}</div>
                <div class="staff-code" style="font-weight: 600;">${entry.staffCode ? `(${entry.staffCode})` : ''}</div>
                ${entry.roomNumber ? `<div class="room-tag">${entry.roomNumber}</div>` : ''}
              </td>
            `;
          }

          return `<td class="empty-cell">-</td>`;
        })
        .join('');

      return `
        <tr>
          <td class="day-cell">${day}</td>
          ${cellsHtml}
        </tr>
      `;
    })
    .join('');

  const allocationRowsHtml = uniqueSubjectCodes
    .map(code => {
      const sub = subjectLookup.get(code);
      const subName = sub?.subjectName || (code === 'NM101' ? 'Naan Mudhalvan Skill Training' : code);
      const staffCode = sub?.assignedStaff?.[0] || '-';
      const staffName = staffLookup.get(staffCode) || 'Assigned Faculty';
      const hours = sub?.weeklyHours || (sub?.type === 'LAB' ? 2 : 4);
      const type = sub?.type || 'THEORY';

      return `
        <tr>
          <td class="border px-2 py-1 font-mono font-bold">${code}</td>
          <td class="border px-2 py-1">${subName}</td>
          <td class="border px-2 py-1">${type}</td>
          <td class="border px-2 py-1 font-bold">${hours} hrs</td>
          <td class="border px-2 py-1">${staffName} <span class="font-mono text-gray-600">(${staffCode})</span></td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NCE Timetable - ${timetable.department} Year ${timetable.year} Sem ${timetable.semester}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #ffffff;
      color: #000000;
      padding: 10px;
      font-size: 11px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .college-name {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .affiliation {
      font-size: 10px;
      color: #333;
      font-weight: 600;
    }
    .dept-badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 10px;
      border: 1.5px solid #000;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      background: #f8f9fa;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      border: 1px solid #000;
      padding: 4px 8px;
      margin-bottom: 8px;
      background: #fdfdfd;
      font-size: 10.5px;
    }
    table.grid-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      text-align: center;
      margin-bottom: 10px;
      table-layout: fixed;
    }
    table.grid-table th {
      border: 1px solid #000;
      background: #e9ecef;
      padding: 4px 2px;
      font-size: 10px;
      font-weight: 800;
    }
    table.grid-table th .time {
      font-size: 8.5px;
      font-weight: normal;
      color: #333;
      font-family: monospace;
    }
    table.grid-table td {
      border: 1px solid #000;
      padding: 4px 2px;
      height: 38px;
      vertical-align: middle;
    }
    .day-cell {
      font-weight: bold;
      background: #f1f3f5;
      width: 75px;
      font-size: 11px;
    }
    .break-cell {
      background: #f8f9fa;
      color: #495057;
      font-weight: bold;
      font-size: 8.5px;
      letter-spacing: 0.5px;
      width: 48px;
    }
    .special-cell {
      background: #fff3bf;
      color: #664d03;
    }
    .lab-cell {
      background: #e7f5ff;
    }
    .code {
      font-size: 10.5px;
      font-weight: 800;
      line-height: 1.1;
    }
    .staff-code {
      font-size: 8.5px;
      color: #333;
      font-family: monospace;
      margin-top: 1px;
    }
    .room-tag {
      font-size: 8px;
      color: #555;
      font-style: italic;
    }
    .empty-cell {
      color: #adb5bd;
    }
    .legend-section {
      margin-top: 6px;
      border: 1px solid #000;
      padding: 6px;
    }
    .legend-title {
      font-weight: bold;
      font-size: 10.5px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    table.legend-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    table.legend-table th {
      background: #f1f3f5;
      border: 1px solid #ccc;
      padding: 2px 4px;
      text-align: left;
      font-weight: bold;
    }
    table.legend-table td {
      border: 1px solid #ccc;
      padding: 2px 4px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      padding: 0 20px;
      font-size: 10px;
      font-weight: bold;
    }
    .sig-block {
      text-align: center;
      width: 150px;
      border-top: 1px dashed #000;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="college-name">National College of Engineering</div>
    <div class="affiliation">Approved by AICTE, Affiliated to Anna University, Chennai • Maruthakulam, Tirunelveli - 627 151</div>
    <div class="dept-badge">Department of ${timetable.department} — Class Timetable</div>
  </div>

  <div class="meta-bar">
    <div><strong>Academic Year:</strong> ${resolveTimetableAcademicYear(timetable.academicYear)} (${resolveSemesterType(timetable.semester)})</div>
    <div><strong>Class:</strong> Year ${timetable.year} / Semester ${timetable.semester}</div>
    <div><strong>Status:</strong> ${timetable.status} (v${timetable.version || 1})</div>
    <div><strong>Working Hours:</strong> 09:10 AM – 04:20 PM</div>
  </div>

  <table class="grid-table">
    <thead>
      <tr>
        <th>Day / Period</th>
        ${periodDefinitions
          .map(
            p => `<th>
              <div>${p.label}</div>
              <div class="time">${p.time}</div>
            </th>`
          )
          .join('')}
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="legend-section">
    <div class="legend-title">Subject & Faculty Allocation Key</div>
    <table class="legend-table">
      <thead>
        <tr>
          <th style="width: 12%;">Subject Code</th>
          <th style="width: 38%;">Course Title</th>
          <th style="width: 10%;">Type</th>
          <th style="width: 10%;">Weekly Hrs</th>
          <th style="width: 30%;">Faculty In-Charge</th>
        </tr>
      </thead>
      <tbody>
        ${allocationRowsHtml}
      </tbody>
    </table>
  </div>

  <div class="signatures">
    <div class="sig-block">Timetable Coordinator</div>
    <div class="sig-block">Class Advisor</div>
    <div class="sig-block">Head of Department</div>
    <div class="sig-block">Principal</div>
  </div>

  <div style="margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 9px; font-family: monospace; color: #666;">
    <span>NCE TIMECRAFT SCHEDULING ENGINE • OFFICIAL PRINT</span>
    <span>${getExportGeneratedTimestamp()}</span>
  </div>
</body>
</html>
  `;

  // Create an invisible iframe to host the print preview
  let iframe = document.getElementById('nce-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'nce-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.print()', e);
        window.print();
      }
    }, 400);
  } else {
    window.print();
  }
};
