import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { getMyStaffTimetable, subscribeToMyStaffTimetable } from '@/services/timetableService';
import { Timetable } from '@/types/timetable';
import { Clock, BookOpen, FlaskConical, AlertCircle, RefreshCw } from 'lucide-react';

export default function StaffHours() {
  const { authorizedStaff, profile } = useAuth();
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorizedStaff?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToMyStaffTimetable(authorizedStaff.id, (data) => {
      setTimetable(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authorizedStaff]);

  const staffCode = authorizedStaff?.staffCode || profile?.staffCode || '';
  const isPublished = timetable && timetable.status === 'PUBLISHED';
  const entries = isPublished ? (timetable.entries.filter(e => e.staffCode === staffCode) || []) : [];
  const theoryEntries = entries.filter(e => e.type === 'THEORY');
  const labEntries = entries.filter(e => e.type === 'LAB');

  // Breakdown by subject
  const subjectMap = new Map<string, { code: string; name: string; theory: number; lab: number; total: number }>();
  entries.forEach(e => {
    if (!e.subjectCode) return;
    const existing = subjectMap.get(e.subjectCode) || {
      code: e.subjectCode,
      name: e.subjectName || e.subjectCode,
      theory: 0,
      lab: 0,
      total: 0,
    };
    if (e.type === 'THEORY') existing.theory += 1;
    if (e.type === 'LAB') existing.lab += 1;
    existing.total += 1;
    subjectMap.set(e.subjectCode, existing);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">Faculty Workload & Allocated Hours</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Official breakdown of weekly theory lectures and practical laboratory assignments for <strong className="text-gray-700 dark:text-gray-300">{authorizedStaff?.name || profile?.name}</strong>.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-blue-50/60 dark:bg-slate-900 border-blue-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-cyan-300 uppercase tracking-wider">Total Weekly Load</span>
              <div className="text-3xl font-extrabold text-blue-950 dark:text-white mt-1">{entries.length} Hours</div>
              <div className="text-xs text-blue-800 dark:text-gray-400 mt-0.5">Assigned instructional periods</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-cyan-950/60 text-blue-800 dark:text-cyan-400 border border-blue-200 dark:border-cyan-800/40 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/60 dark:bg-slate-900 border-emerald-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">Theory Classes</span>
              <div className="text-3xl font-extrabold text-emerald-950 dark:text-white mt-1">{theoryEntries.length} Hours</div>
              <div className="text-xs text-emerald-800 dark:text-gray-400 mt-0.5">Classroom lectures</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/60 dark:bg-slate-900 border-purple-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">Laboratory Practicals</span>
              <div className="text-3xl font-extrabold text-purple-950 dark:text-white mt-1">{labEntries.length} Hours</div>
              <div className="text-xs text-purple-800 dark:text-gray-400 mt-0.5">Continuous lab sessions</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center font-bold">
              <FlaskConical className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course-by-Course Table */}
      <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-0 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
              Course-wise Workload Distribution
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Faculty: <strong className="text-gray-900 dark:text-white">{authorizedStaff?.name || profile?.name}</strong> ({staffCode || 'N/A'})
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
                Calculating teaching hours...
              </div>
            ) : !isPublished ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Timetable Not Published Yet</h4>
                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Teaching hours and course breakdown will be available once the timetable is published by Admin.</p>
              </div>
            ) : (
              <table className="w-full min-w-[800px] text-left text-sm text-gray-700 dark:text-gray-200">
                <thead className="bg-gray-100/80 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-xs uppercase font-bold text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="py-3.5 px-4">Course Code</th>
                    <th className="py-3.5 px-4">Course Name</th>
                    <th className="py-3.5 px-4 text-center">Theory Hours</th>
                    <th className="py-3.5 px-4 text-center">Lab Hours</th>
                    <th className="py-3.5 px-4 text-right">Total Hours/Week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {Array.from(subjectMap.values()).map((sub) => (
                    <tr key={sub.code} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-luna-dark-navy dark:text-cyan-300">{sub.code}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">{sub.name}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 dark:text-emerald-400">{sub.theory} hrs</td>
                      <td className="py-3.5 px-4 text-center font-bold text-purple-700 dark:text-purple-400">{sub.lab} hrs</td>
                      <td className="py-3.5 px-4 text-right font-black text-luna-dark-navy dark:text-white">{sub.total} hrs</td>
                    </tr>
                  ))}
                  {subjectMap.size === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400 text-xs font-medium">
                        No teaching assignments found for your staff code in the active published timetable.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
