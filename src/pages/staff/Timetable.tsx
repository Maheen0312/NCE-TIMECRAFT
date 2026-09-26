import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getMyStaffTimetable, subscribeToMyStaffTimetable } from '@/services/timetableService';
import { Timetable, TimetableEntry } from '@/types/timetable';
import { YEAR_CONFIGS, formatYearDisplay, matchYear } from '@/utils/yearUtils';
import { 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  BookOpen, 
  Printer, 
  RefreshCw,
  Coffee,
  Utensils,
  Lock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const periodTimeDefinitions = [
  { slotIndex: 0, time: '09:10 - 10:00', label: 'Period 1', type: 'CLASS' },
  { slotIndex: 1, time: '10:00 - 10:50', label: 'Period 2', type: 'CLASS' },
  { slotIndex: 2, time: '10:50 - 11:10', label: 'Tea Break', type: 'BREAK' },
  { slotIndex: 3, time: '11:10 - 12:00', label: 'Period 3', type: 'CLASS' },
  { slotIndex: 4, time: '12:00 - 12:50', label: 'Period 4', type: 'CLASS' },
  { slotIndex: 5, time: '12:50 - 01:40', label: 'Lunch Break', type: 'LUNCH' },
  { slotIndex: 6, time: '01:40 - 02:30', label: 'Period 5', type: 'CLASS' },
  { slotIndex: 7, time: '02:30 - 03:20', label: 'Period 6', type: 'CLASS' },
  { slotIndex: 8, time: '03:20 - 04:20', label: 'Period 7', type: 'CLASS' },
];

export default function StaffTimetable() {
  const { authorizedStaff, profile } = useAuth();

  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchStaffTimetable = async () => {
    if (!authorizedStaff?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const staffTimetable = await getMyStaffTimetable(authorizedStaff.id, selectedCohort);
      setTimetable(staffTimetable);
    } catch (error) {
      console.warn('Notice loading staff timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authorizedStaff?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubscribe = subscribeToMyStaffTimetable(
      authorizedStaff.id, 
      (data) => {
        setTimetable(data);
        setLoading(false);
      },
      selectedCohort
    );

    return () => unsubscribe();
  }, [authorizedStaff, selectedCohort]);

  const handlePrint = () => {
    window.print();
  };

  const getSlotEntry = (day: string, slotIndex: number): TimetableEntry | undefined => {
    if (!timetable || !timetable.entries) return undefined;
    return timetable.entries.find(e => e.day === day && e.slotIndex === slotIndex);
  };

  const staffCode = authorizedStaff?.staffCode || profile?.staffCode || '';
  const staffClasses = timetable?.entries.filter(e => 
    e.staffCode === staffCode && (e.type === 'THEORY' || e.type === 'LAB')
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">My Teaching Schedule</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800/40">
              Staff Portal
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Personalized academic timetable and assigned instructional periods for <strong className="text-gray-700 dark:text-gray-300">{authorizedStaff?.name || profile?.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cohort Filter Tabs */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 border border-gray-200 dark:border-slate-700">
            {(['ALL', 'II', 'III', 'IV'] as const).map(yr => {
              const isSelected = selectedCohort === yr;
              let label = 'All Cohorts';
              if (yr === 'II') label = '2nd Year (Sem 3)';
              if (yr === 'III') label = '3rd Year (Sem 5)';
              if (yr === 'IV') label = 'Final Year (Sem 7)';
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedCohort(yr)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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

          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStaffTimetable} 
            disabled={loading}
            className="dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint} 
            disabled={!timetable} 
            className="dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Schedule
          </Button>
        </div>
      </div>

      {/* Faculty Identity & Workload Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-luna-primary-blue/10 dark:bg-cyan-950/70 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center font-bold border border-luna-primary-blue/20 dark:border-cyan-800/40 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">Faculty Member</span>
            <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {authorizedStaff?.name || profile?.name || 'Authorized Faculty'}
            </div>
            <div className="text-[11px] font-semibold text-luna-primary-blue dark:text-cyan-400 font-mono mt-0.5">
              Code: {staffCode || 'Assigned'} • {authorizedStaff?.department || 'CSE'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">Weekly Teaching Load</span>
            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
              {staffClasses.length} Scheduled Hours/Week
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {staffClasses.filter(c => c.type === 'THEORY').length} Theory • {staffClasses.filter(c => c.type === 'LAB').length} Lab periods
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold border border-purple-200/60 dark:border-purple-800/40 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">Active Courses</span>
            <div className="font-bold text-purple-700 dark:text-purple-300 text-sm truncate">
              {Array.from(new Set(staffClasses.map(c => c.subjectCode))).join(', ') || 'None assigned'}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {Array.from(new Set(staffClasses.map(c => c.subjectCode))).length} Course(s)
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <Card className="overflow-hidden shadow-xs border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
              Loading your personal schedule...
            </div>
          ) : !timetable || timetable.status !== 'PUBLISHED' ? (
            <div className="p-16 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800/50">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                Timetable has not been published by Admin yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                The academic schedule is currently undergoing administrative review. Once the Administrator officially publishes the final timetable, your assigned courses and instructional periods will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[780px] border-collapse text-left">
                <thead>
                  <tr className="bg-luna-dark-navy dark:bg-slate-900 text-white text-xs uppercase font-bold tracking-wider border-b border-blue-900/50 dark:border-slate-800">
                    <th className="py-3 px-4 w-32 border-r border-blue-900/50 dark:border-slate-800 sticky left-0 z-10 bg-luna-dark-navy dark:bg-slate-900 text-white">Time / Period</th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="py-3 px-4 border-r border-blue-900/50 dark:border-slate-800 last:border-r-0 text-center text-white">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                  {periodTimeDefinitions.map((period) => {
                    const isBreak = period.type === 'BREAK';
                    const isLunch = period.type === 'LUNCH';

                    if (isBreak || isLunch) {
                      return (
                        <tr key={period.slotIndex} className={isBreak ? 'bg-amber-50/70 dark:bg-amber-950/30' : 'bg-emerald-50/70 dark:bg-emerald-950/30'}>
                          <td className={`py-2 px-3 font-semibold border-r border-gray-200 dark:border-slate-800 sticky left-0 z-10 ${
                            isBreak 
                              ? 'bg-amber-100/90 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200' 
                              : 'bg-emerald-100/90 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200'
                          }`}>
                            <div className="font-mono text-[11px] font-bold text-gray-900 dark:text-gray-100">{period.time}</div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">{period.label}</div>
                          </td>
                          <td colSpan={5} className="py-2.5 px-4 text-center">
                            <div className="inline-flex items-center space-x-2 font-bold text-xs">
                              {isBreak ? (
                                <>
                                  <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  <span className="text-amber-900 dark:text-amber-200 font-extrabold">Tea Break (10:50 AM – 11:10 AM)</span>
                                </>
                              ) : (
                                <>
                                  <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-emerald-900 dark:text-emerald-200 font-extrabold">Lunch Break (12:50 PM – 01:40 PM)</span>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={period.slotIndex} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky left-0 z-10 align-top">
                          <div className="font-bold text-gray-900 dark:text-white text-xs">{period.label}</div>
                          <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{period.time}</div>
                        </td>

                        {daysOfWeek.map((day) => {
                          const entry = getSlotEntry(day, period.slotIndex);
                          const isMyClass = entry && entry.staffCode === staffCode;

                          // Wednesday afternoon locked for Naan Mudhalvan
                          if (day === 'Wednesday' && period.slotIndex >= 6) {
                            return (
                              <td key={day} className="p-2 border-r border-gray-200 dark:border-slate-800 last:border-r-0 align-top bg-amber-50/40 dark:bg-amber-950/20">
                                <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-800/80 text-center shadow-2xs">
                                  <div className="flex items-center justify-center gap-1 font-bold text-amber-900 dark:text-amber-300 text-xs">
                                    <Lock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                    <span>Naan Mudhalvan</span>
                                  </div>
                                  <div className="text-[10px] text-amber-800 dark:text-amber-400 mt-0.5 font-medium">Auditorium (Locked)</div>
                                </div>
                              </td>
                            );
                          }

                          if (!entry || !isMyClass) {
                            return (
                              <td key={day} className="py-2 px-2 border-r border-gray-200 dark:border-slate-800 last:border-r-0 text-center align-middle bg-gray-50/50 dark:bg-slate-900/60">
                                <span className="inline-block px-2.5 py-1 rounded-md text-gray-600 dark:text-slate-300 bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 font-semibold text-[11px] tracking-wide">
                                  Free Period
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={day} className="p-2 border-r border-gray-200 dark:border-slate-800 last:border-r-0 align-top">
                              <div className="p-2.5 rounded-xl shadow-xs transition-shadow bg-luna-primary-blue dark:bg-blue-600 text-white border border-blue-600 dark:border-blue-500">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono font-bold text-xs text-white">{entry.subjectCode}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {entry.year && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-white/25 text-white">
                                        {formatYearDisplay(entry.year)}
                                      </span>
                                    )}
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-white/20 text-white">
                                      {entry.type}
                                    </span>
                                  </div>
                                </div>
                                <div className="font-bold text-xs mt-1 leading-tight line-clamp-1 text-white" title={entry.subjectName}>
                                  {entry.subjectName}
                                </div>
                                <div className="text-[10px] mt-1.5 flex items-center justify-between text-blue-100 dark:text-cyan-100 font-medium">
                                  <span className="flex items-center">
                                    <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                    {entry.roomNumber}
                                  </span>
                                  <span className="font-mono font-bold">{period.label}</span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
