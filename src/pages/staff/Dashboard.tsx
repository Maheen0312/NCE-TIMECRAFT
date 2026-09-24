import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getMyStaffTimetable, subscribeToMyStaffTimetable } from '@/services/timetableService';
import { Timetable } from '@/types/timetable';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2,
  Lock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StaffDashboard() {
  const navigate = useNavigate();
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
  
  const staffClasses = isPublished && staffCode && timetable
    ? timetable.entries.filter(e => e.staffCode === staffCode && (e.type === 'THEORY' || e.type === 'LAB'))
    : [];
  const mySubjects = Array.from(new Set(staffClasses.map(c => c.subjectCode)));

  // Current day's classes
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayIndex = new Date().getDay();
  const todayName = (currentDayIndex >= 1 && currentDayIndex <= 5) ? dayNames[currentDayIndex] : 'Monday';
  const todayClasses = staffClasses.filter(c => c.day === todayName);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-luna-dark-navy via-luna-deep-navy to-luna-deep-blue p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-luna-primary-blue/40 text-cyan-200 border border-cyan-400/30">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-cyan-300" /> Faculty Portal
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Welcome, {authorizedStaff?.name || profile?.name || 'Faculty Member'}
          </h2>
          <p className="text-sm text-cyan-100">
            {authorizedStaff?.department || 'Department of Computer Science & Engineering'} • Staff Code: <strong className="text-white">{staffCode || 'N/A'}</strong>
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Courses</span>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                {isPublished ? mySubjects.length : 0}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {isPublished ? 'Active subjects' : 'Awaiting publish'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 border border-blue-100 dark:border-cyan-800/40 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weekly Hours</span>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                {isPublished ? `${staffClasses.length} hrs` : '0 hrs'}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {isPublished ? 'Teaching periods' : 'Draft pending review'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule Status</span>
              <div className={`text-sm font-bold mt-2 flex items-center ${isPublished ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isPublished ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Published & Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Not Published Yet
                  </>
                )}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {isPublished ? 'Live in Staff Portal' : 'Admin preparation'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-luna-primary-blue/10 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-400 border border-luna-primary-blue/20 dark:border-cyan-800/40 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-luna-primary-blue/10 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Schedule Overview ({todayName})</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming classes scheduled for today.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/staff/timetable')} className="dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800">
                View My Timetable
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>

            <div className="space-y-3 pt-2">
              {!isPublished ? (
                <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl text-xs text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-800">
                  Timetable has not been published by Admin yet. Your instructional periods will appear here once published.
                </div>
              ) : todayClasses.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/60 rounded-xl text-xs text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-slate-800">
                  No classes scheduled for {todayName}.
                </div>
              ) : (
                todayClasses.map((c) => (
                  <div key={c.id} className="p-3.5 bg-blue-50/60 dark:bg-slate-800/80 rounded-xl border border-blue-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-xs bg-luna-primary-blue dark:bg-blue-600 text-white px-2 py-1 rounded">
                        {c.subjectCode}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{c.subjectName}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center space-x-2 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          <span>{c.startTime} — {c.endTime}</span>
                          <span>•</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200 font-medium">Room: {c.roomNumber}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-cyan-300 border border-blue-200 dark:border-blue-700/60">
                      {c.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* State Directive Notice */}
        <Card className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Institutional Policy Reminder</span>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              Every <strong>Wednesday Afternoon (01:40 PM – 04:20 PM)</strong> is strictly reserved for the Tamil Nadu <strong>Naan Mudhalvan</strong> initiative. No departmental lectures or makeup practicals are permitted during this period.
            </p>
            <div className="pt-2">
              <Button size="sm" variant="outline" className="w-full text-xs dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800" onClick={() => navigate('/staff/timetable')}>
                View My Teaching Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
