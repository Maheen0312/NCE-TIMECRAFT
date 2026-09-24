import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  BookOpen,
  DoorOpen,
  FlaskConical,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  Sparkles,
  ArrowUpDown,
  Filter,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  Timetable,
  StaffProfile,
  Subject,
  Room,
  Lab,
  TimeSlot,
  TimetableAnalyticsData,
} from '@/types/timetable';
import { getLatestTimetable } from '@/services/timetableService';
import { getStaffList } from '@/services/staffService';
import { getSubjects } from '@/services/subjectService';
import { getRooms } from '@/services/roomService';
import { getLabs } from '@/services/labService';
import { getTimeSlots } from '@/services/timeSlotService';
import { computeTimetableAnalytics } from '@/services/analyticsService';
import { PageLoader, CardSkeleton } from '@/components/common/Skeletons';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<TimetableAnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STAFF' | 'SUBJECTS' | 'ROOMS' | 'LABS'>('OVERVIEW');
  const [staffSort, setStaffSort] = useState<'HIGH_HOURS' | 'LOW_HOURS' | 'FREE_PERIODS' | 'CONSECUTIVE'>('HIGH_HOURS');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [tt, st, sub, rm, lb, slots] = await Promise.all([
        getLatestTimetable(),
        getStaffList(),
        getSubjects(),
        getRooms(),
        getLabs(),
        getTimeSlots(),
      ]);

      if (tt) {
        const computed = computeTimetableAnalytics(tt, st, sub, rm, lb, slots);
        setAnalytics(computed);
      }
    } catch (err) {
      console.error('Failed to compute analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += '=== NCE TIMECRAFT ANALYTICS REPORT ===\n';
    csvContent += `Department,${analytics.department},Academic Year,${analytics.academicYear},Semester,${analytics.semester}\n`;
    csvContent += `Overall Health Score,${analytics.healthScore.overallScore}%,Total Classes,${analytics.totalClasses}\n\n`;

    csvContent += '=== FACULTY WORKLOAD ===\n';
    csvContent += 'Staff Code,Staff Name,Required Hours,Scheduled Hours,Free Periods,Max Consecutive,Status\n';
    analytics.staffWorkloads.forEach((s) => {
      csvContent += `"${s.staffCode}","${s.staffName}",${s.requiredHours},${s.scheduledHours},${s.freePeriods},${s.maxConsecutive},"${s.status}"\n`;
    });

    csvContent += '\n=== SUBJECT CURRICULUM DISTRIBUTION ===\n';
    csvContent += 'Subject Code,Subject Name,Type,Required Hours,Scheduled Hours,Remaining,Status\n';
    analytics.subjectAnalytics.forEach((sub) => {
      csvContent += `"${sub.subjectCode}","${sub.subjectName}","${sub.type}",${sub.requiredHours},${sub.scheduledHours},${sub.remainingHours},"${sub.status}"\n`;
    });

    csvContent += '\n=== ROOM UTILIZATION ===\n';
    csvContent += 'Room Number,Type,Capacity,Occupied Slots,Available Slots,Utilization Rate\n';
    analytics.roomUtilizations.forEach((r) => {
      csvContent += `"${r.roomNumber}","${r.type}",${r.capacity},${r.occupiedSlots},${r.availableSlots},"${r.utilizationRate}%"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NCE_Timecraft_Analytics_${analytics.department}_Sem${analytics.semester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageLoader message="Computing comprehensive timetable analytics..." />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-slate-800 space-y-4">
        <BarChart3 className="w-12 h-12 mx-auto text-gray-400" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          No Timetable Analytics Available
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Please generate and save a timetable first to compute deep workload analytics, health scores, and utilization insights.
        </p>
        <button
          onClick={() => navigate('/admin/generate')}
          className="px-5 py-2.5 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          Generate Timetable Now
        </button>
      </div>
    );
  }

  // Sorted staff workload
  const sortedStaff = [...analytics.staffWorkloads].sort((a, b) => {
    if (staffSort === 'HIGH_HOURS') return b.scheduledHours - a.scheduledHours;
    if (staffSort === 'LOW_HOURS') return a.scheduledHours - b.scheduledHours;
    if (staffSort === 'FREE_PERIODS') return b.freePeriods - a.freePeriods;
    if (staffSort === 'CONSECUTIVE') return b.maxConsecutive - a.maxConsecutive;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {analytics.department} • Year {analytics.year} Sem {analytics.semester}
            </span>
            <span className="text-xs text-gray-400 font-mono">({analytics.academicYear})</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Department Timetable Analytics & Utilization
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time workload metrics, curriculum coverage, classroom capacities, and scheduling health index.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors no-print"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm no-print"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Health Score & Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Health Score Card */}
        <div className="bg-gradient-to-br from-luna-dark-navy to-luna-deep-blue text-white p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-luna-light-cyan font-bold uppercase tracking-wider">
              Scheduling Health Index
            </span>
            <Activity className="w-5 h-5 text-luna-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{analytics.healthScore.overallScore}%</span>
            <span className="text-xs text-emerald-300 font-semibold flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> High Quality
            </span>
          </div>
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-luna-cyan to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${analytics.healthScore.overallScore}%` }}
            />
          </div>
          <p className="text-[11px] text-white/80 line-clamp-1">
            Weighted on conflict resolution, weekly hours & room efficiency.
          </p>
        </div>

        {/* Total Scheduled Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase">Weekly Scheduled Hours</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.totalScheduledHours} Hours
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {analytics.totalClasses} periods across 5 working days
          </p>
        </div>

        {/* Morning vs Afternoon Balance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase">Time Slot Distribution</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.morningClassesCount}
              </span>
              <span className="text-[10px] text-gray-400 block">Morning (Slots 1-4)</span>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-slate-800" />
            <div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.afternoonClassesCount}
              </span>
              <span className="text-[10px] text-gray-400 block">Afternoon (Slots 5-7)</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 h-full"
              style={{
                width: `${
                  analytics.totalClasses > 0
                    ? (analytics.morningClassesCount / analytics.totalClasses) * 100
                    : 50
                }%`,
              }}
            />
            <div
              className="bg-purple-500 h-full"
              style={{
                width: `${
                  analytics.totalClasses > 0
                    ? (analytics.afternoonClassesCount / analytics.totalClasses) * 100
                    : 50
                }%`,
              }}
            />
          </div>
        </div>

        {/* Room & Lab Utilization */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase">Average Facility Util.</span>
            <DoorOpen className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.healthScore.roomUtilizationScore}%
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {analytics.roomUtilizations.length} Classrooms & {analytics.labUtilizations.length} Labs monitored
          </p>
        </div>
      </div>

      {/* AI Smart Summary & Actionable Recommendations Card */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 dark:from-slate-900 dark:to-slate-800/80 p-6 rounded-3xl border border-blue-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              AI Analytics Intelligence Audit
            </h3>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Synthesized from active Firestore timetable metrics
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          {analytics.aiSummaryText}
        </p>

        {analytics.aiRecommendations.length > 0 && (
          <div className="pt-2 border-t border-blue-200/40 dark:border-slate-700/60 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Key Recommendations:
            </span>
            <ul className="space-y-1">
              {analytics.aiRecommendations.map((rec, i) => (
                <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-purple-500 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
        {[
          { key: 'OVERVIEW', label: 'Score Breakdown', icon: Activity },
          { key: 'STAFF', label: `Staff Workload (${analytics.staffWorkloads.length})`, icon: Users },
          { key: 'SUBJECTS', label: `Curriculum Coverage (${analytics.subjectAnalytics.length})`, icon: BookOpen },
          { key: 'ROOMS', label: `Room Utilization (${analytics.roomUtilizations.length})`, icon: DoorOpen },
          { key: 'LABS', label: `Lab Facilities (${analytics.labUtilizations.length})`, icon: FlaskConical },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-colors shrink-0 ${
                activeTab === tab.key
                  ? 'bg-luna-dark-navy text-white dark:bg-luna-primary-blue shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Health Score Breakdown */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Score Pillar Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Health Metric Pillars
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Conflict-Free Integrity</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{analytics.healthScore.conflictFreeScore}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analytics.healthScore.conflictFreeScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Subject Weekly Hours Met</span>
                  <span className="text-blue-600 dark:text-blue-400">{analytics.healthScore.weeklyHoursScore}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${analytics.healthScore.weeklyHoursScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Staff Workload Balance</span>
                  <span className="text-purple-600 dark:text-purple-400">{analytics.healthScore.staffDistributionScore}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${analytics.healthScore.staffDistributionScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Room Utilization Efficiency</span>
                  <span className="text-teal-600 dark:text-teal-400">{analytics.healthScore.roomUtilizationScore}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${analytics.healthScore.roomUtilizationScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Subject Distribution Spread</span>
                  <span className="text-cyan-600 dark:text-cyan-400">{analytics.healthScore.subjectDistributionScore}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${analytics.healthScore.subjectDistributionScore}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Key Extremes: Most and Least Used Rooms */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Room Utilization Highlights
            </h3>

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-gray-400">Most Utilized Classrooms</span>
              <div className="space-y-2">
                {analytics.mostUsedRooms.map((rm) => (
                  <div key={rm.roomNumber} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                        {rm.roomNumber}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{rm.roomName || `Room ${rm.roomNumber}`}</p>
                        <p className="text-[10px] text-gray-400">{rm.occupiedSlots} / {rm.occupiedSlots + rm.availableSlots} periods occupied</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-bold rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {rm.utilizationRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase text-gray-400">Under-Utilized Classrooms</span>
              <div className="space-y-2">
                {analytics.leastUsedRooms.map((rm) => (
                  <div key={rm.roomNumber} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs">
                        {rm.roomNumber}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{rm.roomName || `Room ${rm.roomNumber}`}</p>
                        <p className="text-[10px] text-gray-400">{rm.occupiedSlots} periods active</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-bold rounded-lg bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-gray-300">
                      {rm.utilizationRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Staff Workload Table */}
      {activeTab === 'STAFF' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Faculty Workload Analysis
              </h3>
              <p className="text-xs text-gray-400">
                Detailed teaching hours, free periods, and consecutive lecture distribution per faculty.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1 font-semibold">
                <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
              </span>
              <select
                value={staffSort}
                onChange={(e) => setStaffSort(e.target.value as any)}
                className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none"
              >
                <option value="HIGH_HOURS">Highest Hours</option>
                <option value="LOW_HOURS">Lowest Hours</option>
                <option value="FREE_PERIODS">Most Free Periods</option>
                <option value="CONSECUTIVE">Consecutive Class Load</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Staff Code</th>
                  <th className="py-3 px-4 text-center">Required</th>
                  <th className="py-3 px-4 text-center">Scheduled</th>
                  <th className="py-3 px-4 text-center">Free Periods</th>
                  <th className="py-3 px-4 text-center">Max Consecutive</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {sortedStaff.map((st) => (
                  <tr key={st.staffCode} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                      {st.staffName}
                      <span className="block text-[10px] font-normal text-gray-400">
                        {st.subjectsAssigned.join(', ') || 'General Assignment'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-luna-primary-blue dark:text-cyan-400">
                      {st.staffCode}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">
                      {st.requiredHours} hrs
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900 dark:text-white">
                      {st.scheduledHours} hrs
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-600 dark:text-gray-300">
                      {st.freePeriods}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          st.maxConsecutive >= 3
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300'
                        }`}
                      >
                        {st.maxConsecutive} in a row
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {st.status === 'Complete' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {st.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Subject Distribution Table */}
      {activeTab === 'SUBJECTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Subject & Curriculum Hours Coverage
            </h3>
            <p className="text-xs text-gray-400">
              Audit mandatory weekly hours required by Anna University / autonomous syllabus.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Required</th>
                  <th className="py-3 px-4 text-center">Scheduled</th>
                  <th className="py-3 px-4 text-center">Remaining</th>
                  <th className="py-3 px-4">Assigned Faculty</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {analytics.subjectAnalytics.map((sub) => (
                  <tr key={sub.subjectCode} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                      {sub.subjectName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-luna-primary-blue dark:text-cyan-400">
                      {sub.subjectCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 uppercase">
                        {sub.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700 dark:text-gray-300">
                      {sub.requiredHours} hrs
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900 dark:text-white">
                      {sub.scheduledHours} hrs
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {sub.remainingHours > 0 ? (
                        <span className="text-red-500 font-bold">-{sub.remainingHours}</span>
                      ) : (
                        <span className="text-emerald-500 font-bold">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                      {sub.staffNames.join(', ') || 'None'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {sub.status === 'Complete' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Complete
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          {sub.missingMessage || 'Missing Hours'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Room Utilization Table */}
      {activeTab === 'ROOMS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Classroom & Hall Utilization
            </h3>
            <p className="text-xs text-gray-400">
              Campus physical infrastructure occupancy and available slot efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.roomUtilizations.map((rm) => (
              <div
                key={rm.roomNumber}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      Room {rm.roomNumber}
                    </span>
                    {rm.roomName && (
                      <span className="block text-[11px] text-gray-400">{rm.roomName}</span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {rm.utilizationRate}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full"
                    style={{ width: `${rm.utilizationRate}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Occupied: {rm.occupiedSlots} periods</span>
                  <span>Free: {rm.availableSlots} periods</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Lab Utilization Table */}
      {activeTab === 'LABS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-xs space-y-4 p-6">
          <div className="pb-3 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Laboratory Facilities Utilization
            </h3>
            <p className="text-xs text-gray-400">
              Practical computer, networks, and specialized laboratory usage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.labUtilizations.map((lb) => (
              <div
                key={lb.labCode}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {lb.labName}
                    </span>
                    <span className="block text-[11px] font-mono text-pink-500">{lb.labCode}</span>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
                    {lb.utilizationRate}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-pink-500 h-full rounded-full"
                    style={{ width: `${lb.utilizationRate}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Occupied: {lb.occupiedHours} hrs</span>
                  <span>Available: {lb.availableHours} hrs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
