import React from 'react';
import { TimetableEntry } from '@/types/timetable';
import { Lock, BookOpen, FlaskConical, User, MapPin, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { getStaffNameByCode } from '@/config/timetableConfig';

interface TimetableCardProps {
  entry: TimetableEntry;
  span?: number;
  timeRange?: string;
  durationLabel?: string;
  isSearchMatch?: boolean;
  isDragging?: boolean;
  hasConflict?: boolean;
  onDragStart?: (e: React.DragEvent, entry: TimetableEntry) => void;
  onClick?: (entry: TimetableEntry) => void;
}

export const TimetableCard: React.FC<TimetableCardProps> = ({
  entry,
  span = 1,
  timeRange,
  isSearchMatch = false,
  isDragging = false,
  hasConflict = false,
  onDragStart,
  onClick,
}) => {
  const isLab = entry.type === 'LAB';
  const isSpecial = entry.type === 'SPECIAL';
  const isNaanMuthalvan =
    entry.subjectCode === 'NM' ||
    entry.subjectCode === 'NM-301' ||
    entry.subjectName?.toLowerCase().includes('naan muthalvan') ||
    (entry.day === 'Wednesday' && entry.slotIndex >= 6 && (entry.type === 'SPECIAL' || entry.type === 'LOCKED'));
  const isLocked = entry.locked || entry.type === 'LOCKED' || isNaanMuthalvan;
  const isMultiPeriod = span > 1;

  const staffDisplayName = entry.staffName || getStaffNameByCode(entry.staffCode) || entry.staffCode;

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', JSON.stringify({ entryId: entry.id, type: entry.type }));
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) {
      onDragStart(e, entry);
    }
  };

  if (isNaanMuthalvan) {
    return (
      <div
        className="h-full min-h-[82px] rounded-xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/40 p-2 flex flex-col justify-between text-amber-950 dark:text-amber-200 select-none shadow-2xs"
        title="Wednesday Afternoon Locked: Naan Muthalvan State Skill Initiative"
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 font-bold text-xs">
            <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-mono text-[11px] font-bold text-amber-900 dark:text-amber-300">NM-301</span>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700">
            Institutional
          </span>
        </div>
        <div className="my-0.5">
          <div className="font-extrabold text-xs text-amber-950 dark:text-amber-100 leading-tight">
            Naan Muthalvan
          </div>
          <div className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-tight truncate">
            Skill & Employability Training
          </div>
        </div>
        <div className="text-[9px] font-mono text-amber-700 dark:text-amber-400 flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-800/50">
          <span>{timeRange || 'Period 6 + 7'}</span>
          <span>No Lab / Theory</span>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={!isLocked}
      onDragStart={handleDragStart}
      onClick={() => onClick && onClick(entry)}
      className={`
        group relative rounded-xl transition-all text-left select-none border cursor-pointer p-2 flex flex-col justify-between h-full min-h-[82px]
        ${isLab 
          ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-300/90 dark:border-purple-800/80 hover:bg-purple-100/80 dark:hover:bg-purple-900/40' 
          : isSpecial
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300/90 dark:border-emerald-800/80 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40'
            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700/80 hover:bg-blue-50/40 dark:hover:bg-slate-700/60 hover:border-blue-300 dark:hover:border-slate-600'}
        ${isSearchMatch ? 'ring-2 ring-blue-500 dark:ring-cyan-400 bg-blue-50/90 dark:bg-blue-950/70 shadow-md' : 'shadow-2xs'}
        ${hasConflict ? 'border-red-500 dark:border-red-600 bg-red-50/90 dark:bg-red-950/60 ring-1 ring-red-400' : ''}
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
      `}
      title={`${entry.subjectName || entry.subjectCode} (${entry.staffCode || 'Activity'}) - ${entry.roomNumber || ''}`}
    >
      <div>
        {/* Top Header: Code & Type Pill */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 font-bold text-xs font-mono">
            {isLab ? (
              <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            ) : isSpecial ? (
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
            )}
            <span className={`font-extrabold tracking-tight ${
              isLab ? 'text-purple-950 dark:text-purple-200' : isSpecial ? 'text-emerald-950 dark:text-emerald-200' : 'text-gray-950 dark:text-white'
            }`}>
              {entry.subjectCode || (isSpecial ? 'ACTIVITY' : 'CLASS')}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isMultiPeriod && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-200/90 dark:bg-purple-900/80 text-purple-950 dark:text-purple-100 border border-purple-300 dark:border-purple-700 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                2P
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-tight border ${
                isLab
                  ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                  : isSpecial
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                    : 'bg-blue-100/80 dark:bg-blue-950/70 text-blue-950 dark:text-cyan-300 border-blue-200 dark:border-blue-800'
              }`}
            >
              {isLab ? 'LAB' : isSpecial ? 'ACTIVITY' : 'THEORY'}
            </span>
          </div>
        </div>

        {/* Subject Name */}
        <div className={`font-semibold line-clamp-2 leading-snug ${
          isMultiPeriod ? 'text-xs text-purple-950 dark:text-purple-100' : isSpecial ? 'text-[11px] text-emerald-950 dark:text-emerald-100' : 'text-[11px] text-gray-900 dark:text-gray-200'
        }`}>
          {entry.subjectName || entry.subjectCode}
        </div>
      </div>

      {/* Footer: Staff Code & Room */}
      <div className="flex items-center justify-between text-[10px] text-gray-700 dark:text-gray-300 pt-1 border-t border-gray-200/70 dark:border-slate-700/60 mt-1 gap-1">
        <span 
          className="inline-flex items-center gap-1 font-bold bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-100"
          title={staffDisplayName}
        >
          <User className="w-2.5 h-2.5 shrink-0 text-gray-500 dark:text-gray-400" />
          <span>{entry.staffCode || (isSpecial ? 'FACULTY' : 'TBA')}</span>
        </span>

        {entry.roomNumber && (
          <span className="inline-flex items-center gap-0.5 text-gray-600 dark:text-gray-300 font-mono text-[9px] bg-gray-50 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-200/80 dark:border-slate-700 shrink-0">
            <MapPin className="w-2.5 h-2.5 shrink-0 text-gray-400" />
            <span>{entry.roomNumber}</span>
          </span>
        )}
      </div>

      {hasConflict && (
        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-xs">
          <AlertCircle className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};
