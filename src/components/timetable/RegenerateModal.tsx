import React, { useState } from 'react';
import { Timetable, Subject, StaffProfile } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import { X, RefreshCw, Sparkles, BookOpen, Layers, CheckCircle2, ShieldAlert, ArrowRight, Dices, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: Timetable;
  subjects: Subject[];
  staff: StaffProfile[];
  onRegenerateFull: (options?: { seed?: number; consistentMode?: boolean }) => Promise<void>;
  onRegenerateSubject: (subjectCode: string) => Promise<void>;
  onAutoFix: () => Promise<void>;
  loading: boolean;
}

export const RegenerateModal: React.FC<RegenerateModalProps> = ({
  isOpen,
  onClose,
  timetable,
  subjects,
  staff,
  onRegenerateFull,
  onRegenerateSubject,
  onAutoFix,
  loading,
}) => {
  if (!isOpen) return null;
  const navigate = useNavigate();

  const [mode, setMode] = useState<'AUTO_FIX' | 'SUBJECT' | 'FULL'>('FULL');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(
    subjects.length > 0 ? subjects[0].subjectCode : ''
  );
  const [fullGenType, setFullGenType] = useState<'CONSISTENT' | 'RANDOM'>('RANDOM');

  const handleSubmit = async () => {
    try {
      if (mode === 'AUTO_FIX') {
        await onAutoFix();
        onClose();
      } else if (mode === 'SUBJECT') {
        if (!selectedSubjectCode) {
          toast.error('Please select a subject to reschedule.');
          return;
        }
        await onRegenerateSubject(selectedSubjectCode);
        onClose();
      } else if (mode === 'FULL') {
        await onRegenerateFull({
          consistentMode: fullGenType === 'CONSISTENT',
          seed: fullGenType === 'RANDOM' ? Math.floor(Math.random() * 9000000) + 100000 : 48,
        });
        onClose();
      }
    } catch (err: any) {
      toast.error('Regeneration request failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-luna-primary-blue/10 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Regenerate & Optimize Schedule</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose precision partial rescheduling or full engine run</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Selector */}
        <div className="space-y-2.5 text-xs">
          {/* 1. Auto Fix */}
          <div
            onClick={() => setMode('AUTO_FIX')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              mode === 'AUTO_FIX'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-luna-primary-blue dark:border-cyan-500 ring-1 ring-luna-primary-blue dark:ring-cyan-500 text-luna-dark-navy dark:text-cyan-200'
                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
                Auto-Fix Active Conflicts Only (Recommended)
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-semibold">
                Safest
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-1 pl-6">
              Preserves 95% of your existing timetable layout and only relocates conflicting periods to valid free slots.
            </p>
          </div>

          {/* 2. Reschedule Single Subject */}
          <div
            onClick={() => setMode('SUBJECT')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              mode === 'SUBJECT'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-luna-primary-blue dark:border-cyan-500 ring-1 ring-luna-primary-blue dark:ring-cyan-500 text-luna-dark-navy dark:text-cyan-200'
                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
                Reschedule Specific Subject
              </span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded font-semibold">
                Targeted
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-1 pl-6">
              Keeps all other subjects locked in place and finds optimal fresh slots for the selected course.
            </p>

            {mode === 'SUBJECT' && (
              <div className="mt-3 pl-6">
                <select
                  value={selectedSubjectCode || ''}
                  onChange={(e) => setSelectedSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
                >
                  {subjects.map((s, idx) => (
                    <option key={s.id || `${s.subjectCode}_${idx}`} value={s.subjectCode}>
                      {s.subjectCode} - {s.subjectName} ({s.weeklyHours} hrs)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Full Re-generation */}
          <div
            onClick={() => setMode('FULL')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              mode === 'FULL'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400 dark:ring-amber-600 text-amber-950 dark:text-amber-200'
                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Complete Full Timetable Regeneration
              </span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-semibold">
                Reset Draft
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-1 pl-6">
              Re-executes the global CSP optimization engine to generate a fresh schedule while enforcing the <strong>Everyday Afternoon Lab Policy</strong>.
            </p>

            {mode === 'FULL' && (
              <div className="mt-3 pl-6 space-y-2 border-t border-amber-200/60 dark:border-amber-800/60 pt-2.5">
                <div className="font-semibold text-amber-900 dark:text-amber-300 text-[11px] mb-1">Select Output Style:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullGenType('CONSISTENT');
                    }}
                    className={`p-2 rounded-lg border text-left flex items-start gap-1.5 cursor-pointer ${
                      fullGenType === 'CONSISTENT'
                        ? 'bg-white dark:bg-slate-800 border-amber-500 ring-1 ring-amber-400 shadow-xs text-gray-900 dark:text-white'
                        : 'bg-amber-100/40 dark:bg-slate-800/40 border-amber-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">Consistent Standard</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">Deterministic slot layout</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullGenType('RANDOM');
                    }}
                    className={`p-2 rounded-lg border text-left flex items-start gap-1.5 cursor-pointer ${
                      fullGenType === 'RANDOM'
                        ? 'bg-white dark:bg-slate-800 border-amber-500 ring-1 ring-amber-400 shadow-xs text-gray-900 dark:text-white'
                        : 'bg-amber-100/40 dark:bg-slate-800/40 border-amber-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <Dices className="w-3.5 h-3.5 mt-0.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">Fresh Variation</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">Explores alternate slots</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick link to Generator Studio */}
        <div className="bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
          <span>Need step-by-step preflight checks & rule tuning?</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/admin/generate');
            }}
            className="text-luna-primary-blue dark:text-cyan-400 hover:underline font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
          >
            Open Generator Studio <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-luna-primary-blue hover:bg-luna-steel-blue text-white font-bold px-4 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Execute Regeneration'}
          </Button>
        </div>
      </div>
    </div>
  );
};
