import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Lock, Unlock, Plus, Trash2, Calendar, X, RefreshCw, ShieldAlert, Sparkles, GraduationCap } from 'lucide-react';
import { getAllSpecialSessions, createSpecialSession, updateSpecialSession, deleteSpecialSession } from '@/services/specialSessionService';
import { SpecialSession } from '@/types/timetable';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { YearSelector } from '@/components/common/YearSelector';
import { useYearFilter } from '@/contexts/YearFilterContext';
import { CanonicalYear, matchYear } from '@/utils/yearUtils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminSpecialSessions() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SpecialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingSession, setDeletingSession] = useState<SpecialSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { selectedYear, setSelectedYear, yearConfig } = useYearFilter();
  const [viewYearFilter, setViewYearFilter] = useState<CanonicalYear | 'ALL'>(selectedYear);

  useEffect(() => {
    setViewYearFilter(selectedYear);
  }, [selectedYear]);

  const [formData, setFormData] = useState<{
    name: string;
    year: string;
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    period: 'MORNING' | 'AFTERNOON' | 'FULL_DAY';
    type: 'SPECIAL';
    locked: boolean;
    description: string;
  }>({
    name: '',
    year: selectedYear,
    day: 'Wednesday',
    period: 'AFTERNOON',
    type: 'SPECIAL',
    locked: true,
    description: '',
  });

  const fetchSessions = async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    try {
      const data = await getAllSpecialSessions();
      setSessions(data);
    } catch (error) {
      console.warn('Notice fetching special sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSessions();
    }
  }, [authLoading, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter session name');
      return;
    }

    try {
      await createSpecialSession(formData);
      toast.success('Special session created');
      setIsModalOpen(false);
      fetchSessions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save special session');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSession || !deletingSession.id) return;
    setIsDeleting(true);
    try {
      await deleteSpecialSession(deletingSession.id);
      setSessions(prev => prev.filter(s => s.id !== deletingSession.id));
      toast.success('Special session removed');
      setDeletingSession(null);
      await fetchSessions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete session');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleLock = async (session: SpecialSession) => {
    const newStatus = !session.locked;
    try {
      if (session.id && session.id !== 'naan_mudhalvan_default') {
        await updateSpecialSession(session.id, { locked: newStatus });
      } else {
        // Persist default entry with updated lock status
        await createSpecialSession({
          name: session.name,
          year: session.year || 'ALL',
          day: session.day,
          period: session.period,
          type: 'SPECIAL',
          locked: newStatus,
          description: session.description || '',
        });
      }
      toast.success(`${session.name} is now ${newStatus ? 'LOCKED (classes prevented)' : 'UNLOCKED (classes allowed)'}`);
      await fetchSessions();
    } catch (err: any) {
      toast.error('Failed to update lock status');
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (viewYearFilter === 'ALL') return true;
    return !s.year || s.year === 'ALL' || matchYear(s.year, viewYearFilter);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Locked Sessions & Institutional Events</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define mandatory locked or flexible periods per academic year that the automatic scheduling engine must preserve conflict-free.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Locked Session
          </Button>
        </div>
      </div>

      {/* Year Filter Banner */}
      <YearSelector
        value={viewYearFilter}
        onChange={(y) => {
          setViewYearFilter(y);
          if (y !== 'ALL') setSelectedYear(y);
        }}
        showAllOption={true}
      />

      {/* Special Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            {viewYearFilter === 'ALL' ? 'All Registered Special Events' : `Events for ${yearConfig.label}`} ({filteredSessions.length})
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Locking prevents class scheduling during the period window
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
            <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No locked sessions configured for this year filter.</p>
            <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)} className="mt-3">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((session) => (
              <Card key={session.id || session.name} className={`border transition-all ${session.locked ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10' : 'border-gray-200 dark:border-slate-800'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${session.locked ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'}`}>
                        {session.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">{session.name}</h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {session.year === 'II' ? '2nd Year' :
                             session.year === 'III' ? '3rd Year' :
                             session.year === 'IV' ? '4th Year' : 'All Years'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {session.day} • {session.period === 'MORNING' ? 'Morning (Periods 1-4)' : session.period === 'AFTERNOON' ? 'Afternoon (Periods 5-7)' : 'Full Day'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLock(session)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                          session.locked 
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/80 dark:hover:bg-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        }`}
                        title={session.locked ? 'Click to Unlock (Allow classes)' : 'Click to Lock (Prevent classes)'}
                      >
                        {session.locked ? (
                          <>
                            <Lock className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />
                            Locked
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                            Unlocked
                          </>
                        )}
                      </button>
                      {session.id && session.id !== 'naan_mudhalvan_default' && (
                        <button
                          onClick={() => setDeletingSession(session)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {session.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      {session.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Special Session"
        itemName={deletingSession?.name}
        description="Are you sure you want to remove this locked session? The engine will make this time slot available again for general classes."
        isDeleting={isDeleting}
      />

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800">
                <h3 className="font-bold text-luna-dark-navy dark:text-white text-lg">Add Locked Session</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Event / Session Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Naan Mudhalvan, Placement Training, Seminar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Target Year
                    </label>
                    <select
                      value={formData.year || 'ALL'}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="ALL">All Academic Years</option>
                      <option value="II">2nd Year (Year II)</option>
                      <option value="III">3rd Year (Year III)</option>
                      <option value="IV">4th Year (Year IV)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Day
                    </label>
                    <select
                      value={formData.day || 'Monday'}
                      onChange={(e) => setFormData({ ...formData, day: e.target.value as any })}
                      className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Period Window
                  </label>
                  <select
                    value={formData.period || 'MORNING'}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="MORNING">Morning Session (Periods 1 to 4)</option>
                    <option value="AFTERNOON">Afternoon Session (Periods 5 to 7)</option>
                    <option value="FULL_DAY">Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Description / Notes
                  </label>
                  <Input
                    placeholder="Notes or justification for locking"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="session-locked"
                    checked={formData.locked}
                    onChange={(e) => setFormData({ ...formData, locked: e.target.checked })}
                    className="rounded border-gray-300 dark:border-slate-700 text-luna-primary-blue focus:ring-luna-primary-blue h-4 w-4"
                  />
                  <label htmlFor="session-locked" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lock this session (Prevent class scheduling during this slot)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="font-semibold shadow-sm">
                    Save Session
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
