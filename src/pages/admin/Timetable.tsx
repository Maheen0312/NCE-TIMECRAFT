import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { printTimetable } from '@/utils/printUtils';
import { toPng } from 'html-to-image';
import { 
  getAllTimetables, 
  getTimetableById, 
  saveTimetableDraft, 
  publishTimetableSafely, 
  deleteTimetable, 
  validateExistingTimetable,
  moveClassApi,
  regenerateSubjectApi,
  autoFixConflictsApi,
  generateTimetable
} from '@/services/timetableService';
import { getAllStaff } from '@/services/staffService';
import { getAllSubjects } from '@/services/subjectService';
import { getAllRooms } from '@/services/roomService';
import { getTimetableVersions, restoreVersionAsDraft, createVersionSnapshot } from '@/services/versionService';
import { 
  Timetable, 
  TimetableEntry, 
  ValidationResult, 
  Subject, 
  StaffProfile, 
  Room, 
  TimetableVersion,
  AiTimetableSuggestion 
} from '@/types/timetable';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { ConflictPanel } from '@/components/timetable/ConflictPanel';
import { AiAssistantPanel } from '@/components/timetable/AiAssistantPanel';
import { AddClassModal } from '@/components/timetable/AddClassModal';
import { EditClassModal } from '@/components/timetable/EditClassModal';
import { PublishModal } from '@/components/timetable/PublishModal';
import { RegenerateModal } from '@/components/timetable/RegenerateModal';
import { ImportDataModal } from '@/components/timetable/ImportDataModal';
import { TimetableImageModal } from '@/components/timetable/TimetableImageModal';
import { PrintTimetable } from '@/components/timetable/PrintTimetable';
import { InstitutionalTimetableExport } from '@/components/timetable/InstitutionalTimetableExport';
import { QuickImageExportContainer } from '@/components/timetable/QuickImageExportContainer';
import { StressTestModal } from '@/components/timetable/StressTestModal';
import { getExportGeneratedTimestamp, syncWithServerTime } from '@/utils/dateUtils';
import { YEAR_CONFIGS, formatYearDisplay, normalizeYear, matchYear } from '@/utils/yearUtils';
import { 
  Calendar, 
  Clock, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Download, 
  Printer, 
  Trash2, 
  RefreshCw, 
  Filter, 
  Eye, 
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
  Plus,
  Undo2,
  Redo2,
  FileSpreadsheet,
  History as HistoryIcon,
  Bot,
  Search,
  CheckCheck,
  ChevronRight,
  Layers,
  Camera,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminTimetable() {
  const navigate = useNavigate();

  // Primary data states
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [versions, setVersions] = useState<TimetableVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout View States (Spacious Grid Mode by Default)
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(false);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);

  // Undo / Redo history stack
  const [undoStack, setUndoStack] = useState<Timetable[]>([]);
  const [redoStack, setRedoStack] = useState<Timetable[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<'ALL' | 'II' | 'III' | 'IV'>('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');

  // Active Center View & Right Panel Tab
  const [centerView, setCenterView] = useState<'GRID' | 'CONFLICTS' | 'PRINT'>('GRID');
  const [rightTab, setRightTab] = useState<'AI' | 'CONFLICTS' | 'VERSIONS'>('AI');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSlotTarget, setAddSlotTarget] = useState<{ day: string; slotIndex: number } | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImageScanModal, setShowImageScanModal] = useState(false);
  const [showHDExportModal, setShowHDExportModal] = useState(false);
  const [showStressTestModal, setShowStressTestModal] = useState(false);

  // Ref for High-Resolution Quick Image Export Container
  const quickExportRef = React.useRef<HTMLDivElement>(null);
  const [quickExportTimestamp, setQuickExportTimestamp] = useState<string>('');

  // Operation loading states
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [tList, subList, sList, rList] = await Promise.all([
        getAllTimetables(),
        getAllSubjects(),
        getAllStaff(),
        getAllRooms(),
      ]);

      setTimetables(tList);
      setSubjects(subList);
      setStaffList(sList);
      setRooms(rList);

      if (tList.length > 0) {
        // Find published or latest
        const published = tList.find(t => t.status === 'PUBLISHED');
        const activeT = published || tList[0];
        setSelectedTimetable(activeT);

        // Fetch version history
        const vList = await getTimetableVersions(activeT.id);
        setVersions(vList);
      }
    } catch (error) {
      console.error('Failed to load timetable data:', error);
      toast.error('Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update versions whenever selected timetable changes
  useEffect(() => {
    if (selectedTimetable?.id) {
      getTimetableVersions(selectedTimetable.id).then(setVersions).catch(console.warn);
    }
  }, [selectedTimetable?.id]);

  // Push state to undo stack before a mutation
  const pushUndoState = (prev: Timetable) => {
    setUndoStack(curr => [...curr.slice(-15), JSON.parse(JSON.stringify(prev))]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || !selectedTimetable) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(curr => [...curr, JSON.parse(JSON.stringify(selectedTimetable))]);
    setUndoStack(curr => curr.slice(0, -1));
    setSelectedTimetable(previous);
    saveTimetableDraft(previous);
    toast.success('Undone last change');
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !selectedTimetable) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(curr => [...curr, JSON.parse(JSON.stringify(selectedTimetable))]);
    setRedoStack(curr => curr.slice(0, -1));
    setSelectedTimetable(next);
    saveTimetableDraft(next);
    toast.success('Redone change');
  };

  // Drag-and-Drop Class Move Handler
  const handleMoveClass = async (entryId: string, targetDay: string, targetSlotIndex: number) => {
    if (!selectedTimetable) return;

    const entry = selectedTimetable.entries.find(e => e.id === entryId);
    const isCareerGuidance = (entry?.subjectName || '').toLowerCase().includes('career guidance') || 
                             entry?.subjectCode === 'CG401' || 
                             (matchYear(selectedTimetable.year, 'IV') && entry && entry.slotIndex >= 6);
    if (isCareerGuidance || (matchYear(selectedTimetable.year, 'IV') && targetSlotIndex >= 6)) {
      toast.error('Career Guidance is a locked Final Year special session and cannot be modified.');
      return;
    }

    pushUndoState(selectedTimetable);

    try {
      const result = await moveClassApi({
        timetable: selectedTimetable,
        entryId,
        targetDay,
        targetSlotIndex,
        subjects,
        rooms,
      });

      if (!result.valid || !result.updatedTimetable) {
        toast.error(result.message || 'Invalid move. Collision detected.');
        // Revert undo stack push
        setUndoStack(curr => curr.slice(0, -1));
        return;
      }

      setSelectedTimetable(result.updatedTimetable);
      await saveTimetableDraft(result.updatedTimetable);
      toast.success(`Moved class to ${targetDay} Period ${targetSlotIndex + 1}`);
    } catch (err: any) {
      toast.error('Failed to move class');
    }
  };

  // Add Class Handler
  const handleAddClass = async (newEntry: TimetableEntry) => {
    if (!selectedTimetable) return;

    if (matchYear(selectedTimetable.year, 'IV') && newEntry.slotIndex >= 6) {
      toast.error('Career Guidance is a locked Final Year special session and cannot be modified.');
      return;
    }

    pushUndoState(selectedTimetable);

    const updatedEntries = [...selectedTimetable.entries, newEntry];
    const updatedTimetable: Timetable = {
      ...selectedTimetable,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    setSelectedTimetable(updatedTimetable);
    await saveTimetableDraft(updatedTimetable);

    // Live validation
    if (updatedTimetable.id) {
      const liveVal = await validateExistingTimetable(updatedTimetable.id);
      if (liveVal) {
        setSelectedTimetable(prev => prev ? ({ ...prev, validation: liveVal }) : null);
      }
    }
  };

  // Update Class Handler
  const handleUpdateClass = async (updatedEntry: TimetableEntry) => {
    if (!selectedTimetable) return;

    const existing = selectedTimetable.entries.find(e => e.id === updatedEntry.id);
    const isCG = (existing?.subjectName || '').toLowerCase().includes('career guidance') ||
                 existing?.subjectCode === 'CG401' ||
                 (matchYear(selectedTimetable.year, 'IV') && (existing?.slotIndex || 0) >= 6);
    if (isCG || (matchYear(selectedTimetable.year, 'IV') && updatedEntry.slotIndex >= 6)) {
      toast.error('Career Guidance is a locked Final Year special session and cannot be modified.');
      return;
    }

    pushUndoState(selectedTimetable);

    const updatedEntries = selectedTimetable.entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
    const updatedTimetable: Timetable = {
      ...selectedTimetable,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    setSelectedTimetable(updatedTimetable);
    await saveTimetableDraft(updatedTimetable);

    if (updatedTimetable.id) {
      const liveVal = await validateExistingTimetable(updatedTimetable.id);
      if (liveVal) {
        setSelectedTimetable(prev => prev ? ({ ...prev, validation: liveVal }) : null);
      }
    }
  };

  // Delete Class Handler
  const handleDeleteClass = async (entryId: string) => {
    if (!selectedTimetable) return;

    const existing = selectedTimetable.entries.find(e => e.id === entryId);
    const isCG = (existing?.subjectName || '').toLowerCase().includes('career guidance') ||
                 existing?.subjectCode === 'CG401' ||
                 (matchYear(selectedTimetable.year, 'IV') && (existing?.slotIndex || 0) >= 6);
    if (isCG) {
      toast.error('Career Guidance is a locked Final Year special session and cannot be modified.');
      return;
    }

    pushUndoState(selectedTimetable);

    const updatedEntries = selectedTimetable.entries.filter(e => e.id !== entryId);
    const updatedTimetable: Timetable = {
      ...selectedTimetable,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    setSelectedTimetable(updatedTimetable);
    await saveTimetableDraft(updatedTimetable);

    if (updatedTimetable.id) {
      const liveVal = await validateExistingTimetable(updatedTimetable.id);
      if (liveVal) {
        setSelectedTimetable(prev => prev ? ({ ...prev, validation: liveVal }) : null);
      }
    }
  };

  // Apply AI Suggestion Handler
  const handleApplyAiSuggestion = async (suggestion: AiTimetableSuggestion) => {
    if (!selectedTimetable || !suggestion.change) return;

    const { subjectCode, from, to } = suggestion.change;
    const entryToMove = selectedTimetable.entries.find(
      e => (e.subjectCode === subjectCode || e.id === suggestion.change.entryId) &&
           e.day === from.day &&
           e.slotIndex === from.slotIndex
    );

    if (!entryToMove) {
      toast.error(`Target entry for ${subjectCode} not found in proposed slot.`);
      return;
    }

    if (matchYear(selectedTimetable.year, 'IV')) {
      const isCGFrom = from.slotIndex >= 6 || (entryToMove.subjectName || '').toLowerCase().includes('career guidance') || entryToMove.subjectCode === 'CG401';
      const isCGTo = to.slotIndex >= 6;
      if (isCGFrom || isCGTo) {
        toast.error('Career Guidance is a locked Final Year special session and cannot be modified.');
        return;
      }
    }

    await handleMoveClass(entryToMove.id, to.day, to.slotIndex);
    toast.success('Applied AI schedule optimization!');
  };

  // Auto-Fix All Conflicts Handler
  const handleAutoFix = async () => {
    if (!selectedTimetable) return;
    setAutoFixing(true);
    pushUndoState(selectedTimetable);

    try {
      const result = await autoFixConflictsApi({
        timetable: selectedTimetable,
        subjects,
        rooms,
      });

      if (result.success && result.timetable) {
        setSelectedTimetable(result.timetable);
        await saveTimetableDraft(result.timetable);
        toast.success(result.message || 'Auto-fix applied.');
      } else {
        toast.error('Could not auto-fix conflicts.');
      }
    } catch (e: any) {
      toast.error('Auto-fix encountered an error');
    } finally {
      setAutoFixing(false);
    }
  };

  // Partial Subject Regeneration
  const handleRegenerateSubject = async (subjectCode: string) => {
    if (!selectedTimetable) return;

    if (subjectCode === 'CG401' || subjectCode.toLowerCase().includes('career')) {
      toast.error('Career Guidance is a locked Final Year special session and cannot be modified.');
      return;
    }

    setRegenerating(true);
    pushUndoState(selectedTimetable);

    try {
      const result = await regenerateSubjectApi({
        timetable: selectedTimetable,
        subjectCode,
        subjects,
        rooms,
      });

      if (result.success && result.timetable) {
        setSelectedTimetable(result.timetable);
        await saveTimetableDraft(result.timetable);
        toast.success(result.message || `Rescheduled ${subjectCode}`);
      } else {
        toast.error(result.message || `Failed to reschedule ${subjectCode}`);
      }
    } catch (err: any) {
      toast.error('Subject regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  // Full Regeneration (in-place generation & persistence)
  const handleRegenerateFull = async (options?: { seed?: number; consistentMode?: boolean }) => {
    if (!selectedTimetable) return;
    setRegenerating(true);
    pushUndoState(selectedTimetable);

    try {
      const result = await generateTimetable({
        department: selectedTimetable.department,
        year: selectedTimetable.year,
        semester: selectedTimetable.semester,
        createdBy: 'Administrator',
        seed: options?.seed,
        consistentMode: options?.consistentMode,
      });

      if (result.success && result.timetable) {
        setSelectedTimetable(result.timetable);
        toast.success(`Generated fresh timetable (Quality Score: ${result.timetable.qualityScore}%)`);
        fetchData();
      } else {
        toast.error(result.errors?.[0] || 'Full timetable regeneration failed.');
      }
    } catch (err: any) {
      toast.error('Regeneration encountered an error. Please verify database connection.');
    } finally {
      setRegenerating(false);
    }
  };

  // Publish Live Safe Handler
  const handleConfirmPublish = async () => {
    if (!selectedTimetable) return;
    setPublishing(true);

    try {
      const result = await publishTimetableSafely(selectedTimetable, 'Administrator');
      if (result.success) {
        toast.success(result.message);
        setShowPublishModal(false);
        setSelectedTimetable(prev => prev ? ({ ...prev, status: 'PUBLISHED' }) : null);
        fetchData();
      } else {
        toast.error(result.message);
        if (result.validation) {
          setSelectedTimetable(prev => prev ? ({ ...prev, validation: result.validation }) : null);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Publishing failed.');
    } finally {
      setPublishing(false);
    }
  };

  // Rollback to historical version
  const handleRollbackVersion = async (version: TimetableVersion) => {
    try {
      if (selectedTimetable) {
        pushUndoState(selectedTimetable);
      }
      const restored = await restoreVersionAsDraft(version, 'Administrator');
      toast.success(`Restored Version ${version.version} as active Draft`);
      setSelectedTimetable(restored);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to rollback version.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedTimetable) return;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let csv = 'Day,SlotIndex,SubjectCode,SubjectName,Faculty,Room,Type\n';
    
    for (const d of days) {
      for (let slot = 0; slot < 9; slot++) {
        const e = selectedTimetable.entries.find(item => item.day === d && item.slotIndex === slot);
        if (e) {
          csv += `"${d}",${slot + 1},"${e.subjectCode || ''}","${e.subjectName || ''}","${e.staffCode || ''}","${e.roomNumber || ''}","${e.type}"\n`;
        }
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTimetable.name.replace(/\s+/g, '_')}_v${selectedTimetable.version || 1}.csv`;
    link.click();
  };

  // Download High-Resolution Timetable Image (Quick Image)
  const handleDownloadImage = async () => {
    if (!selectedTimetable) {
      toast.error('Please select a timetable first');
      return;
    }

    try {
      toast.loading('Generating ultra-sharp high-resolution timetable image...', { id: 'quick-image' });

      // Synchronize with authoritative server time and refresh generation timestamp
      await syncWithServerTime();
      const freshTimestamp = getExportGeneratedTimestamp();
      setQuickExportTimestamp(freshTimestamp);

      // 1. Ensure all system and web fonts are fully loaded
      if (document.fonts) {
        await document.fonts.ready;
      }

      // 2. Allow brief delay for state change to render into the hidden DOM container
      await new Promise(resolve => setTimeout(resolve, 180));

      const node = quickExportRef.current;
      if (!node) {
        toast.error('Timetable export template is initializing. Please try again.');
        return;
      }

      // 3. Render at 3x ultra-high density for razor-sharp text
      const dataUrl = await toPng(node, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width: 1440,
        height: node.scrollHeight,
        style: {
          transform: 'none',
          left: '0px',
          top: '0px',
          position: 'static',
          opacity: '1',
          visibility: 'visible',
          display: 'block',
          margin: '0px',
        },
      });

      const link = document.createElement('a');
      const safeName = (selectedTimetable.name || 'Schedule').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `NCE-Timecraft-Timetable-${safeName}_v${selectedTimetable.version || 1}_HD.png`;
      link.href = dataUrl;
      link.click();

      toast.success('High-resolution timetable image downloaded!', { id: 'quick-image' });
    } catch (err) {
      console.error('Failed to generate high-resolution timetable image:', err);
      toast.error('Failed to export image. Please try again.', { id: 'quick-image' });
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top App Header & Quick Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-luna-dark-navy text-luna-light-cyan flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-luna-dark-navy dark:text-white">
                {selectedTimetable ? selectedTimetable.name : 'Timetable Editor'}
              </h2>
              {selectedTimetable && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  selectedTimetable.status === 'PUBLISHED'
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                }`}>
                  {selectedTimetable.status} (v{selectedTimetable.version || 1})
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Interactive 3-Column Timetable Editor • Drag-and-drop slots, real-time validation & AI assistance
            </p>
          </div>
        </div>

        {/* Action Buttons & Quick Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 border border-gray-200 dark:border-slate-700">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo last change"
              className="p-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo change"
              className="p-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <Button
            id="shuffle-generate-btn"
            size="sm"
            onClick={() => handleRegenerateFull({ consistentMode: false })}
            disabled={regenerating}
            className="text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Intelligently shuffle and generate a fresh, conflict-free timetable"
          >
            <Sparkles className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Shuffle / Generate New Timetable</span>
          </Button>

          <Button
            id="scan-image-btn"
            variant="outline"
            size="sm"
            onClick={() => setShowImageScanModal(true)}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-xs"
          >
            <Camera className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
            Scan Timetable Image
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStressTestModal(true)}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 shadow-xs cursor-pointer"
            title="Run 100+ Automated Multi-Seed Generation Stress Test & Constraint Verification"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
            100+ Test Suite
          </Button>

          {/* Quick Image: High-Resolution Timetable Image Download */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadImage}
            disabled={!selectedTimetable}
            className="text-xs font-bold text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
            title="Download complete timetable as a high-resolution, crystal-clear image"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-cyan-400" />
            Quick Image
          </Button>

          {/* Officially Export HD: Institutional Anna University PDF Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHDExportModal(true)}
            disabled={!selectedTimetable}
            className="text-xs font-extrabold text-[#002B7F] dark:text-cyan-300 bg-blue-50/90 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-xs cursor-pointer"
            title="Open Institutional HD Timetable Export with Anna University seal, subject matrix & signatures"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-cyan-500" />
            Officially Export HD
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!selectedTimetable}
            className="text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>

          {selectedTimetable && (
            <Button
              size="sm"
              onClick={() => setShowPublishModal(true)}
              disabled={publishing}
              className={`text-xs font-bold shadow-xs ${
                selectedTimetable.status === 'PUBLISHED'
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              {selectedTimetable.status === 'PUBLISHED' ? 'Republish / Review' : 'Publish Live'}
            </Button>
          )}
        </div>
      </div>

      {/* Horizontal Quick Controls Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
            {/* Year Cohort Filter Buttons */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 border border-gray-200 dark:border-slate-700">
              {(['ALL', 'II', 'III', 'IV'] as const).map(yr => {
                const isSelected = yearFilter === yr;
                const label = yr === 'ALL' ? 'All Years' : formatYearDisplay(yr);
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setYearFilter(yr);
                      if (yr !== 'ALL') {
                        const firstMatching = timetables.find(t => matchYear(t.year, yr));
                        if (firstMatching) setSelectedTimetable(firstMatching);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Department Dropdown */}
            <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Schedule:</span>
              <select
                value={selectedTimetable?.id || ''}
                onChange={(e) => {
                  const found = timetables.find(t => t.id === e.target.value);
                  if (found) setSelectedTimetable(found);
                }}
                className="text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30"
              >
                {timetables
                  .filter(t => yearFilter === 'ALL' || matchYear(t.year, yearFilter))
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {formatYearDisplay(t.year)} (Sem {t.semester}) - {t.department} [{t.status}]
                    </option>
                  ))}
              </select>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[180px] max-w-[240px] flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search subject, faculty, room..."
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
              />
            </div>

            {/* Faculty Quick Filter */}
            <select
              value={staffFilter || 'ALL'}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="text-xs border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-1.5 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Faculty</option>
              {staffList.map((st, idx) => (
                <option key={st.id || `${st.staffCode}_${idx}`} value={st.staffCode}>
                  {st.name} ({st.staffCode})
                </option>
              ))}
            </select>

            {/* Session Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-1.5 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Types</option>
              <option value="THEORY">Theory Only</option>
              <option value="LAB">Lab Only</option>
              <option value="LOCKED">Locked Only</option>
            </select>

            {/* Room Filter */}
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="text-xs border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-1.5 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Rooms</option>
              {rooms.map((r, idx) => (
                <option key={r.id || `${r.roomNumber}_${idx}`} value={r.roomNumber}>
                  Room {r.roomNumber}
                </option>
              ))}
            </select>

            {(searchQuery || staffFilter !== 'ALL' || typeFilter !== 'ALL' || roomFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStaffFilter('ALL');
                  setTypeFilter('ALL');
                  setRoomFilter('ALL');
                }}
                className="text-luna-primary-blue dark:text-cyan-400 text-[11px] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddSlotTarget({ day: 'Monday', slotIndex: 0 });
                setShowAddModal(true);
              }}
              disabled={!selectedTimetable}
              className="text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-luna-primary-blue dark:text-cyan-400" />
              Add Class
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFix}
              disabled={!selectedTimetable || autoFixing}
              className="text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-800"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
              {autoFixing ? 'Fixing...' : 'Auto-Fix Conflicts'}
            </Button>
          </div>
        </div>

      {/* Main Adaptive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* ================= COLUMN 1: LEFT SIDEBAR (COLLAPSIBLE) ================= */}
        {showLeftSidebar && (
          <div className="lg:col-span-3 space-y-3">
            {/* Timetable Selector Card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                <span>Department Schedule</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {timetables.length} Timetables
                </span>
              </div>

              <select
                value={selectedTimetable?.id || ''}
                onChange={(e) => {
                  const found = timetables.find(t => t.id === e.target.value);
                  if (found) setSelectedTimetable(found);
                }}
                className="w-full text-xs font-semibold border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
              >
                {timetables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.department} - Year {t.year} Sem {t.semester} ({t.status})
                  </option>
                ))}
              </select>

              {/* Quality Score Meter */}
              {selectedTimetable && (
                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-gray-600 dark:text-gray-400">Schedule Health</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{selectedTimetable.qualityScore || 92}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${selectedTimetable.qualityScore || 92}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-0.5">
                    <span>{selectedTimetable.entries.filter(e => e.type === 'THEORY' || e.type === 'LAB').length} Classes</span>
                    <span className={selectedTimetable.validation?.conflicts?.length ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                      {selectedTimetable.validation?.conflicts?.length || 0} Conflicts
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
              <div className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Search & Filter</span>
                {(searchQuery || staffFilter !== 'ALL' || typeFilter !== 'ALL' || roomFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStaffFilter('ALL');
                      setTypeFilter('ALL');
                      setRoomFilter('ALL');
                    }}
                    className="text-luna-primary-blue dark:text-cyan-400 text-[10px] hover:underline font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search subject, faculty, room..."
                  value={searchQuery || ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
                />
              </div>

              {/* Faculty Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Faculty</label>
                <select
                  value={staffFilter || 'ALL'}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-xl p-2 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="ALL">All Faculty</option>
                  {staffList.map((st, idx) => (
                    <option key={st.id || `${st.staffCode}_${idx}`} value={st.staffCode}>
                      {st.name} ({st.staffCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Type Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Period Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-xl p-2 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="ALL">All Session Types</option>
                  <option value="THEORY">Theory Only</option>
                  <option value="LAB">Laboratory Only</option>
                  <option value="LOCKED">Locked Sessions</option>
                </select>
              </div>

              {/* Room Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Classroom / Lab</label>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="w-full text-xs border border-gray-200 dark:border-slate-700 rounded-xl p-2 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="ALL">All Rooms</option>
                  {rooms.map((r, idx) => (
                    <option key={r.id || `${r.roomNumber}_${idx}`} value={r.roomNumber}>
                      Room {r.roomNumber} ({r.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Tools Box */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
              <div className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider text-[11px]">
                Editor Actions
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddSlotTarget({ day: 'Monday', slotIndex: 0 });
                  setShowAddModal(true);
                }}
                disabled={!selectedTimetable}
                className="w-full justify-start text-xs font-semibold bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                <Plus className="w-3.5 h-3.5 mr-2 text-luna-primary-blue dark:text-cyan-400" />
                Add Class to Schedule
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoFix}
                disabled={!selectedTimetable || autoFixing}
                className="w-full justify-start text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-600 dark:text-amber-400" />
                {autoFixing ? 'Auto-Fixing...' : 'Auto-Fix Conflicts'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/generate')}
                className="w-full justify-start text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800"
              >
                <Layers className="w-3.5 h-3.5 mr-2 text-blue-600 dark:text-blue-400" />
                Generate New Timetable
              </Button>
            </div>
          </div>
        )}

        {/* ================= COLUMN 2: CENTER (GRID / CONFLICTS / PRINT) ================= */}
        <div className={`${
          !showLeftSidebar && !showRightPanel
            ? 'lg:col-span-12'
            : showLeftSidebar && !showRightPanel
            ? 'lg:col-span-9'
            : !showLeftSidebar && showRightPanel
            ? 'lg:col-span-8 xl:col-span-9'
            : 'lg:col-span-6'
        } space-y-3`}>
          {/* Center Header Tabs */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCenterView('GRID')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  centerView === 'GRID'
                    ? 'bg-luna-dark-navy dark:bg-cyan-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                Grid Editor
              </button>

              <button
                onClick={() => setCenterView('CONFLICTS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  centerView === 'CONFLICTS'
                    ? 'bg-luna-dark-navy dark:bg-cyan-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Diagnostics</span>
                {selectedTimetable?.validation?.conflicts?.length ? (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {selectedTimetable.validation.conflicts.length}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:block pr-2">
              💡 Continuous multi-period blocks merged • Drag & drop to reassign
            </div>
          </div>

          {/* Grid Render */}
          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 text-center border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 shadow-xs">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
              <p className="text-sm font-semibold">Loading Timetable Master Grid...</p>
            </div>
          ) : !selectedTimetable ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 text-center border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">No Timetable Selected</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Generate your first academic timetable using the automated scheduling engine or select an existing draft.
              </p>
              <Button onClick={() => navigate('/admin/generate')}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Launch Timetable Generator
              </Button>
            </div>
          ) : centerView === 'GRID' ? (
            <TimetableGrid
              timetable={selectedTimetable}
              searchQuery={searchQuery}
              staffFilter={staffFilter}
              typeFilter={typeFilter}
              roomFilter={roomFilter}
              onMoveClass={handleMoveClass}
              onSelectEntry={(entry) => setEditingEntry(entry)}
              onAddClassToSlot={(day, slotIndex) => {
                setAddSlotTarget({ day, slotIndex });
                setShowAddModal(true);
              }}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
              <ConflictPanel
                validation={selectedTimetable.validation}
                onAutoFix={handleAutoFix}
                autoFixing={autoFixing}
                onHighlightSlot={(day, slotIndex) => {
                  setCenterView('GRID');
                  toast(`Inspecting slot: ${day} Period ${slotIndex + 1}`, { icon: '🔍' });
                }}
              />
            </div>
          )}
        </div>

        {/* ================= COLUMN 3: RIGHT SIDEBAR (AI ASSISTANT / CONFLICTS / VERSIONS) ================= */}
        {showRightPanel && (
          <div className="lg:col-span-3 space-y-3">
            {/* Tab Selector & Close Button */}
            <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center flex-1 gap-1">
                <button
                  onClick={() => setRightTab('AI')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    rightTab === 'AI'
                      ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-luna-primary-blue dark:text-cyan-400" />
                  AI Assistant
                </button>

                <button
                  onClick={() => setRightTab('CONFLICTS')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    rightTab === 'CONFLICTS'
                      ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Validation
                </button>

                <button
                  onClick={() => setRightTab('VERSIONS')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    rightTab === 'VERSIONS'
                      ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <HistoryIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Versions
                </button>
              </div>

              <button
                onClick={() => setShowRightPanel(false)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-slate-700 rounded-xl ml-1 transition-colors cursor-pointer"
                title="Close AI Assistant Panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Tab Content */}
            {rightTab === 'AI' && selectedTimetable ? (
              <div className="min-h-[500px]">
                <AiAssistantPanel
                  timetable={selectedTimetable}
                  validation={selectedTimetable.validation}
                  subjects={subjects}
                  staff={staffList}
                  rooms={rooms}
                  onApplySuggestion={handleApplyAiSuggestion}
                />
              </div>
            ) : rightTab === 'CONFLICTS' && selectedTimetable ? (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs min-h-[500px]">
                <ConflictPanel
                  validation={selectedTimetable.validation}
                  onAutoFix={handleAutoFix}
                  autoFixing={autoFixing}
                  onHighlightSlot={(day, slotIndex) => {
                    setCenterView('GRID');
                  }}
                />
              </div>
            ) : rightTab === 'VERSIONS' ? (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3 min-h-[500px]">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 pb-2 border-b dark:border-slate-800">
                  <span>Version History</span>
                  <span className="text-[10px] text-gray-400 font-mono">{versions.length} Snapshots</span>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 text-xs">
                  {versions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No snapshots recorded yet.</p>
                    </div>
                  ) : (
                    versions.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 hover:bg-blue-50/40 dark:hover:bg-slate-800 hover:border-luna-primary-blue/30 dark:hover:border-cyan-500/30 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-gray-900 dark:text-white">Version {v.version}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            v.status === 'PUBLISHED'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                          }`}>
                            {v.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
                          {v.summary || 'Automatic system state snapshot'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-200/50 dark:border-slate-700/50">
                          <span>Quality: <strong>{v.qualityScore}%</strong></span>
                          <button
                            onClick={() => handleRollbackVersion(v)}
                            className="text-luna-primary-blue dark:text-cyan-400 hover:underline font-bold cursor-pointer"
                          >
                            Restore State
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Hidden Print Container for native window.print() */}
      {selectedTimetable && (
        <PrintTimetable
          timetable={selectedTimetable}
          subjects={subjects}
          staff={staffList}
        />
      )}

      {/* MODALS */}
      {showAddModal && selectedTimetable && (
        <AddClassModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          timetable={selectedTimetable}
          subjects={subjects}
          staff={staffList}
          rooms={rooms}
          initialDay={addSlotTarget?.day || 'Monday'}
          initialSlotIndex={addSlotTarget?.slotIndex || 0}
          onAddClass={handleAddClass}
        />
      )}

      {editingEntry && (
        <EditClassModal
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          entry={editingEntry}
          subjects={subjects}
          staff={staffList}
          rooms={rooms}
          onUpdateClass={handleUpdateClass}
          onDeleteClass={handleDeleteClass}
        />
      )}

      {showPublishModal && selectedTimetable && (
        <PublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          timetable={selectedTimetable}
          validation={selectedTimetable.validation}
          onConfirmPublish={handleConfirmPublish}
          publishing={publishing}
        />
      )}

      {showRegenerateModal && selectedTimetable && (
        <RegenerateModal
          isOpen={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          timetable={selectedTimetable}
          subjects={subjects}
          staff={staffList}
          onRegenerateFull={handleRegenerateFull}
          onRegenerateSubject={handleRegenerateSubject}
          onAutoFix={handleAutoFix}
          loading={regenerating || autoFixing}
        />
      )}

      {showImportModal && selectedTimetable && (
        <ImportDataModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          department={selectedTimetable.department}
          onDataImported={fetchData}
        />
      )}

      {showImageScanModal && (
        <TimetableImageModal
          isOpen={showImageScanModal}
          onClose={() => setShowImageScanModal(false)}
          defaultDepartment={selectedTimetable?.department || 'Computer Science & Engineering'}
          onTimetableCreated={(newTimetable) => {
            fetchData();
            setSelectedTimetable(newTimetable);
          }}
          onCatalogImported={fetchData}
        />
      )}

      {showHDExportModal && selectedTimetable && (
        <InstitutionalTimetableExport
          isOpen={showHDExportModal}
          onClose={() => setShowHDExportModal(false)}
          timetable={selectedTimetable}
        />
      )}

      {showStressTestModal && (
        <StressTestModal
          isOpen={showStressTestModal}
          onClose={() => setShowStressTestModal(false)}
        />
      )}

      {/* Off-screen Container for High-Resolution Quick Image Export */}
      {selectedTimetable && (
        <div 
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '1440px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -9999,
          }}
        >
          <QuickImageExportContainer
            ref={quickExportRef}
            timetable={selectedTimetable}
            subjects={subjects}
            staff={staffList}
            rooms={rooms}
            exportTimestamp={quickExportTimestamp}
          />
        </div>
      )}
    </div>
  );
}
