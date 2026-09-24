import React from 'react';
import { ValidationResult, ValidationConflict } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  UserX, 
  Building2, 
  Lock, 
  Layers 
} from 'lucide-react';

interface ConflictPanelProps {
  validation?: ValidationResult;
  onAutoFix?: () => void;
  onHighlightSlot?: (day: string, slotIndex: number) => void;
  autoFixing?: boolean;
}

export const ConflictPanel: React.FC<ConflictPanelProps> = ({
  validation,
  onAutoFix,
  onHighlightSlot,
  autoFixing = false,
}) => {
  const conflicts = validation?.conflicts || [];
  const detailedConflicts = validation?.detailedConflicts || [];
  const hasConflicts = conflicts.length > 0;

  // Checklist verification states
  const hasStaffConflicts = (validation?.staffConflicts?.length || 0) > 0;
  const hasRoomConflicts = (validation?.roomConflicts?.length || 0) > 0;
  const hasLabConflicts = (validation?.labConflicts?.length || 0) > 0;
  const hasLockedConflicts = (validation?.lockedSessionConflicts?.length || 0) > 0;
  const hasHoursConflicts = (validation?.missingHours?.length || 0) > 0;

  return (
    <div className="space-y-4">
      {/* Status Summary Banner */}
      <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
        hasConflicts 
          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200' 
          : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
      }`}>
        <div className="flex items-start gap-2.5">
          {hasConflicts ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="text-sm font-bold">
              {hasConflicts ? `${conflicts.length} Constraint Conflict(s) Detected` : '100% Conflict-Free Schedule'}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              {hasConflicts 
                ? 'Review and resolve collisions below or trigger automatic AI-assisted re-allocation.' 
                : 'All faculty, room, locked session, and laboratory constraints are satisfied.'}
            </p>
          </div>
        </div>

        {hasConflicts && onAutoFix && (
          <Button
            size="sm"
            onClick={onAutoFix}
            disabled={autoFixing}
            className="shrink-0 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {autoFixing ? 'Fixing...' : 'Auto Fix'}
          </Button>
        )}
      </div>

      {/* Constraints Validation Checklist */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2.5">
        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
          <span>Constraint Verification</span>
          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400 font-mono">
            {5 - [hasStaffConflicts, hasRoomConflicts, hasLabConflicts, hasLockedConflicts, hasHoursConflicts].filter(Boolean).length}/5 Passed
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Faculty Availability & Collision Check</span>
            </div>
            {hasStaffConflicts ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Issue
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> OK
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Room Double-Booking Check</span>
            </div>
            {hasRoomConflicts ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Issue
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> OK
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Wednesday Naan Mudhalvan Lock</span>
            </div>
            {hasLockedConflicts ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Issue
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Locked
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Lab Continuous 2-Hour Blocks</span>
            </div>
            {hasLabConflicts ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Issue
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> OK
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-800 dark:text-gray-200">Weekly Subject Hours Quota</span>
            </div>
            {hasHoursConflicts ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Missing
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Granular Conflicts List */}
      {hasConflicts && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Issue Details ({conflicts.length})
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {detailedConflicts.length > 0 ? (
              detailedConflicts.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 text-xs shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      {c.type.replace('_', ' ')}
                    </span>
                    {c.day && c.slotIndex !== undefined && onHighlightSlot && (
                      <button
                        onClick={() => onHighlightSlot(c.day!, c.slotIndex!)}
                        className="text-[11px] text-luna-primary-blue dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
                      >
                        {c.day} P{c.slotIndex + 1}
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{c.message}</p>
                </div>
              ))
            ) : (
              conflicts.map((msg, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 text-xs text-gray-800 dark:text-gray-200 shadow-2xs">
                  <p className="leading-relaxed">{msg}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
