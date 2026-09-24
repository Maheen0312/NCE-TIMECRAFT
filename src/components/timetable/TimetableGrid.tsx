import React, { useState, forwardRef } from 'react';
import { Timetable, TimetableEntry } from '@/types/timetable';
import { TimetableCard } from './TimetableCard';
import { 
  Lock, 
  Plus, 
  Coffee, 
  Utensils, 
  Layers, 
  Check, 
  CalendarDays, 
  Table, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  MapPin, 
  BookOpen, 
  FlaskConical,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  WORKING_DAYS, 
  MASTER_PERIOD_DEFINITIONS, 
  NAAN_MUTHALVAN_CONFIG,
  getStaffNameByCode
} from '@/config/timetableConfig';

interface TimetableGridProps {
  timetable: Timetable;
  searchQuery?: string;
  staffFilter?: string;
  typeFilter?: string;
  roomFilter?: string;
  onMoveClass?: (entryId: string, targetDay: string, targetSlotIndex: number) => void;
  onSelectEntry?: (entry: TimetableEntry) => void;
  onAddClassToSlot?: (day: string, slotIndex: number) => void;
}

export const TimetableGrid = forwardRef<HTMLDivElement, TimetableGridProps>(({
  timetable,
  searchQuery = '',
  staffFilter = 'ALL',
  typeFilter = 'ALL',
  roomFilter = 'ALL',
  onMoveClass,
  onSelectEntry,
  onAddClassToSlot,
}, ref) => {
  const [dragOverSlot, setDragOverSlot] = useState<{ day: string; slotIndex: number } | null>(null);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [mergeContinuousSlots, setMergeContinuousSlots] = useState<boolean>(true);
  const [activeViewMode, setActiveViewMode] = useState<'GRID' | 'DAY'>('GRID');
  const [selectedMobileDay, setSelectedMobileDay] = useState<string>('Monday');

  const getSlotEntry = (day: string, slotIndex: number): TimetableEntry | undefined => {
    return timetable.entries.find(e => e.day === day && e.slotIndex === slotIndex);
  };

  const isSearchMatch = (entry?: TimetableEntry): boolean => {
    if (!entry || !searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return (
      (entry.subjectCode?.toLowerCase().includes(q) ?? false) ||
      (entry.subjectName?.toLowerCase().includes(q) ?? false) ||
      (entry.staffCode?.toLowerCase().includes(q) ?? false) ||
      (entry.staffName?.toLowerCase().includes(q) ?? false) ||
      (entry.roomNumber?.toLowerCase().includes(q) ?? false)
    );
  };

  const isFilteredOut = (entry?: TimetableEntry): boolean => {
    if (!entry) return false;
    if (staffFilter !== 'ALL' && entry.staffCode !== staffFilter) return true;
    if (typeFilter !== 'ALL' && entry.type !== typeFilter) return true;
    if (roomFilter !== 'ALL' && entry.roomNumber !== roomFilter) return true;
    return false;
  };

  const handleDragStart = (e: React.DragEvent, entry: TimetableEntry) => {
    setDraggedEntryId(entry.id);
  };

  const handleDragOver = (e: React.DragEvent, day: string, slotIndex: number, periodType: string) => {
    e.preventDefault();
    if (periodType === 'BREAK' || periodType === 'LUNCH') {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    // Wednesday afternoon (P5, P6 & P7 / slots 6, 7 & 8) is strictly locked for Naan Muthalvan
    if (day === 'Wednesday' && (slotIndex === 6 || slotIndex === 7 || slotIndex === 8)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ day, slotIndex });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetSlotIndex: number, periodType: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    setDraggedEntryId(null);

    if (periodType === 'BREAK' || periodType === 'LUNCH') {
      toast.error(`Cannot place classes during ${periodType === 'BREAK' ? 'Tea Break' : 'Lunch Break'}`);
      return;
    }

    if (targetDay === 'Wednesday' && (targetSlotIndex === 6 || targetSlotIndex === 7 || targetSlotIndex === 8)) {
      toast.error('Wednesday afternoon (Period 5, 6 & 7) is strictly locked for Naan Muthalvan');
      return;
    }

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { entryId } = JSON.parse(dataStr);
      if (entryId && onMoveClass) {
        onMoveClass(entryId, targetDay, targetSlotIndex);
      }
    } catch (err) {
      console.error('Failed to parse drop data:', err);
    }
  };

  const currentDayIndex = WORKING_DAYS.indexOf(selectedMobileDay);
  const handlePrevDay = () => {
    const prevIndex = (currentDayIndex - 1 + WORKING_DAYS.length) % WORKING_DAYS.length;
    setSelectedMobileDay(WORKING_DAYS[prevIndex]);
  };
  const handleNextDay = () => {
    const nextIndex = (currentDayIndex + 1) % WORKING_DAYS.length;
    setSelectedMobileDay(WORKING_DAYS[nextIndex]);
  };

  const getDayClassCount = (day: string) => {
    if (day === 'Wednesday') return 4; // P1, P2, P3, P4 + NM afternoon
    const entries = timetable.entries.filter(e => e.day === day && (e.type === 'THEORY' || e.type === 'LAB'));
    return entries.length;
  };

  const renderRowCells = (day: string) => {
    const cells: React.ReactNode[] = [];
    let skipCount = 0;

    for (let i = 0; i < MASTER_PERIOD_DEFINITIONS.length; i++) {
      if (skipCount > 0) {
        skipCount--;
        continue;
      }

      const period = MASTER_PERIOD_DEFINITIONS[i];
      const entry = getSlotEntry(day, period.slotIndex);
      const isBreak = period.type === 'BREAK' || period.type === 'LUNCH';

      // 1. Break Cells (Tea or Lunch)
      if (isBreak) {
        cells.push(
          <td
            key={`break_${day}_${period.slotIndex}`}
            className="p-0.5 text-center bg-amber-50/50 dark:bg-amber-950/20 border-r border-gray-200/80 dark:border-slate-800 text-amber-900 dark:text-amber-400 select-none w-8 min-w-[32px] max-w-[34px]"
          >
            <div className="flex flex-col items-center justify-center gap-0.5 py-2">
              {period.type === 'BREAK' ? (
                <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="text-[8px] font-extrabold uppercase tracking-tighter text-amber-800 dark:text-amber-300 [writing-mode:vertical-rl] rotate-180">
                {period.type === 'BREAK' ? 'Tea' : 'Lunch'}
              </span>
            </div>
          </td>
        );
        continue;
      }

      // 2. Wednesday Afternoon Locked Session (Period 5, Period 6 and Period 7 = slots 6, 7 and 8)
      if (day === 'Wednesday' && mergeContinuousSlots && period.slotIndex === 6) {
        skipCount = 2; // Merges slot 6 (P5), slot 7 (P6) and slot 8 (P7)
        cells.push(
          <td
            key={`wed_nm_${day}`}
            colSpan={3}
            className="p-1 border-r border-gray-200/80 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/30 align-top"
            onClick={() => toast('Wednesday afternoon (Period 5, 6 & 7) is locked for Naan Muthalvan.', { icon: '🔒' })}
          >
            <div className="h-full min-h-[86px] rounded-xl border border-amber-300/90 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/50 p-2 flex flex-col justify-between text-amber-950 dark:text-amber-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 font-bold text-xs">
                  <div className="p-0.5 bg-amber-200 dark:bg-amber-900/60 rounded text-amber-900 dark:text-amber-200">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono font-bold text-xs text-amber-950 dark:text-amber-200">NM-301</span>
                </div>
                <span className="text-[9px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded font-extrabold border border-amber-300 dark:border-amber-700">
                  FULL AFTERNOON BLOCK
                </span>
              </div>

              <div className="my-0.5">
                <div className="font-extrabold text-xs text-amber-950 dark:text-amber-100">
                  Naan Muthalvan
                </div>
                <div className="text-[10px] text-amber-800 dark:text-amber-300 truncate">
                  State Mandatory Industry Skill & Employability Initiative
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] pt-1 border-t border-amber-200/60 dark:border-amber-800/50 text-amber-800 dark:text-amber-400 font-mono">
                <span>Period 5, 6 & 7 (01:40 - 04:20)</span>
                <span>Fully Reserved</span>
              </div>
            </div>
          </td>
        );
        continue;
      }

      // 3. Merged Lab Sessions (2 Consecutive Periods in P6 & P7)
      if (mergeContinuousSlots && entry && entry.type === 'LAB' && period.slotIndex === 7 && i + 1 < MASTER_PERIOD_DEFINITIONS.length) {
        const nextPeriod = MASTER_PERIOD_DEFINITIONS[i + 1];
        const nextEntry = getSlotEntry(day, nextPeriod.slotIndex);

        if (nextEntry && nextEntry.type === 'LAB' && nextEntry.subjectCode === entry.subjectCode) {
          skipCount = 1;
          const isDimmed = isFilteredOut(entry);
          const timeRange = `${period.startTime} - ${nextPeriod.endTime}`;

          cells.push(
            <td
              key={`merged_lab_${day}_${period.slotIndex}`}
              colSpan={2}
              onDragOver={(e) => handleDragOver(e, day, period.slotIndex, period.type)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day, period.slotIndex, period.type)}
              className={`p-1 border-r border-gray-200/80 dark:border-slate-800 align-top transition-all ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
            >
              <TimetableCard
                entry={entry}
                span={2}
                timeRange={timeRange}
                durationLabel="2 Periods"
                isSearchMatch={isSearchMatch(entry)}
                isDragging={draggedEntryId === entry.id}
                onDragStart={handleDragStart}
                onClick={onSelectEntry}
              />
            </td>
          );
          continue;
        }
      }

      // 4. Standard Single Slot
      const isDragTarget = dragOverSlot?.day === day && dragOverSlot?.slotIndex === period.slotIndex;
      const isDimmed = isFilteredOut(entry);

      cells.push(
        <td
          key={`slot_${day}_${period.slotIndex}`}
          onDragOver={(e) => handleDragOver(e, day, period.slotIndex, period.type)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, day, period.slotIndex, period.type)}
          className={`
            p-1 border-r border-gray-200/80 dark:border-slate-800 align-top transition-all
            ${isDragTarget ? 'bg-blue-100/70 dark:bg-blue-900/40 ring-2 ring-blue-500 ring-inset' : ''}
            ${isDimmed ? 'opacity-25' : 'opacity-100'}
          `}
        >
          {entry ? (
            <TimetableCard
              entry={entry}
              span={1}
              isSearchMatch={isSearchMatch(entry)}
              isDragging={draggedEntryId === entry.id}
              onDragStart={handleDragStart}
              onClick={onSelectEntry}
            />
          ) : (
            <div
              onClick={() => onAddClassToSlot && onAddClassToSlot(day, period.slotIndex)}
              className="group h-full min-h-[86px] rounded-xl border border-dashed border-gray-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-cyan-500/60 hover:bg-blue-50/30 dark:hover:bg-cyan-950/20 flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-cyan-400 transition-all cursor-pointer p-1"
              title="Click to add a class"
            >
              <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] font-semibold text-gray-400 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors mt-0.5">
                + Add
              </span>
            </div>
          )}
        </td>
      );
    }

    return cells;
  };

  // Mobile Day View Renderer
  const renderMobileDayView = () => {
    const day = selectedMobileDay;
    const isWednesday = day === 'Wednesday';

    return (
      <div className="p-3.5 space-y-3 bg-gray-50/50 dark:bg-slate-950">
        {/* Day Selector Pill Bar */}
        <div className="flex items-center justify-between gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
          {WORKING_DAYS.map((d) => {
            const isSelected = d === selectedMobileDay;
            const count = getDayClassCount(d);
            return (
              <button
                key={d}
                onClick={() => setSelectedMobileDay(d)}
                className={`flex-1 py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-luna-dark-navy dark:bg-cyan-600 text-white shadow-xs font-black'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <div className="text-xs uppercase tracking-tight">{d.slice(0, 3)}</div>
                <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-cyan-200' : 'text-gray-400 dark:text-gray-400'}`}>
                  {count} {d === 'Wednesday' ? 'sess' : 'classes'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Day Header Banner with Prev / Next */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
              <span>{day} Schedule</span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {isWednesday ? 'Morning Lectures + Naan Muthalvan Afternoon Block' : '7 Scheduled Periods & Breaks'}
            </p>
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Period Cards Timeline */}
        <div className="space-y-2.5">
          {/* Period 1 */}
          {renderMobileSlotCard(day, 0, 'Period 1', '09:10 - 10:00')}

          {/* Period 2 */}
          {renderMobileSlotCard(day, 1, 'Period 2', '10:00 - 10:50')}

          {/* Tea Break Banner */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-amber-950 dark:text-amber-300">
            <div className="flex items-center gap-2 font-bold text-xs">
              <div className="p-1 bg-amber-200 dark:bg-amber-900/60 rounded-lg">
                <Coffee className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
              </div>
              <span>Tea Break (10:50 AM – 11:10 AM)</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-full text-amber-900 dark:text-amber-200">
              20 Min
            </span>
          </div>

          {/* Period 3 */}
          {renderMobileSlotCard(day, 3, 'Period 3', '11:10 - 12:00')}

          {/* Period 4 */}
          {renderMobileSlotCard(day, 4, 'Period 4', '12:00 - 12:50')}

          {/* Lunch Break Banner */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-bold text-xs">
              <div className="p-1 bg-emerald-200 dark:bg-emerald-900/60 rounded-lg">
                <Utensils className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-300" />
              </div>
              <span>Lunch Break (12:50 PM – 01:40 PM)</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-200/80 dark:bg-emerald-900/80 px-2 py-0.5 rounded-full text-emerald-900 dark:text-emerald-200">
              50 Min
            </span>
          </div>

          {/* Afternoon: Wednesday vs Normal Days */}
          {isWednesday ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-amber-200 dark:bg-amber-900 rounded-lg text-amber-900 dark:text-amber-200">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-black text-sm text-amber-950 dark:text-amber-200">NM-301</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  FULL AFTERNOON RESERVED
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-amber-950 dark:text-amber-100">
                  Naan Muthalvan
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  State Mandatory Skill & Employability Training Program
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800 text-[11px] font-mono text-amber-900 dark:text-amber-300">
                <span>Period 5, 6 & 7</span>
                <span className="font-bold">01:40 PM – 04:20 PM</span>
              </div>
            </div>
          ) : (
            <>
              {/* Period 5 */}
              {renderMobileSlotCard(day, 6, 'Period 5', '01:40 - 02:30')}

              {/* Check if P6 & P7 is a merged 2-hour lab */}
              {(() => {
                const p6Entry = getSlotEntry(day, 7);
                const p7Entry = getSlotEntry(day, 8);
                const isMergedLab = p6Entry && p7Entry && p6Entry.type === 'LAB' && p6Entry.subjectCode === p7Entry.subjectCode;

                if (isMergedLab) {
                  return (
                    <div 
                      onClick={() => onSelectEntry && onSelectEntry(p6Entry)}
                      className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 shadow-xs space-y-2 cursor-pointer hover:bg-purple-100/70 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="font-mono font-black text-sm text-purple-950 dark:text-purple-200">
                            {p6Entry.subjectCode}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 dark:bg-purple-900 text-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                          2-HOUR PRACTICAL LAB
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-purple-950 dark:text-purple-100">
                        {p6Entry.subjectName || 'Practical Laboratory'}
                      </h4>

                      <div className="flex items-center justify-between pt-2 border-t border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300">
                        <div className="flex items-center gap-1.5 font-bold">
                          <User className="w-3.5 h-3.5 text-purple-600" />
                          <span>{p6Entry.staffName || p6Entry.staffCode} ({p6Entry.staffCode})</span>
                        </div>
                        {p6Entry.roomNumber && (
                          <div className="flex items-center gap-1 font-mono font-bold bg-purple-100 dark:bg-purple-900/80 px-2 py-0.5 rounded">
                            <MapPin className="w-3 h-3 text-purple-500" />
                            <span>{p6Entry.roomNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-purple-700 dark:text-purple-400 flex items-center justify-between">
                        <span>Period 6 + 7</span>
                        <span>02:30 PM – 04:20 PM</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    {renderMobileSlotCard(day, 7, 'Period 6', '02:30 - 03:20')}
                    {renderMobileSlotCard(day, 8, 'Period 7', '03:20 - 04:20')}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderMobileSlotCard = (day: string, slotIndex: number, periodLabel: string, timeString: string) => {
    const entry = getSlotEntry(day, slotIndex);
    const isLab = entry?.type === 'LAB';

    if (!entry) {
      return (
        <div 
          key={`mob_empty_${day}_${slotIndex}`}
          onClick={() => onAddClassToSlot && onAddClassToSlot(day, slotIndex)}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-between text-gray-500 hover:border-blue-500 hover:bg-blue-50/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
              {periodLabel}
            </span>
            <span className="text-xs text-gray-400 font-mono">{timeString}</span>
          </div>
          <span className="text-xs font-bold text-blue-600 dark:text-cyan-400 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Class
          </span>
        </div>
      );
    }

    const staffDisplayName = entry.staffName || getStaffNameByCode(entry.staffCode) || entry.staffCode;

    return (
      <div
        key={`mob_card_${day}_${slotIndex}`}
        onClick={() => onSelectEntry && onSelectEntry(entry)}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-2 ${
          isLab
            ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-300/90 dark:border-purple-800'
            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-blue-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
              {periodLabel}
            </span>
            <span className="font-mono font-black text-xs text-gray-950 dark:text-white">
              {entry.subjectCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 font-mono">{timeString}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                isLab
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-200 border-purple-300'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-cyan-300 border-blue-200'
              }`}
            >
              {isLab ? 'LAB' : 'THEORY'}
            </span>
          </div>
        </div>

        <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 leading-snug">
          {entry.subjectName || entry.subjectCode}
        </h4>

        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-1 font-bold text-[11px]">
            <User className="w-3 h-3 text-gray-400" />
            <span>{staffDisplayName}</span>
            <span className="text-gray-400 font-mono">({entry.staffCode})</span>
          </div>

          {entry.roomNumber && (
            <div className="flex items-center gap-1 font-mono text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
              <MapPin className="w-2.5 h-2.5 text-gray-400" />
              <span>{entry.roomNumber}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={ref} 
      id="timetable-export-container" 
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 overflow-hidden w-full"
    >
      {/* Top Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-gray-50/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">
            {timetable.name || 'Master Department Timetable'}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
            5 Days • 7 Periods
          </span>
        </div>

        {/* View Mode Switcher: Grid vs Mobile Day View vs Merged toggle */}
        <div className="flex items-center gap-1.5">
          {/* Grid vs Day View Toggle */}
          <div className="flex items-center bg-gray-200/80 dark:bg-slate-800 p-0.5 rounded-xl border border-gray-300/80 dark:border-slate-700">
            <button
              onClick={() => setActiveViewMode('GRID')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeViewMode === 'GRID'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
              title="View full 5-day week grid matrix"
            >
              <Table className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
              <span>Week Grid</span>
            </button>

            <button
              onClick={() => setActiveViewMode('DAY')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeViewMode === 'DAY'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
              title="View day-by-day touch cards (Optimized for Mobile)"
            >
              <CalendarDays className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Day View</span>
            </button>
          </div>

          {/* Merged View Toggle */}
          <button
            onClick={() => setMergeContinuousSlots(!mergeContinuousSlots)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all border cursor-pointer ${
              mergeContinuousSlots
                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
            }`}
            title="Toggle merged blocks for 2-hour labs and Naan Muthalvan"
          >
            <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">{mergeContinuousSlots ? 'Merged View' : 'Single Slot'}</span>
            {mergeContinuousSlots && <Check className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE VIEW */}
      {activeViewMode === 'DAY' ? (
        renderMobileDayView()
      ) : (
        <>
          {/* Mobile Swipe Hint banner (only visible on mobile screens) */}
          <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-blue-50/80 dark:bg-blue-950/50 text-[11px] text-blue-900 dark:text-cyan-300 border-b border-blue-100 dark:border-blue-900/40">
            <span className="flex items-center gap-1">
              <span>👉</span> Swipe horizontally to inspect all 7 periods
            </span>
            <button 
              onClick={() => setActiveViewMode('DAY')}
              className="font-bold underline text-blue-950 dark:text-cyan-200 text-[11px] ml-2 shrink-0 cursor-pointer"
            >
              Switch to Day Cards
            </button>
          </div>

          {/* Full Week Grid Table Container with min-w-[980px] & sticky Day column */}
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[980px] table-fixed border-collapse">
              {/* Column Sizing */}
              <colgroup>
                <col className="w-[75px]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[34px]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[34px]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>

              {/* Table Header */}
              <thead>
                <tr className="bg-gray-100/90 dark:bg-slate-800/90 border-b border-gray-200 dark:border-slate-800 text-[11px] font-bold text-gray-700 dark:text-gray-200">
                  <th className="p-2 text-center sticky left-0 z-20 bg-gray-100 dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700 font-extrabold text-gray-900 dark:text-white shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    Day
                  </th>
                  {MASTER_PERIOD_DEFINITIONS.map((p) => (
                    <th
                      key={p.slotIndex}
                      className={`p-1.5 text-center border-r border-gray-200/80 dark:border-slate-800 last:border-r-0 ${
                        p.type === 'BREAK' || p.type === 'LUNCH'
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-300 w-8 min-w-[32px] max-w-[34px]'
                          : ''
                      }`}
                    >
                      <div className="font-extrabold text-gray-900 dark:text-white leading-tight text-xs">
                        {p.type === 'CLASS' ? `P${p.periodNumber}` : p.label.split(' ')[0]}
                      </div>
                      <div className="text-[9px] font-mono text-gray-500 dark:text-gray-400 font-normal leading-none mt-0.5">
                        {p.startTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                {WORKING_DAYS.map((day) => (
                  <tr key={day} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Day Header Column - Sticky Left Column for smooth scrolling */}
                    <td className="p-2 text-center font-bold sticky left-0 z-10 bg-gray-50 dark:bg-slate-900 border-r border-gray-300 dark:border-slate-700 align-middle shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                      <div className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-cyan-400">
                        {day.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-tight mt-0.5">
                        {day}
                      </div>
                    </td>

                    {/* Slots with smart merging */}
                    {renderRowCells(day)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
});

export const periodDefinitions = MASTER_PERIOD_DEFINITIONS;

TimetableGrid.displayName = 'TimetableGrid';

