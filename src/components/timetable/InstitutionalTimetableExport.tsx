import React, { useRef, useState, useEffect } from 'react';
import { Timetable } from '@/types/timetable';
import { toPng, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText,
  FileDown,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CollegeLogo } from '@/components/common/CollegeLogo';
import { 
  WORKING_DAYS, 
  getStaffNameByCode
} from '@/config/timetableConfig';
import { 
  resolveTimetableAcademicYear, 
  resolveSemesterType, 
  resolveEffectiveDate, 
  getExportGeneratedTimestamp,
  syncWithServerTime
} from '@/utils/dateUtils';

interface InstitutionalTimetableExportProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: Timetable;
}

export const InstitutionalTimetableExport: React.FC<InstitutionalTimetableExportProps> = ({
  isOpen,
  onClose,
  timetable,
}) => {
  const exportNodeRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolution, setResolution] = useState<number>(3); // 3x Retina default for razor sharpness
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeSubjectKey, setIncludeSubjectKey] = useState(true);

  // Dynamic engineering academic year and IST date metadata
  const resolvedAcademicYear = resolveTimetableAcademicYear(timetable.academicYear);
  const resolvedSemester = resolveSemesterType(timetable.semester);
  const resolvedEffectiveDate = resolveEffectiveDate();
  const [liveTimestamp, setLiveTimestamp] = useState(() => getExportGeneratedTimestamp());

  useEffect(() => {
    if (isOpen) {
      syncWithServerTime().then(() => {
        setLiveTimestamp(getExportGeneratedTimestamp());
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract unique subjects and mapped faculty
  const subjectMap = new Map<string, {
    code: string;
    name: string;
    type: string;
    staffCode: string;
    staffName: string;
    room: string;
    count: number;
  }>();

  timetable.entries.forEach(entry => {
    if (!entry.subjectCode) return;
    const existing = subjectMap.get(entry.subjectCode);
    if (existing) {
      existing.count += 1;
    } else {
      subjectMap.set(entry.subjectCode, {
        code: entry.subjectCode,
        name: entry.subjectName || entry.subjectCode,
        type: entry.type || 'THEORY',
        staffCode: entry.staffCode || 'TBA',
        staffName: entry.staffName || getStaffNameByCode(entry.staffCode) || entry.staffCode || 'Faculty In-Charge',
        room: entry.roomNumber || 'CSE-101',
        count: 1,
      });
    }
  });

  const subjectList = Array.from(subjectMap.values());

  const getSlotEntry = (day: string, slotIndex: number) => {
    return timetable.entries.find(e => e.day === day && e.slotIndex === slotIndex);
  };

  // Export as High-Quality Print-Ready PDF (A4 Landscape)
  const handleExportPDF = async () => {
    if (!exportNodeRef.current) {
      toast.error('Timetable content container not found.');
      return;
    }

    try {
      setIsExporting(true);
      toast.loading('Generating high-definition official PDF...', { id: 'pdf-toast' });

      // Refresh authoritative timestamp right at export time
      await syncWithServerTime();
      setLiveTimestamp(getExportGeneratedTimestamp());
      await new Promise(resolve => setTimeout(resolve, 80));

      // Ensure fonts are ready before taking snapshot
      if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Render high-res crisp PNG
      const dataUrl = await toPng(exportNodeRef.current, {
        quality: 1.0,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      // Initialize A4 Landscape jsPDF instance
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
      const margin = 8; // 8mm border margins
      const printableWidth = pageWidth - margin * 2; // 281mm
      const printableHeight = pageHeight - margin * 2; // 194mm

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgRatio = imgProps.width / imgProps.height;

      let renderWidth = printableWidth;
      let renderHeight = printableWidth / imgRatio;

      if (renderHeight > printableHeight) {
        renderHeight = printableHeight;
        renderWidth = printableHeight * imgRatio;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

      const sanitizedName = (
        timetable.name || `${timetable.department || 'Schedule'}_Year_${timetable.year || '3'}`
      ).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `NCE_Timetable_${sanitizedName}_Official_HD.pdf`;

      pdf.save(filename);

      toast.success('High-Quality Official PDF downloaded successfully!', { id: 'pdf-toast' });
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      toast.error(err?.message || 'Failed to generate PDF. Please try again.', { id: 'pdf-toast' });
    } finally {
      setIsExporting(false);
    }
  };

  // Download High Definition PNG (up to 3x Retina)
  const handleDownloadHD = async () => {
    if (!exportNodeRef.current) return;
    try {
      setIsExporting(true);
      toast.loading(`Rendering ${resolution}x Ultra-HD Timetable Image...`, { id: 'export-toast' });

      // Refresh authoritative timestamp right at export time
      await syncWithServerTime();
      setLiveTimestamp(getExportGeneratedTimestamp());
      await new Promise(resolve => setTimeout(resolve, 80));
      
      const dataUrl = await toPng(exportNodeRef.current, {
        quality: 1.0,
        pixelRatio: resolution,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const link = document.createElement('a');
      const filename = `NCE_Timetable_${(timetable.name || 'Schedule').replace(/\s+/g, '_')}_HD_${resolution}x.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();

      toast.success('Ultra-HD Timetable PNG downloaded!', { id: 'export-toast' });
    } catch (err) {
      console.error('Failed to export HD image:', err);
      toast.error('Export failed. Please try exporting as PDF instead.', { id: 'export-toast' });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy to Clipboard
  const handleCopyToClipboard = async () => {
    if (!exportNodeRef.current) return;
    try {
      setIsExporting(true);
      toast.loading('Generating image for clipboard...', { id: 'clipboard-toast' });
      
      const blob = await toBlob(exportNodeRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        toast.success('Timetable image copied to clipboard!', { id: 'clipboard-toast' });
      } else {
        toast.error('Direct clipboard copy not supported by browser. Use Download instead.', { id: 'clipboard-toast' });
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast.error('Could not copy to clipboard', { id: 'clipboard-toast' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header & Controls */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-luna-dark-navy text-luna-light-cyan flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                Official Institutional Timetable
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                  Ready to Export
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                High-definition export with Anna University header, subject allocation matrix & official signatures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {/* Resolution Selector */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 border border-gray-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setResolution(2)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  resolution === 2 ? 'bg-white dark:bg-slate-700 text-blue-900 dark:text-cyan-300 shadow-xs' : 'text-gray-500'
                }`}
              >
                2x (HD)
              </button>
              <button
                onClick={() => setResolution(3)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  resolution === 3 ? 'bg-white dark:bg-slate-700 text-blue-900 dark:text-cyan-300 shadow-xs' : 'text-gray-500'
                }`}
              >
                3x (Ultra-HD)
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
              disabled={isExporting}
              className="text-xs font-semibold gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHD}
              disabled={isExporting}
              className="text-xs font-semibold gap-1.5"
              title="Download PNG image"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Download PNG ({resolution}x)</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-luna-dark-navy hover:bg-luna-deep-blue text-white text-xs font-bold gap-1.5 shadow-md cursor-pointer"
              title="Export complete timetable as high-quality print-ready PDF"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-cyan-300" />
              )}
              <span>Export as high-quality PDF</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-100 dark:bg-slate-950 flex justify-center">
          
          {/* Institutional Document Container for Export */}
          <div 
            ref={exportNodeRef}
            className="w-[1020px] bg-white text-gray-950 p-7 shadow-xl border border-gray-300 font-sans shrink-0 select-none text-left"
            style={{ minHeight: '650px' }}
          >
            {/* Top Institutional Header */}
            <div className="flex items-center justify-between border-b-2 border-luna-dark-navy pb-3 mb-3">
              {/* College Logo */}
              <div className="shrink-0 mr-4">
                <CollegeLogo size={85} variant="full" />
              </div>

              {/* Title Block */}
              <div className="flex-1 text-center">
                <h1 className="text-xl font-black uppercase tracking-wider text-[#002B7F] font-serif leading-tight">
                  Nellai College of Engineering
                </h1>
                <p className="text-[11px] font-semibold text-gray-700 tracking-wide mt-0.5">
                  (Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai)
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  Maruthakulam, Nanguneri Taluk, Tirunelveli - 627 151, Tamil Nadu
                </p>

                <div className="mt-2 inline-block px-4 py-0.5 bg-luna-dark-navy text-white text-[12px] font-extrabold uppercase tracking-widest rounded-sm">
                  Department of {timetable.department || 'Computer Science & Engineering'}
                </div>
              </div>

              {/* QR / Academic Tag */}
              <div className="text-right shrink-0 ml-4 font-mono text-[10px] text-gray-600">
                <div className="font-bold text-gray-900">ACADEMIC YEAR</div>
                <div className="font-extrabold text-gray-950">{resolvedAcademicYear}</div>
                <div className="text-emerald-700 font-extrabold mt-1">{resolvedSemester}</div>
                <div className="text-gray-400 text-[9px] mt-0.5">ISO 9001:2015</div>
              </div>
            </div>

            {/* Class Metadata Strip */}
            <div className="grid grid-cols-4 gap-2 bg-gray-50 border border-gray-200 p-2 text-[11px] font-semibold mb-3 rounded-sm">
              <div>
                <span className="text-gray-500">Degree & Branch:</span>{' '}
                <span className="font-bold text-gray-950">B.E. - {timetable.department || 'CSE'}</span>
              </div>
              <div>
                <span className="text-gray-500">Year / Sem / Sec:</span>{' '}
                <span className="font-bold text-gray-950">{timetable.year || 'III'} / {timetable.semester || '5'} / A</span>
              </div>
              <div>
                <span className="text-gray-500">Class Room:</span>{' '}
                <span className="font-bold text-gray-950">CSE-101</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Effective From:</span>{' '}
                <span className="font-bold text-gray-950">{resolvedEffectiveDate}</span>
              </div>
            </div>

            {/* Master Timetable Table Grid */}
            <div className="border border-gray-900 mb-4 overflow-x-auto">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-[#002B7F] text-white font-bold text-[11px] border-b border-gray-900">
                    <th className="p-1.5 border-r border-gray-600 w-16">DAY / PERIOD</th>
                    <th className="p-1.5 border-r border-gray-600">
                      <div>P1</div>
                      <div className="text-[9px] font-normal opacity-90">09:10 - 10:00</div>
                    </th>
                    <th className="p-1.5 border-r border-gray-600">
                      <div>P2</div>
                      <div className="text-[9px] font-normal opacity-90">10:00 - 10:50</div>
                    </th>
                    <th className="p-1 border-r border-gray-600 bg-amber-100 text-amber-950 text-[9px] w-6 [writing-mode:vertical-rl] rotate-180">
                      TEA BREAK (10:50-11:10)
                    </th>
                    <th className="p-1.5 border-r border-gray-600">
                      <div>P3</div>
                      <div className="text-[9px] font-normal opacity-90">11:10 - 12:00</div>
                    </th>
                    <th className="p-1.5 border-r border-gray-600">
                      <div>P4</div>
                      <div className="text-[9px] font-normal opacity-90">12:00 - 12:50</div>
                    </th>
                    <th className="p-1 border-r border-gray-600 bg-amber-100 text-amber-950 text-[9px] w-6 [writing-mode:vertical-rl] rotate-180">
                      LUNCH BREAK (12:50-01:40)
                    </th>
                    <th className="p-1.5 border-r border-gray-600">
                      <div>P5</div>
                      <div className="text-[9px] font-normal opacity-90">01:40 - 02:30</div>
                    </th>
                    <th className="p-1.5 border-r border-gray-600">
                      <div>P6</div>
                      <div className="text-[9px] font-normal opacity-90">02:30 - 03:20</div>
                    </th>
                    <th className="p-1.5">
                      <div>P7</div>
                      <div className="text-[9px] font-normal opacity-90">03:20 - 04:20</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {WORKING_DAYS.map((day) => {
                    // Precompute slots
                    const p1 = getSlotEntry(day, 0);
                    const p2 = getSlotEntry(day, 1);
                    const p3 = getSlotEntry(day, 3);
                    const p4 = getSlotEntry(day, 4);
                    const p5 = getSlotEntry(day, 6);
                    const p6 = getSlotEntry(day, 7);
                    const p7 = getSlotEntry(day, 8);

                    const isWedNM = day === 'Wednesday';
                    const isMergedLab = p6 && p7 && p6.type === 'LAB' && p6.subjectCode === p7.subjectCode;

                    return (
                      <tr key={day} className="h-16">
                        {/* Day Column */}
                        <td className="font-extrabold bg-gray-100 border-r border-gray-400 text-[#002B7F] text-xs">
                          {day.slice(0, 3).toUpperCase()}
                        </td>

                        {/* P1 */}
                        <td className="border-r border-gray-300 p-1 align-middle">
                          {p1 ? (
                            <div>
                              <div className="font-black text-xs text-gray-950">{p1.subjectCode}</div>
                              <div className="text-[9px] font-bold text-gray-600">({p1.staffCode || 'TBA'})</div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[10px]">-</span>
                          )}
                        </td>

                        {/* P2 */}
                        <td className="border-r border-gray-300 p-1 align-middle">
                          {p2 ? (
                            <div>
                              <div className="font-black text-xs text-gray-950">{p2.subjectCode}</div>
                              <div className="text-[9px] font-bold text-gray-600">({p2.staffCode || 'TBA'})</div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[10px]">-</span>
                          )}
                        </td>

                        {/* Tea Break */}
                        <td className="bg-amber-50/60 border-r border-gray-300 p-0 text-[8px] font-bold text-amber-900">
                          B
                        </td>

                        {/* P3 */}
                        <td className="border-r border-gray-300 p-1 align-middle">
                          {p3 ? (
                            <div>
                              <div className="font-black text-xs text-gray-950">{p3.subjectCode}</div>
                              <div className="text-[9px] font-bold text-gray-600">({p3.staffCode || 'TBA'})</div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[10px]">-</span>
                          )}
                        </td>

                        {/* P4 */}
                        <td className="border-r border-gray-300 p-1 align-middle">
                          {p4 ? (
                            <div>
                              <div className="font-black text-xs text-gray-950">{p4.subjectCode}</div>
                              <div className="text-[9px] font-bold text-gray-600">({p4.staffCode || 'TBA'})</div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[10px]">-</span>
                          )}
                        </td>

                        {/* Lunch Break */}
                        <td className="bg-amber-50/60 border-r border-gray-300 p-0 text-[8px] font-bold text-amber-900">
                          L
                        </td>

                        {/* Wednesday Naan Muthalvan Full Afternoon Block (P5, P6, P7) */}
                        {isWedNM ? (
                          <td colSpan={3} className="p-1 bg-amber-50/80 border-l border-gray-300 align-middle">
                            <div className="font-black text-xs text-amber-950">NM-301 • NAAN MUTHALVAN</div>
                            <div className="text-[9px] font-bold text-amber-800">Mandatory State Employability & Industry Training (P5, P6 & P7 • 01:40 - 04:20)</div>
                          </td>
                        ) : (
                          <>
                            {/* P5 */}
                            <td className="border-r border-gray-300 p-1 align-middle">
                              {p5 ? (
                                <div>
                                  <div className="font-black text-xs text-gray-950">{p5.subjectCode}</div>
                                  <div className="text-[9px] font-bold text-gray-600">({p5.staffCode || 'TBA'})</div>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-[10px]">-</span>
                              )}
                            </td>

                            {isMergedLab ? (
                              /* Merged Practical Lab 2-Period Block (P6 & P7) */
                              <td colSpan={2} className="p-1 bg-purple-50 border-l border-gray-300 align-middle">
                                <div className="font-black text-xs text-purple-950">{p6.subjectCode} - {p6.subjectName || 'LAB'}</div>
                                <div className="text-[9px] font-bold text-purple-800">Faculty: {p6.staffCode || 'TBA'} • {p6.roomNumber || 'LAB'}</div>
                              </td>
                            ) : (
                              <>
                                {/* P6 */}
                                <td className="border-r border-gray-300 p-1 align-middle">
                                  {p6 ? (
                                    <div>
                                      <div className="font-black text-xs text-gray-950">{p6.subjectCode}</div>
                                      <div className="text-[9px] font-bold text-gray-600">({p6.staffCode || 'TBA'})</div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 text-[10px]">-</span>
                                  )}
                                </td>
                                {/* P7 */}
                                <td className="p-1 align-middle">
                                  {p7 ? (
                                    <div>
                                      <div className="font-black text-xs text-gray-950">{p7.subjectCode}</div>
                                      <div className="text-[9px] font-bold text-gray-600">({p7.staffCode || 'TBA'})</div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 text-[10px]">-</span>
                                  )}
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

            {/* Subject & Faculty Allocation Key Legend Table */}
            {includeSubjectKey && subjectList.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-black uppercase text-[#002B7F] mb-1">
                  Subject & Faculty Allocation Key:
                </div>
                <table className="w-full border border-gray-300 text-[10px] text-left">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-gray-300 text-gray-800">
                      <th className="p-1 border-r border-gray-300 w-16">Code</th>
                      <th className="p-1 border-r border-gray-300">Subject Name</th>
                      <th className="p-1 border-r border-gray-300 w-16 text-center">Type</th>
                      <th className="p-1 border-r border-gray-300">Staff In-Charge</th>
                      <th className="p-1 w-20 text-center">Staff Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subjectList.map((sub, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="p-1 font-bold border-r border-gray-200">{sub.code}</td>
                        <td className="p-1 font-medium border-r border-gray-200">{sub.name}</td>
                        <td className="p-1 border-r border-gray-200 text-center">
                          <span className={`px-1 rounded font-bold text-[9px] ${sub.type === 'LAB' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'}`}>
                            {sub.type}
                          </span>
                        </td>
                        <td className="p-1 font-medium border-r border-gray-200">{sub.staffName}</td>
                        <td className="p-1 font-bold text-center">{sub.staffCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Institutional Signatures Block */}
            {includeSignatures && (
              <div className="grid grid-cols-4 gap-4 text-center pt-8 border-t border-gray-300 text-[11px] font-bold text-gray-800">
                <div className="space-y-1">
                  <div className="border-b border-dotted border-gray-400 pb-2"></div>
                  <div>Class Advisor</div>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-gray-400 pb-2"></div>
                  <div>Timetable Coordinator</div>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-gray-400 pb-2"></div>
                  <div>Head of Department</div>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-gray-400 pb-2"></div>
                  <div>Principal</div>
                </div>
              </div>
            )}

            {/* Verification Timestamp Watermark */}
            <div className="mt-6 pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-400 font-mono">
              <span>NCE TIMECRAFT SCHEDULING ENGINE • OFFICIAL INSTITUTIONAL ACADEMIC TIMETABLE</span>
              <span>{liveTimestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
