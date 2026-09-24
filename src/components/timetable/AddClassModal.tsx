import React, { useState } from 'react';
import { Subject, StaffProfile, Room, TimetableEntry, Timetable } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import { X, Plus, BookOpen, User, Building2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { MASTER_PERIOD_DEFINITIONS as periodDefinitions } from '@/config/timetableConfig';
import { toast } from 'react-hot-toast';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: Timetable;
  subjects: Subject[];
  staff: StaffProfile[];
  rooms: Room[];
  initialDay?: string;
  initialSlotIndex?: number;
  onAddClass: (entry: TimetableEntry) => void;
}

export const AddClassModal: React.FC<AddClassModalProps> = ({
  isOpen,
  onClose,
  timetable,
  subjects,
  staff,
  rooms,
  initialDay = 'Monday',
  initialSlotIndex = 0,
  onAddClass,
}) => {
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(
    subjects.length > 0 ? subjects[0].subjectCode : ''
  );
  const [selectedStaffCode, setSelectedStaffCode] = useState<string>('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [day, setDay] = useState<string>(initialDay);
  const [slotIndex, setSlotIndex] = useState<number>(initialSlotIndex);

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s.subjectCode === selectedSubjectCode);
  const defaultStaffCode = currentSubject?.assignedStaff?.[0] || (staff.length > 0 ? staff[0].staffCode : '');
  const effectiveStaffCode = selectedStaffCode || defaultStaffCode;
  const currentStaff = staff.find((s) => s.staffCode === effectiveStaffCode);

  const defaultRoomNumber = rooms.find((r) => r.active)?.roomNumber || 'CSE-101';
  const effectiveRoomNumber = selectedRoomNumber || defaultRoomNumber;

  // Check scheduled hours
  const scheduledCount = timetable.entries.filter(
    (e) => e.subjectCode === selectedSubjectCode && (e.type === 'THEORY' || e.type === 'LAB')
  ).length;
  const requiredHours = currentSubject?.weeklyHours || (currentSubject?.type === 'LAB' ? 2 : 4);

  // Check slot validation
  const targetSlot = periodDefinitions.find((p) => p.slotIndex === slotIndex);
  const isBreak = targetSlot?.type === 'BREAK' || targetSlot?.type === 'LUNCH';
  const isNaanMudhalvan = day === 'Wednesday' && slotIndex >= 6;

  const handleSave = () => {
    if (!currentSubject) {
      toast.error('Please select a valid subject');
      return;
    }

    if (isBreak) {
      toast.error('Cannot place classes during break or lunch period');
      return;
    }

    if (isNaanMudhalvan) {
      toast.error('Wednesday afternoon is locked for Naan Mudhalvan sessions');
      return;
    }

    // Check staff collision
    const staffCollision = timetable.entries.some(
      (e) => e.day === day && e.slotIndex === slotIndex && e.staffCode === effectiveStaffCode
    );
    if (staffCollision) {
      toast.error(`Staff ${effectiveStaffCode} is already teaching another class in this time slot.`);
      return;
    }

    // Check room collision
    const roomCollision = timetable.entries.some(
      (e) => e.day === day && e.slotIndex === slotIndex && e.roomNumber === effectiveRoomNumber
    );
    if (roomCollision) {
      toast.error(`Room ${effectiveRoomNumber} is already occupied in this time slot.`);
      return;
    }

    const newEntry: TimetableEntry = {
      id: `entry_manual_${Date.now()}`,
      day,
      slotIndex,
      startTime: targetSlot?.time.split(' - ')[0] || '09:10',
      endTime: targetSlot?.time.split(' - ')[1] || '10:00',
      subjectCode: currentSubject.subjectCode,
      subjectName: currentSubject.subjectName,
      staffCode: effectiveStaffCode,
      staffName: currentStaff?.name || effectiveStaffCode,
      roomNumber: effectiveRoomNumber,
      type: currentSubject.type === 'LAB' ? 'LAB' : 'THEORY',
      source: 'MANUAL',
    };

    onAddClass(newEntry);
    toast.success(`Scheduled ${currentSubject.subjectCode} on ${day} Period ${slotIndex + 1}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-luna-primary-blue/10 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Schedule New Class</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add an academic class period to the timetable</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Course / Subject</label>
          <select
            value={selectedSubjectCode || ''}
            onChange={(e) => setSelectedSubjectCode(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
          >
            {subjects.map((s, idx) => (
              <option key={s.id || `${s.subjectCode}_${idx}`} value={s.subjectCode}>
                {s.subjectCode} - {s.subjectName} ({s.type})
              </option>
            ))}
          </select>

          {currentSubject && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-0.5 flex items-center justify-between">
              <span>Required: <strong className="text-gray-800 dark:text-gray-200">{requiredHours} hrs/wk</strong></span>
              <span className={scheduledCount >= requiredHours ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                Scheduled: {scheduledCount}/{requiredHours} hrs
              </span>
            </div>
          )}
        </div>

        {/* Faculty Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Assigned Faculty</label>
          <select
            value={effectiveStaffCode || ''}
            onChange={(e) => setSelectedStaffCode(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
          >
            {staff.map((st, idx) => (
              <option key={st.id || `${st.staffCode}_${idx}`} value={st.staffCode}>
                {st.name} ({st.staffCode}) - {st.department}
              </option>
            ))}
          </select>
        </div>

        {/* Room Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Room / Facility</label>
          <select
            value={effectiveRoomNumber || ''}
            onChange={(e) => setSelectedRoomNumber(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
          >
            {rooms.map((r, idx) => (
              <option key={r.id || `${r.roomNumber}_${idx}`} value={r.roomNumber}>
                Room {r.roomNumber} ({r.type} - Cap: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        {/* Day and Slot Picker */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Day</label>
            <select
              value={day || 'Monday'}
              onChange={(e) => setDay(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Period Slot</label>
            <select
              value={slotIndex ?? 0}
              onChange={(e) => setSlotIndex(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
            >
              {periodDefinitions.map((p) => (
                <option
                  key={p.slotIndex}
                  value={p.slotIndex}
                  disabled={p.type === 'BREAK' || p.type === 'LUNCH' || (day === 'Wednesday' && p.slotIndex >= 6)}
                >
                  {p.label} ({p.time})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Warnings */}
        {(isBreak || isNaanMudhalvan) && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isBreak ? 'Cannot place classes during breaks.' : 'Wednesday afternoon is locked for Naan Mudhalvan.'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isBreak || isNaanMudhalvan}
            className="bg-luna-primary-blue hover:bg-luna-steel-blue text-white font-semibold cursor-pointer"
          >
            Schedule Class
          </Button>
        </div>
      </div>
    </div>
  );
};
