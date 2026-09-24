import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { getAllSubjects, Subject } from '@/services/subjectService';
import { BookOpen, Clock, Users, FlaskConical, RefreshCw } from 'lucide-react';

export default function StaffSubjects() {
  const { authorizedStaff, profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const staffCode = authorizedStaff?.staffCode || profile?.staffCode || '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const subList = await getAllSubjects();
        setSubjects(subList);
      } catch (e) {
        console.error('Failed to load subjects:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const mySubjects = subjects.filter(
    s => staffCode && s.assignedStaff && s.assignedStaff.includes(staffCode)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">My Assigned Courses</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Syllabus, weekly lecture requirements, and course details assigned to <strong className="text-gray-700 dark:text-gray-300">{authorizedStaff?.name || profile?.name}</strong>.
          </p>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
            Loading assigned courses...
          </div>
        ) : mySubjects.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No courses assigned</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              No academic subjects are currently mapped to your staff code ({staffCode || 'N/A'}). Please contact the department administrator if this is an error.
            </p>
          </div>
        ) : (
          mySubjects.map((sub, idx) => (
            <Card key={sub.id || `${sub.subjectCode}_${idx}`} className="hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      sub.type === 'LAB' 
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50' 
                        : 'bg-blue-50 dark:bg-cyan-950/60 text-blue-600 dark:text-cyan-400 border border-blue-100 dark:border-cyan-800/50'
                    }`}>
                      {sub.type === 'LAB' ? <FlaskConical className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">{sub.subjectName}</h4>
                      <div className="text-xs font-mono font-bold text-luna-primary-blue dark:text-cyan-400">{sub.subjectCode}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    sub.type === 'LAB' 
                      ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700/60' 
                      : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-cyan-300 border-blue-200 dark:border-blue-700/60'
                  }`}>
                    {sub.type}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span>Weekly Requirement: <strong className="text-gray-900 dark:text-white font-semibold">{sub.weeklyHours || (sub.type === 'LAB' ? 2 : 4)} hrs</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span>Class / Semester: <strong className="text-gray-900 dark:text-white font-semibold">Year {sub.year} • Sem {sub.semester}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
