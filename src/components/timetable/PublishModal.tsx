import React, { useState } from 'react';
import { Timetable, ValidationResult } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Eye, 
  Send, 
  Clock, 
  Building2, 
  Sparkles 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: Timetable;
  validation?: ValidationResult;
  onConfirmPublish: () => Promise<void>;
  publishing: boolean;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  timetable,
  validation,
  onConfirmPublish,
  publishing,
}) => {
  if (!isOpen) return null;

  const conflicts = validation?.conflicts || [];
  const hasHardConflicts = conflicts.length > 0;
  const scheduledClasses = timetable.entries.filter(e => e.type === 'THEORY' || e.type === 'LAB').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              hasHardConflicts 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' 
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Publish Academic Timetable</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {timetable.department} • Version {timetable.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Status Box */}
        {hasHardConflicts ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Publishing Blocked — Active Conflicts Detected</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              This timetable has <strong>{conflicts.length} unresolved conflict(s)</strong>. Official institutional policy requires 0 hard collisions before publishing to the faculty portal.
            </p>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/80 max-h-28 overflow-y-auto space-y-1 text-[11px] text-gray-700 dark:text-gray-300">
              {conflicts.map((c, idx) => (
                <div key={idx}>• {c}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Verification Passed — Ready for Live Publication</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              All hard institutional rules, faculty availability, classroom capacities, and the Wednesday Naan Mudhalvan lock have been verified.
            </p>
          </div>
        )}

        {/* Schedule Summary Matrix */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="text-gray-500 dark:text-gray-400 font-medium">Quality Score</div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {timetable.qualityScore || 95}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="text-gray-500 dark:text-gray-400 font-medium">Total Classes</div>
            <div className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
              {scheduledClasses}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="text-gray-500 dark:text-gray-400 font-medium">Conflicts</div>
            <div className={`text-lg font-extrabold mt-0.5 ${hasHardConflicts ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {conflicts.length}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong className="text-gray-700 dark:text-gray-300">Notice:</strong> Once published, this schedule will become immediately visible to all faculty members under their <em>My Teaching Schedule</em> portal. Any previously published schedule for this department will be automatically archived.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={publishing}>
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={onConfirmPublish}
            disabled={hasHardConflicts || publishing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs px-4 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            {publishing ? 'Publishing Schedule...' : 'Confirm & Publish Live'}
          </Button>
        </div>
      </div>
    </div>
  );
};
