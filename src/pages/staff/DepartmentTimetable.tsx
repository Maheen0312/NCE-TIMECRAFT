import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getAllPublishedTimetables } from '@/services/timetableService';
import { Timetable, TimetableEntry } from '@/types/timetable';
import { printTimetable } from '@/utils/printUtils';
import { formatYearDisplay, matchYear, YEAR_CONFIGS } from '@/utils/yearUtils';
import { Calendar, Clock, Lock, Coffee, Utensils, Printer, Download, RefreshCw, Users, Building2, CheckCircle2 } from 'lucide-react';
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

export default function StaffDepartmentTimetable() {
  const [allPublished, setAllPublished] = useState<Timetable[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('III');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const published = await getAllPublishedTimetables();
      setAllPublished(published);
      if (published.length > 0) {
        // If current selectedYear has no published timetable, pick the first one that does
        const matchingCurrent = published.find(t => matchYear(t.year, selectedYear));
        if (!matchingCurrent && published[0]?.year) {
          setSelectedYear(published[0].year);
        }
      }
    } catch (e) {
      console.error('Error fetching published department timetables:', e);
      toast.error('Failed to load published timetables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeTimetable = allPublished.find(t => matchYear(t.year, selectedYear)) || null;

  const getSlotEntry = (day: string, slotIndex: number): TimetableEntry | undefined => {
    if (!activeTimetable) return undefined;
    return activeTimetable.entries.find(e => e.day === day && e.slotIndex === slotIndex);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">Department Master Schedule</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
              Published View
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Year-wise department schedules for 2nd, 3rd, and Final Year cohorts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={load} title="Refresh published schedules">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => activeTimetable && printTimetable(activeTimetable)} 
            disabled={!activeTimetable}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Schedule ({formatYearDisplay(selectedYear)})
          </Button>
        </div>
      </div>

      {/* Year Selection Tabs */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">
            Select Cohort:
          </span>
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
            {YEAR_CONFIGS.map(cfg => {
              const isSelected = matchYear(cfg.key, selectedYear);
              const isPublished = allPublished.some(t => matchYear(t.year, cfg.key));
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => setSelectedYear(cfg.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs font-extrabold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span>{cfg.label}</span>
                  {isPublished && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                      (Live)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTimetable && (
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {activeTimetable.department}
            </span>
            <span>•</span>
            <span className="font-semibold text-blue-700 dark:text-cyan-400">
              Semester {activeTimetable.semester}
            </span>
            <span>•</span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              {activeTimetable.entries?.length || 0} Periods
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      <Card className="overflow-hidden shadow-sm border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
              Loading published schedules...
            </div>
          ) : !activeTimetable ? (
            <div className="p-16 text-center">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                {formatYearDisplay(selectedYear)} Timetable Not Published Yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                The department administration has not officially published the timetable for {formatYearDisplay(selectedYear)} yet.
              </p>
              {allPublished.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Available Published Schedules:</span>
                  {allPublished.map(pub => (
                    <Button
                      key={pub.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedYear(pub.year)}
                      className="text-xs font-bold text-blue-700 dark:text-cyan-300"
                    >
                      View {formatYearDisplay(pub.year)} (Sem {pub.semester})
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
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

                          if (day === 'Wednesday' && period.slotIndex >= 6) {
                            return (
                              <td key={day} className="p-2 border-r border-gray-200 dark:border-slate-800 last:border-r-0 align-top bg-amber-50/40 dark:bg-amber-950/20">
                                <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-800 text-center shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-amber-900 dark:text-amber-300 text-xs">NM101</span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 flex items-center">
                                      <Lock className="w-2.5 h-2.5 mr-0.5" /> LOCKED
                                    </span>
                                  </div>
                                  <div className="font-bold text-amber-900 dark:text-amber-200 text-xs mt-1">Naan Mudhalvan</div>
                                  <div className="text-[10px] text-amber-800 dark:text-amber-400 mt-1 font-medium">Auditorium Complex</div>
                                </div>
                              </td>
                            );
                          }

                          if (!entry) {
                            return (
                              <td key={day} className="py-2 px-2 border-r border-gray-200 dark:border-slate-800 last:border-r-0 text-center align-middle bg-gray-50/50 dark:bg-slate-900/60">
                                <span className="inline-block px-2.5 py-1 rounded-md text-gray-600 dark:text-slate-300 bg-gray-100/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 font-semibold text-[11px] tracking-wide">Free Period</span>
                              </td>
                            );
                          }

                          if (entry.type === 'LAB') {
                            return (
                              <td key={day} className="p-2 border-r border-gray-200 dark:border-slate-800 last:border-r-0 align-top">
                                <div className="p-2.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-purple-950 dark:text-purple-300 text-xs">{entry.subjectCode}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 border border-purple-300/60 dark:border-purple-700">
                                      LAB
                                    </span>
                                  </div>
                                  <div className="font-bold text-gray-900 dark:text-white text-xs mt-1 line-clamp-1" title={entry.subjectName}>{entry.subjectName}</div>
                                  <div className="text-[11px] text-purple-800 dark:text-purple-300 font-bold mt-1.5 flex items-center justify-between">
                                    <span className="font-mono">{entry.staffCode}</span>
                                    <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300 font-medium flex items-center">
                                      <Building2 className="w-3 h-3 mr-1" />
                                      {entry.roomNumber}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={day} className="p-2 border-r border-gray-200 dark:border-slate-800 last:border-r-0 align-top">
                              <div className="p-2.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-luna-dark-navy dark:text-cyan-300 text-xs">{entry.subjectCode}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-cyan-200 border border-blue-200 dark:border-blue-700">
                                    THEORY
                                  </span>
                                </div>
                                <div className="font-bold text-gray-900 dark:text-white text-xs mt-1 line-clamp-1" title={entry.subjectName}>{entry.subjectName}</div>
                                <div className="text-[11px] text-luna-primary-blue dark:text-cyan-400 font-bold mt-1.5 flex items-center justify-between">
                                  <span className="font-mono">{entry.staffCode}</span>
                                  <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300 font-medium flex items-center">
                                    <Building2 className="w-3 h-3 mr-1" />
                                    {entry.roomNumber}
                                  </span>
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
