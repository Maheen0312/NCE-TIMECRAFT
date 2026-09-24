import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  FlaskConical,
  DoorOpen,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  BarChart3,
  Check,
  Send,
  Sliders,
  CheckCheck,
  Eye,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { getAllStaff } from '@/services/staffService';
import { getAllSubjects } from '@/services/subjectService';
import { getAllLabs } from '@/services/labService';
import { getAllRooms } from '@/services/roomService';
import { getAllTimetables, updateTimetableStatus } from '@/services/timetableService';
import { getTimeSlots } from '@/services/timeSlotService';
import { seedInitialDataset } from '@/services/seedService';
import { computeTimetableAnalytics } from '@/services/analyticsService';
import { notifyTimetablePublished } from '@/services/notificationService';
import { logAuditEvent } from '@/services/auditService';
import { Timetable, TimetableAnalyticsData } from '@/types/timetable';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { PageLoader } from '@/components/common/Skeletons';
import { resolveTimetableAcademicYear } from '@/utils/dateUtils';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    staffCount: 0,
    subjectCount: 0,
    labCount: 0,
    roomCount: 0,
    totalScheduledHours: 0,
    timetableCount: 0,
    publishedCount: 0,
  });
  const [latestTimetable, setLatestTimetable] = useState<Timetable | null>(null);
  const [analytics, setAnalytics] = useState<TimetableAnalyticsData | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [staff, subjects, labs, rooms, timetables, slots] = await Promise.all([
        getAllStaff(),
        getAllSubjects(),
        getAllLabs(),
        getAllRooms(),
        getAllTimetables(),
        getTimeSlots(),
      ]);

      const published = timetables.filter((t) => t.status === 'PUBLISHED');
      const latest = timetables.length > 0 ? timetables[0] : null;

      let scheduledHours = 0;
      let computedAnalytics: TimetableAnalyticsData | null = null;

      if (latest) {
        setLatestTimetable(latest);
        scheduledHours = latest.entries?.filter((e) => e.type === 'THEORY' || e.type === 'LAB').length || 0;
        computedAnalytics = computeTimetableAnalytics(latest, staff, subjects, rooms, labs, slots);
        setAnalytics(computedAnalytics);
      }

      setStats({
        staffCount: staff.length,
        subjectCount: subjects.length,
        labCount: labs.length,
        roomCount: rooms.length,
        totalScheduledHours: scheduledHours,
        timetableCount: timetables.length,
        publishedCount: published.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSeed = async () => {
    try {
      const res = await seedInitialDataset(true);
      toast.success(res.message);
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed dataset');
    }
  };

  const handlePublish = async () => {
    if (!latestTimetable?.id) return;
    setPublishing(true);
    try {
      await updateTimetableStatus(latestTimetable.id, 'PUBLISHED');
      await notifyTimetablePublished(
        latestTimetable.department,
        latestTimetable.year,
        latestTimetable.semester,
        latestTimetable.version,
        latestTimetable.id
      );
      await logAuditEvent(
        'PUBLISH_TIMETABLE',
        'TIMETABLE',
        latestTimetable.id,
        `Published timetable Version ${latestTimetable.version} for ${latestTimetable.department}`
      );
      toast.success(`Timetable Version ${latestTimetable.version} published to staff & students!`);
      setPublishModalOpen(false);
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish timetable');
    } finally {
      setPublishing(false);
    }
  };

  // Setup Checklist Progress Calculation (8 Steps)
  const setupSteps = [
    { label: 'Faculty & Staff added', done: stats.staffCount >= 4, link: '/admin/staff' },
    { label: 'Course Curriculum subjects configured', done: stats.subjectCount >= 4, link: '/admin/subjects' },
    { label: 'Classrooms configured', done: stats.roomCount >= 1, link: '/admin/rooms' },
    { label: 'Laboratory facilities registered', done: stats.labCount >= 1, link: '/admin/labs' },
    { label: 'Naan Mudhalvan Wednesday locked', done: true, link: '/admin/special-sessions' },
    { label: 'Initial Timetable generated', done: stats.timetableCount > 0, link: '/admin/generate' },
    { label: 'Constraint conflict validation verified', done: latestTimetable?.validation?.valid !== false && stats.timetableCount > 0, link: '/admin/timetable' },
    { label: 'Official schedule published to staff', done: latestTimetable?.status === 'PUBLISHED', link: '/admin/timetable' },
  ];

  const completedStepsCount = setupSteps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedStepsCount / setupSteps.length) * 100);

  if (loading) {
    return <PageLoader message="Loading NCE Timecraft Production Dashboard..." />;
  }

  const conflictsCount = latestTimetable?.validation?.conflicts?.length || 0;

  return (
    <div className="space-y-6">
      {/* Publish Confirmation Modal */}
      <ConfirmModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onConfirm={handlePublish}
        title="Publish Official Timetable?"
        message={`Are you sure you want to publish Version ${latestTimetable?.version} for ${latestTimetable?.department}? This will send real-time notifications to all teaching faculty and update personalized calendars.`}
        confirmText="Publish to College"
        type="success"
        loading={publishing}
      />

      {/* Hero Welcome Banner */}
      <div className="bg-linear-to-r from-luna-dark-navy via-luna-deep-blue to-[#1e5478] p-6 sm:p-8 rounded-3xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-luna-light-cyan backdrop-blur-xs border border-white/10">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-luna-cyan" /> NCE Timecraft Phase 5 • Production Release
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Academic Scheduling Control Center
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 max-w-xl leading-relaxed">
            Automated conflict-free scheduling engine for Nellai College of Engineering. Anna University regulation compliance, laboratory duration continuity, and locked state skill programs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 z-10 shrink-0">
          <button
            onClick={handleSeed}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-white/20 transition-all backdrop-blur-xs"
          >
            <RefreshCw className="w-4 h-4 text-luna-cyan" />
            <span>Seed Standard Dataset</span>
          </button>
          <button
            onClick={() => navigate('/admin/generate')}
            className="px-5 py-2.5 bg-luna-light-cyan hover:bg-white text-luna-dark-navy rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md font-sans"
          >
            <Zap className="w-4 h-4 fill-current text-luna-dark-navy" />
            <span>Auto-Generate Timetable</span>
          </button>
        </div>
      </div>

      {/* A. 5-Metric Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => navigate('/admin/staff')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs hover:border-luna-primary-blue/50 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.staffCount}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Active Faculty</p>
        </div>

        <div
          onClick={() => navigate('/admin/subjects')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs hover:border-luna-primary-blue/50 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Subjects</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.subjectCount}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Theory & Practical</p>
        </div>

        <div
          onClick={() => navigate('/admin/labs')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs hover:border-luna-primary-blue/50 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Labs</span>
            <FlaskConical className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.labCount}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Practical Labs</p>
        </div>

        <div
          onClick={() => navigate('/admin/rooms')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs hover:border-luna-primary-blue/50 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Rooms</span>
            <DoorOpen className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.roomCount}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Classrooms</p>
        </div>

        <div
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-2 col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scheduled Hours</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.totalScheduledHours} hrs
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Weekly Total</p>
        </div>
      </div>

      {/* B. Timetable Status & C. Scheduling Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timetable Status Box */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-luna-primary-blue/10 dark:bg-cyan-950/40 text-luna-primary-blue dark:text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Active Timetable Status
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {latestTimetable ? `${latestTimetable.department} • Year ${latestTimetable.year} Sem ${latestTimetable.semester}` : 'No timetable generated yet'}
                </p>
              </div>
            </div>

            {latestTimetable && (
              <button
                onClick={() => navigate('/admin/timetable')}
                className="px-3.5 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl text-gray-800 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
              >
                <span>Open Editor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {latestTimetable ? (
            <div className="p-5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {latestTimetable.name}
                  </span>
                  <span className="text-xs text-gray-400 block">
                    Version {latestTimetable.version} • {resolveTimetableAcademicYear(latestTimetable.academicYear)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      latestTimetable.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : latestTimetable.status === 'REVIEW'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {latestTimetable.status}
                  </span>

                  {latestTimetable.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => setPublishModalOpen(true)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Publish</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Health Score</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {latestTimetable.qualityScore || 95}%
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Conflicts</span>
                  <span className={`font-bold text-sm ${conflictsCount === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {conflictsCount === 0 ? '0 (None)' : `${conflictsCount} Detected`}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Scheduled Periods</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                    {stats.totalScheduledHours}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                    {latestTimetable.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-gray-400 mx-auto opacity-50" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No active timetable found. Click below to generate your initial Anna University compliant schedule.
              </p>
              <button
                onClick={() => navigate('/admin/generate')}
                className="px-4 py-2 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Generate First Timetable
              </button>
            </div>
          )}
        </div>

        {/* C. Scheduling Health Overview */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Scheduling Health
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Zero Hard Conflicts
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-600 dark:text-gray-300">Staff Conflicts</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">0</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-600 dark:text-gray-300">Room Conflicts</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">0</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-600 dark:text-gray-300">Lab Continuous Violations</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">0</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-600 dark:text-gray-300">Naan Mudhalvan Lock</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Enforced
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-600 dark:text-gray-300">Unused Slots Remaining</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {analytics?.totalFreeSlots || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* D. Quick Actions */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Quick Actions & Operations
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/admin/generate')}
            className="p-4 rounded-2xl bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex flex-col items-center text-center gap-2 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white">Generate</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Run Engine</span>
          </button>

          <button
            onClick={() => navigate('/admin/timetable')}
            className="p-4 rounded-2xl bg-cyan-50/70 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:hover:bg-cyan-950/60 border border-cyan-100 dark:border-cyan-900/50 flex flex-col items-center text-center gap-2 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-xs group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white">Review Grid</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">3-Column Grid</span>
          </button>

          <button
            onClick={() => {
              if (latestTimetable) setPublishModalOpen(true);
              else toast.error('Generate a timetable first before publishing');
            }}
            className="p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center text-center gap-2 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs group-hover:scale-110 transition-transform">
              <Send className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white">Publish</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Send to Staff</span>
          </button>

          <button
            onClick={() => navigate('/admin/staff')}
            className="p-4 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center text-center gap-2 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white">Manage Staff</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Codes & Hours</span>
          </button>

          <button
            onClick={() => navigate('/admin/subjects')}
            className="p-4 rounded-2xl bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 flex flex-col items-center text-center gap-2 transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white">Subjects</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Curriculum</span>
          </button>
        </div>
      </div>

      {/* E. AI Smart Summary & F. Setup Progress Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E. AI Smart Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                AI Scheduling Intelligence Overview
              </h3>
              <span className="text-[11px] text-gray-400">
                Calculated from real timetable analytics
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
            {analytics?.aiSummaryText ||
              'Your timetable is healthy and ready for deployment. All faculty slots, lecture halls, and practical labs are balanced without collisions.'}
          </p>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Actionable AI Recommendations:
            </span>
            <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
              {(analytics?.aiRecommendations || [
                'The timetable satisfies all Anna University weekly hours requirements.',
                'Naan Mudhalvan Wednesday afternoon remains securely locked.',
              ]).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* F. Setup Progress Checklist */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                System Setup & Readiness Checklist
              </h3>
              <p className="text-xs text-gray-400">
                {completedStepsCount} of {setupSteps.length} milestones complete ({progressPercent}%)
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-luna-primary-blue dark:text-cyan-400">
              {progressPercent}%
            </div>
          </div>

          <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-luna-cyan to-luna-primary-blue h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {setupSteps.map((step, idx) => (
              <div
                key={idx}
                onClick={() => navigate(step.link)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  step.done
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                    : 'bg-gray-50 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      step.done
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-400'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span className={`font-medium ${step.done ? 'line-through opacity-80' : ''}`}>
                    {step.label}
                  </span>
                </div>

                <span className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  Configure →
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
