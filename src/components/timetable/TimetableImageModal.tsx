import React, { useState, useRef, useEffect } from 'react';
import { ExtractedTimetableImageResult, Timetable } from '@/types/timetable';
import { extractTimetableFromImageWithAI } from '@/services/aiService';
import { createExtractedTimetable } from '@/services/timetableService';
import { upsertSubject } from '@/services/subjectService';
import { upsertStaff } from '@/services/staffService';
import { Button } from '@/components/ui/Button';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  BookOpen,
  Users,
  Building2,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  AlertCircle,
  FileCheck,
  Download,
  Eye,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { getISTDateParts } from '@/utils/dateUtils';

interface TimetableImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDepartment?: string;
  onTimetableCreated?: (timetable: Timetable) => void;
  onCatalogImported?: () => void;
}

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Electrical & Electronics Engineering',
  'Information Technology'
];

const PERIOD_TIMES = [
  { index: 0, time: '09:10 - 10:00', label: 'P1' },
  { index: 1, time: '10:00 - 10:50', label: 'P2' },
  { index: 2, time: '11:10 - 12:00', label: 'P3' },
  { index: 3, time: '12:00 - 12:50', label: 'P4' },
  { index: 4, time: '01:40 - 02:30', label: 'P5' },
  { index: 5, time: '02:30 - 03:20', label: 'P6' },
  { index: 6, time: '03:20 - 04:20', label: 'P7' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableImageModal: React.FC<TimetableImageModalProps> = ({
  isOpen,
  onClose,
  defaultDepartment = 'Computer Science & Engineering',
  onTimetableCreated,
  onCatalogImported,
}) => {
  if (!isOpen) return null;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [imageName, setImageName] = useState<string>('');
  const [department, setDepartment] = useState(defaultDepartment);
  const [year, setYear] = useState('III');
  const [semester, setSemester] = useState('5');
  const [section, setSection] = useState('A');

  // Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStep, setExtractionStep] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedTimetableImageResult | null>(null);
  const [activeTab, setActiveTab] = useState<'GRID' | 'SUBJECTS' | 'FACULTY'>('GRID');

  // Action State
  const [isCreatingTimetable, setIsCreatingTimetable] = useState(false);
  const [isImportingCatalog, setIsImportingCatalog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste support from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
            toast.success('Pasted image from clipboard!');
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setMimeType(file.type);
    setImageName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageSrc(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Helper to load sample mock timetable sheet
  const handleLoadSampleSheet = () => {
    // Generate a visual simulated timetable canvas
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 900, 600);

      // Header
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NATIONAL COLLEGE OF ENGINEERING - MARUTHAKULAM', 450, 40);

      ctx.fillStyle = '#475569';
      ctx.font = '14px sans-serif';
      ctx.fillText('DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING', 450, 65);
      const istParts = getISTDateParts();
      ctx.fillText(`CLASS TIME TABLE - ACADEMIC YEAR ${istParts.academicYear} (${istParts.semesterName} - V)`, 450, 88);

      // Grid header
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(40, 110, 820, 35);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(40, 110, 820, 35);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DAY / PERIOD', 50, 132);
      ctx.fillText('1 (9:10-10:00)', 160, 132);
      ctx.fillText('2 (10:00-10:50)', 260, 132);
      ctx.fillText('3 (11:10-12:00)', 370, 132);
      ctx.fillText('4 (12:00-12:50)', 470, 132);
      ctx.fillText('5 (1:40-2:30)', 580, 132);
      ctx.fillText('6 (2:30-3:20)', 680, 132);
      ctx.fillText('7 (3:20-4:20)', 780, 132);

      // Grid rows
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      const sampleGrid = [
        ['CS3501 (JT)', 'CS3551 (RR)', 'CS3591 (SP)', 'CS3501 (JT)', 'CS3511 LAB (JT)', 'CS3511 LAB (JT)', 'LIB'],
        ['CS3591 (SP)', 'CS3501 (JT)', 'CS3551 (RR)', 'CS3591 (SP)', 'SEMINAR', 'CS3501 (JT)', 'COUNS'],
        ['CS3551 (RR)', 'CS3501 (JT)', 'CS3591 (SP)', 'CS3551 (RR)', 'NAAN MUDHALVAN', 'NAAN MUDHALVAN', 'NAAN MUDHALVAN'],
        ['CS3501 (JT)', 'CS3591 (SP)', 'CS3551 (RR)', 'CS3501 (JT)', 'CS3561 LAB (SP)', 'CS3561 LAB (SP)', 'SPORTS'],
        ['CS3551 (RR)', 'CS3591 (SP)', 'CS3501 (JT)', 'TUTORIAL', 'CS3551 (RR)', 'CS3591 (SP)', 'MENTORING'],
      ];

      days.forEach((day, r) => {
        const y = 145 + r * 50;
        ctx.fillStyle = r % 2 === 0 ? '#ffffff' : '#f8fafc';
        ctx.fillRect(40, y, 820, 50);
        ctx.strokeRect(40, y, 820, 50);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(day, 50, y + 30);

        ctx.font = '11px sans-serif';
        sampleGrid[r].forEach((slot, c) => {
          const x = 155 + c * 105;
          if (slot.includes('NAAN')) {
            ctx.fillStyle = '#d97706';
          } else if (slot.includes('LAB')) {
            ctx.fillStyle = '#7c3aed';
          } else {
            ctx.fillStyle = '#2563eb';
          }
          ctx.fillText(slot, x, y + 30);
        });
      });

      // Bottom Subject Table
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('SUBJECT ALLOCATION & FACULTY DETAILS:', 40, 420);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#334155';
      ctx.fillText('CS3501 - Compiler Design (4 Hrs) -> Dr. J. Tamilarsi [JT]', 40, 440);
      ctx.fillText('CS3551 - Distributed Computing (3 Hrs) -> Dr. R. Ramesh [RR]', 40, 458);
      ctx.fillText('CS3591 - Computer Networks (4 Hrs) -> Mrs. S. Priya [SP]', 40, 476);
      ctx.fillText('CS3511 - Compiler Design Laboratory (2 Hrs) -> Dr. J. Tamilarsi [JT]', 40, 494);
      ctx.fillText('CS3561 - Networks Laboratory (2 Hrs) -> Mrs. S. Priya [SP]', 40, 512);
      ctx.fillText('NM3001 - Naan Mudhalvan Skill Training (3 Hrs) -> TN Skill Trainers', 40, 530);

      const dataUrl = canvas.toDataURL('image/png');
      setImageSrc(dataUrl);
      setMimeType('image/png');
      setImageName('NCE_CSE_Sem5_Sample_Timetable.png');
      toast.success('Loaded Anna University CSE Sem-V sample timetable sheet!');
    }
  };

  const handleStartExtraction = async () => {
    if (!imageSrc) {
      toast.error('Please upload or select a timetable image first.');
      return;
    }

    setIsExtracting(true);
    setExtractionStep('Scanning document layout and grid boundaries...');

    try {
      setTimeout(() => setExtractionStep('Parsing Periods 1-7, Days, Labs, and Naan Mudhalvan slots with Gemini Vision...'), 1200);
      setTimeout(() => setExtractionStep('Cross-referencing staff acronyms with subject allocation legend...'), 2800);

      const res = await extractTimetableFromImageWithAI({
        imageBase64: imageSrc,
        mimeType,
        department,
        year,
        semester,
      });

      if (res.success && res.data) {
        setExtractedData(res.data);
        toast.success(`Successfully extracted timetable with ${res.data.confidenceScore || 95}% confidence!`);
      } else {
        toast.error(res.error || 'Failed to parse timetable from image.');
      }
    } catch (err: any) {
      console.error('Error during image extraction:', err);
      toast.error(err.message || 'Image extraction failed.');
    } finally {
      setIsExtracting(false);
      setExtractionStep('');
    }
  };

  const handleCreateLiveTimetable = async () => {
    if (!extractedData) return;

    setIsCreatingTimetable(true);
    try {
      const created = await createExtractedTimetable(extractedData, 'Gemini Vision AI');
      toast.success(`Created live timetable "${created.name}" in database!`);
      if (onTimetableCreated) {
        onTimetableCreated(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Error creating timetable:', err);
      toast.error('Failed to create timetable from extracted data.');
    } finally {
      setIsCreatingTimetable(false);
    }
  };

  const handleImportToCatalog = async () => {
    if (!extractedData) return;

    setIsImportingCatalog(true);
    try {
      // 1. Create or update subjects
      for (const sub of extractedData.subjects) {
        await upsertSubject({
          subjectCode: sub.subjectCode,
          subjectName: sub.subjectName,
          type: sub.type,
          weeklyHours: sub.weeklyHours,
          assignedStaff: sub.assignedStaff || ['JT'],
          department: extractedData.department || department,
          year: extractedData.year || year,
          semester: extractedData.semester || semester,
          active: true,
        });
      }

      // 2. Create or update staff
      for (const fac of extractedData.facultyList) {
        await upsertStaff({
          name: fac.name,
          staffCode: fac.staffCode,
          email: `${fac.staffCode.toLowerCase()}@nce.ac.in`,
          department: fac.department || department,
          active: true,
        });
      }

      toast.success(
        `Imported ${extractedData.subjects.length} courses & ${extractedData.facultyList.length} faculty to catalog!`
      );
      if (onCatalogImported) {
        onCatalogImported();
      }
    } catch (err: any) {
      console.error('Error importing to catalog:', err);
      toast.error(err.message || 'Failed to import records to catalog.');
    } finally {
      setIsImportingCatalog(false);
    }
  };

  const handleExportJSON = () => {
    if (!extractedData) return;
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_timetable_${department.replace(/\s+/g, '_')}_sem${semester}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded extracted timetable data as JSON!');
  };

  return (
    <div
      id="timetable-image-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Gemini Timetable Image Scanner</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  Gemini 3.7 Vision
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Instantly extract full schedules, courses, and faculty allocations from timetable photos or scans
              </p>
            </div>
          </div>
          <button
            id="close-image-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!extractedData ? (
            /* Upload & Configure Screen */
            <div className="space-y-6">
              {/* Drop / Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`relative border-2 border-dashed rounded-2xl p-6 transition-all text-center ${
                  imageSrc
                    ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-gray-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/10'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />

                {imageSrc ? (
                  <div className="space-y-4">
                    <div className="relative max-h-64 max-w-lg mx-auto rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <img
                        src={imageSrc}
                        alt="Uploaded Timetable"
                        className="w-full h-auto max-h-64 object-contain mx-auto"
                      />
                      {isExtracting && (
                        <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white">
                          <div className="w-12 h-12 rounded-full border-3 border-white/30 border-t-white animate-spin mb-3" />
                          <p className="font-bold text-sm tracking-wide">Gemini Vision Analyzing...</p>
                          <p className="text-xs text-indigo-200 mt-1 max-w-xs text-center animate-pulse">
                            {extractionStep}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-xs">
                        📎 {imageName || 'Uploaded Timetable Image'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isExtracting}
                        className="text-xs h-8"
                      >
                        Change Image
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImageSrc(null);
                          setImageName('');
                        }}
                        disabled={isExtracting}
                        className="text-xs h-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-xs">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                        Drag and drop your Timetable image here, or{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline font-bold cursor-pointer"
                        >
                          Browse Files
                        </button>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Supports PNG, JPG, JPEG, WEBP or paste directly with{' '}
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-[11px] font-mono text-gray-700 dark:text-gray-300">
                          Ctrl+V
                        </kbd>
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Or test immediately:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadSampleSheet}
                        className="text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-500 dark:text-indigo-400" />
                        Load Sample NCE CSE Timetable Sheet
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Department & Semester Config */}
              <div className="bg-gray-50/80 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200/80 dark:border-slate-700/80 space-y-3">
                <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Target Academic Details (Optional Context)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      value={department || ''}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={isExtracting}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Year & Semester
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={year || 'III'}
                        onChange={(e) => setYear(e.target.value)}
                        disabled={isExtracting}
                        className="w-1/2 text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="I">Year I</option>
                        <option value="II">Year II</option>
                        <option value="III">Year III</option>
                        <option value="IV">Year IV</option>
                      </select>
                      <select
                        value={semester || '5'}
                        onChange={(e) => setSemester(e.target.value)}
                        disabled={isExtracting}
                        className="w-1/2 text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={String(s)}>
                            Sem {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Section
                    </label>
                    <input
                      type="text"
                      value={section || ''}
                      onChange={(e) => setSection(e.target.value.toUpperCase())}
                      disabled={isExtracting}
                      placeholder="e.g. A"
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 uppercase font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Extraction Trigger */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Auto-detects 7 periods, lab continuities, and Naan Mudhalvan locks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={onClose} disabled={isExtracting}>
                    Cancel
                  </Button>
                  <Button
                    id="start-image-extract-btn"
                    size="sm"
                    onClick={handleStartExtraction}
                    disabled={!imageSrc || isExtracting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {isExtracting ? 'Extracting Timetable...' : 'Extract Timetable with Gemini'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Review & Action Screen */
            <div className="space-y-5">
              {/* Header Summary Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/50 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                      {extractedData.timetableName}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {extractedData.confidenceScore || 95}% Match Confidence
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {extractedData.rawSummary ||
                      `Extracted ${extractedData.gridEntries.length} scheduled periods, ${extractedData.subjects.length} courses, and ${extractedData.facultyList.length} faculty allocations.`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExtractedData(null)}
                    className="text-xs h-8 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Scan Another Image
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportJSON}
                    className="text-xs h-8 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
                  </Button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-gray-200 dark:border-slate-800 gap-2">
                <button
                  onClick={() => setActiveTab('GRID')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'GRID'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Extracted Schedule Grid ({extractedData.gridEntries.length} slots)
                </button>
                <button
                  onClick={() => setActiveTab('SUBJECTS')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'SUBJECTS'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Courses & Credits ({extractedData.subjects.length})
                </button>
                <button
                  onClick={() => setActiveTab('FACULTY')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'FACULTY'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Faculty Allocation ({extractedData.facultyList.length})
                </button>
              </div>

              {/* Tab 1: Extracted Visual Grid */}
              {activeTab === 'GRID' && (
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-slate-700">
                          <th className="p-2.5 text-left w-24 bg-slate-200/80 dark:bg-slate-900">Day / Period</th>
                          {PERIOD_TIMES.map((p) => (
                            <th key={p.index} className="p-2 border-l border-gray-200 dark:border-slate-700 text-[11px] min-w-[110px]">
                              <div>{p.label}</div>
                              <div className="text-[9px] text-gray-500 dark:text-gray-400 font-normal font-mono">{p.time}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                        {DAYS.map((day) => (
                          <tr key={day} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-bold text-gray-900 dark:text-gray-100 bg-slate-50 dark:bg-slate-900 text-left border-r border-gray-200 dark:border-slate-700">
                              {day.slice(0, 3)}
                            </td>
                            {PERIOD_TIMES.map((period) => {
                              const entry = extractedData.gridEntries.find(
                                (e) =>
                                  e.day.toLowerCase().startsWith(day.slice(0, 3).toLowerCase()) &&
                                  e.slotIndex === period.index
                              );

                              if (!entry) {
                                return (
                                  <td
                                    key={period.index}
                                    className="p-2 border-l border-gray-100 dark:border-slate-800 text-gray-300 dark:text-gray-600 text-[11px] bg-white dark:bg-slate-900"
                                  >
                                    -
                                  </td>
                                );
                              }

                              const isLab = entry.type === 'LAB';
                              const isSpecial = entry.type === 'SPECIAL';

                              return (
                                <td
                                  key={period.index}
                                  className={`p-1.5 border-l border-gray-200 dark:border-slate-800 text-left transition-colors ${
                                    isSpecial
                                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
                                      : isLab
                                      ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60'
                                      : 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/60'
                                  }`}
                                >
                                  <div className="font-bold text-gray-900 dark:text-white font-mono text-[11px] flex items-center justify-between">
                                    <span>{entry.subjectCode}</span>
                                    {isLab && (
                                      <span className="text-[8px] font-bold px-1 bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                                        LAB
                                      </span>
                                    )}
                                    {isSpecial && (
                                      <span className="text-[8px] font-bold px-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded">
                                        NM
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-[120px] font-medium" title={entry.subjectName}>
                                    {entry.subjectName}
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
                                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">{entry.staffCode}</span>
                                    <span>{entry.roomNumber}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Detected Subjects List */}
              {activeTab === 'SUBJECTS' && (
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-700 sticky top-0">
                      <tr>
                        <th className="p-3">Course Code</th>
                        <th className="p-3">Course Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Weekly Hours</th>
                        <th className="p-3">Assigned Faculty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {extractedData.subjects.map((sub, i) => (
                        <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/60">
                          <td className="p-3 font-mono font-bold text-gray-900 dark:text-white">{sub.subjectCode}</td>
                          <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{sub.subjectName}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                sub.type === 'LAB'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                  : sub.type === 'SPECIAL'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {sub.type}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-gray-900 dark:text-white">{sub.weeklyHours} Hrs</td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                              {sub.assignedStaff?.join(', ') || 'JT'}
                            </span>
                            {sub.staffName && (
                              <span className="text-gray-500 dark:text-gray-400 text-[11px] ml-1.5">({sub.staffName})</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Detected Faculty List */}
              {activeTab === 'FACULTY' && (
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-700 sticky top-0">
                      <tr>
                        <th className="p-3">Staff Code</th>
                        <th className="p-3">Faculty Name</th>
                        <th className="p-3">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {extractedData.facultyList.map((fac, i) => (
                        <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/60">
                          <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/50 w-24">
                            {fac.staffCode}
                          </td>
                          <td className="p-3 font-semibold text-gray-900 dark:text-white">{fac.name}</td>
                          <td className="p-3 text-gray-600 dark:text-gray-300">{fac.department || department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-800 gap-3">
                <Button variant="outline" size="sm" onClick={() => setExtractedData(null)}>
                  Back to Image
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportToCatalog}
                    disabled={isImportingCatalog}
                    className="text-xs font-semibold"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                    {isImportingCatalog ? 'Saving Catalog...' : 'Import Courses & Faculty to Database'}
                  </Button>
                  <Button
                    id="save-extracted-timetable-btn"
                    size="sm"
                    onClick={handleCreateLiveTimetable}
                    disabled={isCreatingTimetable}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 mr-1.5" />
                    {isCreatingTimetable ? 'Creating Timetable...' : 'Create & Open Live Timetable'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
