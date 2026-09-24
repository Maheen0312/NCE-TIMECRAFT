import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  BookOpen, 
  FlaskConical, 
  Building2, 
  Lock, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck,
  Zap,
  RotateCcw
} from 'lucide-react';
import { getAllStaff, StaffProfile } from '@/services/staffService';
import { getAllSubjects, Subject } from '@/services/subjectService';
import { getAllLabs, Lab } from '@/services/labService';
import { getAllRooms, Room } from '@/services/roomService';
import { getAllSpecialSessions } from '@/services/specialSessionService';
import { SpecialSession } from '@/types/timetable';
import { seedInitialDataset } from '@/services/seedService';
import { generateTimetable, publishTimetable, normalizeDept } from '@/services/timetableService';
import { Timetable } from '@/types/timetable';
import { TimetableImageModal } from '@/components/timetable/TimetableImageModal';
import { StressTestModal } from '@/components/timetable/StressTestModal';
import { YearSelector } from '@/components/common/YearSelector';
import { useYearFilter } from '@/contexts/YearFilterContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, GraduationCap } from 'lucide-react';
import { CanonicalYear, matchYear, YEAR_CONFIGS, formatYearDisplay, subjectMatchesYearAndSem, getSemestersForYear } from '@/utils/yearUtils';

const generationSteps = [
  'Verifying faculty availability & institutional rules...',
  'Reserving mandatory locked breaks, lunch, & Wednesday PM Naan Mudhalvan...',
  'Scheduling Everyday Afternoon Practical / Lab Sessions (01:40 PM – 04:20 PM)...',
  'Allocating Morning Theory Lecture Periods (Periods 1–4: 09:10 AM – 12:50 PM)...',
  'Executing hard constraint validation matrix & room allocation...',
  'Computing schedule quality metrics & finalizing draft...',
];

export default function AdminGenerate() {
  const navigate = useNavigate();
  const { selectedYear, setSelectedYear, yearConfig } = useYearFilter();

  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [year, setYear] = useState<string>(selectedYear);
  const [semester, setSemester] = useState<string>(yearConfig.defaultSemester);

  useEffect(() => {
    setYear(selectedYear);
    const validSems = getSemestersForYear(selectedYear);
    if (!validSems.includes(semester)) {
      setSemester(validSems[0] || '1');
    }
  }, [selectedYear]);

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    setSelectedYear(newYear as CanonicalYear);
    const validSems = getSemestersForYear(newYear);
    if (!validSems.includes(semester)) {
      setSemester(validSems[0] || '1');
    }
  };

  // Preflight Data
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [specialSessions, setSpecialSessions] = useState<SpecialSession[]>([]);
  const [loadingPreflight, setLoadingPreflight] = useState(true);

  // Generation Mode Controls (Default: Dynamic Variations on every run)
  const [isConsistentMode, setIsConsistentMode] = useState(false);
  const [customSeed, setCustomSeed] = useState<number>(48);

  // Generation Engine State
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [generatedTimetable, setGeneratedTimetable] = useState<Timetable | null>(null);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);
  const [generationSuggestions, setGenerationSuggestions] = useState<string[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showStressTestModal, setShowStressTestModal] = useState(false);

  const fetchPreflightData = async () => {
    setLoadingPreflight(true);
    try {
      const [sList, subList, lList, rList, specList] = await Promise.all([
        getAllStaff(),
        getAllSubjects(),
        getAllLabs(),
        getAllRooms(),
        getAllSpecialSessions(),
      ]);
      setStaff(sList);
      setSubjects(subList);
      setLabs(lList);
      setRooms(rList);
      setSpecialSessions(specList);
    } catch (error) {
      console.error('Failed to load preflight data:', error);
      toast.error('Failed to load system resources');
    } finally {
      setLoadingPreflight(false);
    }
  };

  useEffect(() => {
    fetchPreflightData();
  }, []);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await seedInitialDataset(true);
      toast.success(res.message);
      setGenerationErrors([]);
      setGenerationSuggestions([]);
      await fetchPreflightData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed clean data');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setCurrentStepIndex(0);
    setGeneratedTimetable(null);
    setGenerationErrors([]);
    setGenerationSuggestions([]);

    // Progress stepper animation
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < generationSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    try {
      const result = await generateTimetable({
        department,
        year,
        semester,
        createdBy: 'Department Administrator',
        seed: isConsistentMode ? customSeed : undefined,
        consistentMode: isConsistentMode,
      });

      clearInterval(interval);
      setCurrentStepIndex(generationSteps.length - 1);

      if (result.success && result.timetable) {
        setGeneratedTimetable(result.timetable);
        toast.success(`Conflict-Free Timetable Generated! (Quality: ${result.timetable.qualityScore}%)`);
      } else {
        setGenerationErrors(result.errors || ['Automatic scheduling failed due to constraint violations.']);
        setGenerationSuggestions(result.suggestions || []);
        toast.error('Generation halted: check constraint violations');
      }
    } catch (error: any) {
      clearInterval(interval);
      console.error('Generation error:', error);
      setGenerationErrors([error.message || 'Unexpected scheduling engine failure.']);
      toast.error('Generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishNow = async () => {
    if (!generatedTimetable?.id) return;
    try {
      await publishTimetable(generatedTimetable.id, true);
      toast.success('Timetable published live for faculty and students!');
      navigate('/admin/timetable');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish');
    }
  };

  // Filter cohort subjects strictly matching selected Year and Semester
  const isFinalYear = matchYear(year, 'IV');
  const targetNormDept = normalizeDept(department);
  let cohortSubjects = subjects.filter(s => {
    if (!s.active) return false;
    const subDept = normalizeDept(s.department);
    const matchDept = !targetNormDept || !subDept || subDept === targetNormDept || subDept.includes(targetNormDept);
    return matchDept && subjectMatchesYearAndSem(s, year, semester);
  });

  if (isFinalYear && cohortSubjects.length > 4) {
    cohortSubjects = cohortSubjects.slice(0, 4);
  }

  const subjectsToCount = cohortSubjects;

  // Load faculty assigned strictly to these cohort subjects
  const assignedStaffCodes = new Set(cohortSubjects.flatMap(s => s.assignedStaff || []));
  const cohortStaff = staff.filter(s => s.active && assignedStaffCodes.has(s.staffCode));

  // Filter labs corresponding to this cohort's practical lab courses
  const practicalCodes = new Set(cohortSubjects.filter(s => s.type === 'LAB').map(s => s.subjectCode.toUpperCase()));
  const cohortLabs = isFinalYear 
    ? [] 
    : labs.filter(l => l.active && (practicalCodes.has(l.labCode.toUpperCase()) || l.department === department));

  // Filter active locked activities for target year cohort
  const cohortLockedActivities = specialSessions.filter(s => {
    return s.locked && (!s.year || s.year === 'ALL' || matchYear(s.year, year));
  });

  const activeStaffCount = cohortStaff.length > 0 ? cohortStaff.length : staff.filter(s => s.active).length;
  const activeSubjectsCount = subjectsToCount.length;
  const theoryHoursTotal = subjectsToCount.filter(s => s.type === 'THEORY').reduce((a, b) => a + (b.weeklyHours || 4), 0);
  const labHoursTotal = subjectsToCount.filter(s => s.type === 'LAB').reduce((a, b) => a + (b.weeklyHours || 2), 0);
  const totalPlannedHours = theoryHoursTotal + labHoursTotal;
  const classroomCount = rooms.filter(r => r.type === 'CLASSROOM' && r.active).length;
  const labRoomCount = rooms.filter(r => r.type === 'LAB' && r.active).length;

  const isReady = activeStaffCount > 0 && activeSubjectsCount > 0 && classroomCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">Academic Timetable Generation</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Year-wise scheduling engine with cross-year faculty conflict checking and mandatory Wednesday afternoon policy.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowStressTestModal(true)}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/70"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            Automated 100+ Test Suite
          </Button>
          <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding} className="text-xs font-semibold">
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 text-luna-primary-blue dark:text-cyan-400 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Resetting...' : 'Reset Clean Dataset'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPreflightData} className="h-8 px-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPreflight ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* STEP 1: Select Academic Year */}
      <Card className="border-2 border-luna-primary-blue/30 bg-linear-to-r from-blue-50/40 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold uppercase bg-luna-primary-blue text-white">
                  Step 1
                </span>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Select Academic Year to Generate
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The engine loads only subjects, faculty, and labs assigned to this selected year.
              </p>
            </div>
            {/* 3 Prominent Year Buttons */}
            <div className="flex items-center gap-2">
              {YEAR_CONFIGS.map(cfg => {
                const isSelected = year === cfg.key;
                return (
                  <button
                    key={cfg.key}
                    type="button"
                    onClick={() => handleYearChange(cfg.key)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-luna-primary-blue text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-luna-primary-blue/50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>{cfg.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                      Sem {cfg.defaultSemester}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-luna-primary-blue bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
                <option value="Information Technology">Information Technology (IT)</option>
                <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Academic Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-luna-primary-blue bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium"
              >
                {getSemestersForYear(year).map(sem => (
                  <option key={sem} value={sem}>
                    Semester {sem} ({sem === '3' || sem === '5' || sem === '7' ? 'Odd Sem 2026-2027' : 'Even Sem'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clean Year-Wise Resource Summary */}
          <div className="mt-4 p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  Ready for {formatYearDisplay(year)} (Semester {semester}):
                </span>
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-cyan-300 px-2 py-0.5 rounded font-bold">
                  {cohortSubjects.length} Courses
                </span>
                <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                  {cohortStaff.length} Faculty
                </span>
                <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                  {cohortLabs.length > 0 ? `${cohortLabs.length} Labs` : 'All Labs Available'}
                </span>
                <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {cohortLockedActivities.length} Locked Slots
                </span>
              </div>
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Zero other-year subjects loaded • Cross-year staff conflict engine active</span>
              </div>
            </div>
          </div>

          {/* Consistency & Determinism Controls */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Generation Behavior:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsConsistentMode(true)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    isConsistentMode
                      ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs border border-gray-200/80 dark:border-slate-700 font-bold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  🔒 Consistent / Deterministic
                </button>
                <button
                  type="button"
                  onClick={() => setIsConsistentMode(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    !isConsistentMode
                      ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs border border-gray-200/80 dark:border-slate-700 font-bold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  🎲 Explore Variations
                </button>
              </div>
            </div>

            {isConsistentMode ? (
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 px-2.5 py-1 rounded-md">
                <span className="text-[11px] font-medium">
                  Reproducible Seed:
                </span>
                <input
                  type="number"
                  value={customSeed ?? 48}
                  onChange={(e) => setCustomSeed(parseInt(e.target.value) || 0)}
                  className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 rounded text-blue-900 dark:text-blue-200"
                />
                <button
                  type="button"
                  title="Generate alternate deterministic seed"
                  onClick={() => setCustomSeed(Math.floor(Math.random() * 900) + 10)}
                  className="text-blue-600 dark:text-cyan-400 hover:text-blue-800 text-[11px] underline font-semibold"
                >
                  New Seed
                </button>
              </div>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 italic text-[11px]">
                Randomized permutation on each generation.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Institutional Scheduling Policy Reminder */}
      <div className="bg-linear-to-r from-purple-900/90 via-indigo-900/90 to-blue-900/90 text-white p-4 rounded-xl shadow-sm border border-purple-800/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-white/10 text-amber-300 shrink-0 mt-0.5">
            {isFinalYear ? <GraduationCap className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              {isFinalYear ? 'Final Year Special Policy Active' : 'Everyday Afternoon Laboratory Policy Active'}
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                01:40 PM – 04:20 PM
              </span>
            </div>
            <p className="text-gray-200 mt-1 leading-relaxed">
              {isFinalYear ? (
                <>
                  Final Year has <strong>ONLY 4 allocated subjects</strong> scheduled strictly in morning periods (09:10 AM – 12:50 PM).
                  The <strong>entire afternoon</strong> is strictly locked for <strong>Career Guidance & Placement</strong> (Wednesday <em>Naan Mudhalvan</em> preserved).
                </>
              ) : (
                <>
                  Every afternoon is exclusively reserved for Practical & Laboratory sessions (Periods 5–7).
                  <strong> Mon, Tue, Thu, Fri:</strong> Department Subject Labs • 
                  <strong> Wednesday:</strong> Mandatory Tamil Nadu <em>Naan Mudhalvan</em> Skill Training.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center bg-white/10 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-200 border border-white/10">
          <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-300" />
          {isFinalYear ? 'Morning = 4 Subjects Only' : 'Morning (09:10–12:50) = Theory (P1–P4)'}
        </div>
      </div>

      {/* Pre-Flight Checklist Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Faculty</span>
            <Users className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-luna-dark-navy dark:text-white mt-1">{activeStaffCount}</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Active Staff</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Subjects</span>
            <BookOpen className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-luna-dark-navy dark:text-white mt-1">{activeSubjectsCount}</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Term Courses</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Theory</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-1">{theoryHoursTotal} hrs</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Lecture Load</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Labs</span>
            <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-purple-700 dark:text-purple-400 mt-1">{labHoursTotal} hrs</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Practical Load</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Rooms</span>
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">{classroomCount + labRoomCount}</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{classroomCount} Class, {labRoomCount} Labs</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Locked Slots</span>
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-800 dark:text-amber-300 mt-1.5 leading-tight">
            {cohortLockedActivities.length > 0 ? `${cohortLockedActivities.length} Active` : '0 Slots'}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 truncate" title={cohortLockedActivities.map(a => `${a.name} (${a.day})`).join(', ')}>
            {cohortLockedActivities.map(a => a.name).join(', ') || 'No locked slots'}
          </div>
        </div>
      </div>

      {/* Workload Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
        totalPlannedHours <= 35 
          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40 text-green-800 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300'
      }`}>
        <div className="flex items-center space-x-2">
          {totalPlannedHours <= 35 ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span>
            <strong>Weekly Cohort Load:</strong> {totalPlannedHours} / 35 teaching periods planned ({subjectsToCount.filter(s => s.type === 'THEORY').length} Theory = {theoryHoursTotal}h + {subjectsToCount.filter(s => s.type === 'LAB').length} Labs = {labHoursTotal}h).
          </span>
        </div>
        {totalPlannedHours > 35 && (
          <Button variant="outline" size="sm" onClick={handleSeedData} className="h-7 text-xs bg-white dark:bg-slate-900">
            Reset Curriculum Clean Dataset
          </Button>
        )}
      </div>

      {/* Main Execution Card */}
      <Card className="shadow-md overflow-hidden">
        <CardContent className="p-8 text-center space-y-6">
          {!isGenerating && !generatedTimetable && generationErrors.length === 0 && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-luna-primary-blue/10 dark:bg-cyan-950/40 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-luna-dark-navy dark:text-white">
                  Automatic Timetable Generator ({formatYearDisplay(year)})
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Intelligently schedules {cohortSubjects.length} subjects ({theoryHoursTotal} theory hours, {labHoursTotal} practical lab hours) for {formatYearDisplay(year)}, Semester {semester}, with cross-year faculty conflict checking.
                </p>
              </div>

              {!isReady && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 text-left">
                  <strong>Prerequisite Notice:</strong> Staff profiles, subjects, and rooms are required before generating. Click <strong>"Reset Clean Dataset"</strong> above to auto-populate.
                </div>
              )}

              <Button
                size="lg"
                onClick={handleStartGeneration}
                disabled={!isReady || isGenerating}
                className="w-full font-bold shadow-lg shadow-luna-primary-blue/20 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate {formatYearDisplay(year)} Timetable
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-3 text-gray-400 dark:text-gray-500 font-semibold">Or import existing</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowImageModal(true)}
                className="w-full font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-xs"
              >
                <Camera className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Scan & Extract Timetable from Photo / Sheet
              </Button>
            </div>
          )}

          {/* Stepper Progress View */}
          {isGenerating && (
            <div className="max-w-lg mx-auto py-6 space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <RefreshCw className="w-16 h-16 text-luna-primary-blue dark:text-cyan-400 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-luna-dark-navy dark:text-white">Generating Optimal Schedule...</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Evaluating thousands of constraint combinations.</p>
              </div>

              <div className="space-y-2 text-left bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                {generationSteps.map((stepText, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <div
                      key={stepText}
                      className={`flex items-center space-x-2 text-xs transition-opacity ${
                        isDone ? 'text-green-700 dark:text-green-400 font-medium' : isCurrent ? 'text-luna-primary-blue dark:text-cyan-300 font-bold' : 'text-gray-400 dark:text-gray-500 opacity-50'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-slate-600 shrink-0" />
                      )}
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success View */}
          {generatedTimetable && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto space-y-6"
            >
              <div className="w-16 h-16 rounded-3xl bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 mb-2">
                  Quality Score: {generatedTimetable.qualityScore}% (0 Conflicts)
                </span>
                <h3 className="text-2xl font-black text-luna-dark-navy dark:text-white">Timetable Generated Successfully!</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Saved to Cloud Firestore as <strong>DRAFT (v{generatedTimetable.version})</strong>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 text-left">
                <div>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Total Periods</span>
                  <strong className="text-base text-gray-900 dark:text-white">{generatedTimetable.stats?.totalClasses} Scheduled</strong>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Hard Conflicts</span>
                  <strong className="text-base text-green-600 dark:text-green-400">0 Collisions</strong>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Naan Mudhalvan</span>
                  <strong className="text-base text-luna-primary-blue dark:text-cyan-400">Hard Locked 🔒</strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setGeneratedTimetable(null)}>
                  Generate Again
                </Button>
                <Button onClick={handlePublishNow} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Publish Timetable
                </Button>
                <Button onClick={() => navigate('/admin/timetable')}>
                  View Master Grid
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Failure View */}
          {generationErrors.length > 0 && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto space-y-4 text-left"
            >
              <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-900 dark:text-red-200 text-sm">Scheduling Engine Halted</h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    The engine encountered the following constraint violations:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-red-800 dark:text-red-300">
                    {generationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {generationSuggestions.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <strong>Recommended Resolution:</strong>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-800 dark:text-blue-300">
                    {generationSuggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding}>
                  <RotateCcw className={`w-3.5 h-3.5 mr-1.5 text-luna-primary-blue dark:text-cyan-400 ${isSeeding ? 'animate-spin' : ''}`} />
                  {isSeeding ? 'Resetting...' : 'Reset to Clean Section 48 Dataset'}
                </Button>
                <Button 
                  size="sm" 
                  onClick={async () => {
                    setGenerationErrors([]);
                    await handleStartGeneration();
                  }}
                  className="bg-luna-primary-blue hover:bg-luna-primary-blue/90 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {showImageModal && (
        <TimetableImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          defaultDepartment={department}
          onTimetableCreated={(newTimetable) => {
            navigate('/admin/timetable');
          }}
          onCatalogImported={fetchPreflightData}
        />
      )}

      {showStressTestModal && (
        <StressTestModal
          isOpen={showStressTestModal}
          onClose={() => setShowStressTestModal(false)}
        />
      )}
    </div>
  );
}
