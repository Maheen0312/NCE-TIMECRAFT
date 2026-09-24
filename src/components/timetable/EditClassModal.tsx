import React, { useState } from 'react';
import { Subject, StaffProfile, Room, TimetableEntry } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import { X, Trash2, Edit3, User, Building2, Calendar, Clock, Lock } from 'lucide-react';
import { MASTER_PERIOD_DEFINITIONS as periodDefinitions } from '@/config/timetableConfig';
import { toast } from 'react-hot-toast';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimetableEntry | null;
  subjects: Subject[];
  staff: StaffProfile[];
  rooms: Room[];
  onUpdateClass: (updatedEntry: TimetableEntry) => void;
  onDeleteClass: (entryId: string) => void;
}

export const EditClassModal: React.FC<EditClassModalProps> = ({
  isOpen,
  onClose,
  entry,
  subjects,
  staff,
  rooms,
  onUpdateClass,
  onDeleteClass,
}) => {
  if (!isOpen || !entry) return null;

  const isLocked = entry.locked || entry.type === 'LOCKED' || (entry.day === 'Wednesday' && entry.slotIndex >= 6);

  const [staffCode, setStaffCode] = useState<string>(entry.staffCode || '');
  const [roomNumber, setRoomNumber] = useState<string>(entry.roomNumber || '');
  const [day, setDay] = useState<string>(entry.day || 'Monday');
  const [slotIndex, setSlotIndex] = useState<number>(entry.slotIndex || 0);
  const [notes, setNotes] = useState<string>(entry.notes || '');

  React.useEffect(() => {
    if (entry) {
      setStaffCode(entry.staffCode || '');
      setRoomNumber(entry.roomNumber || '');
      setDay(entry.day || 'Monday');
      setSlotIndex(entry.slotIndex || 0);
      setNotes(entry.notes || '');
    }
  }, [entry]);

  const handleSave = () => {
    if (isLocked) {
      toast.error('Locked sessions cannot be edited.');
      return;
    }

    const targetSlot = periodDefinitions.find((p) => p.slotIndex === slotIndex);
    if (targetSlot?.type === 'BREAK' || targetSlot?.type === 'LUNCH') {
      toast.error('Cannot move class to a break or lunch period.');
      return;
    }

    if (day === 'Wednesday' && slotIndex >= 6) {
      toast.error('Wednesday afternoon is strictly locked for Naan Mudhalvan.');
      return;
    }

    const currentStaff = staff.find((s) => s.staffCode === staffCode);

    const updated: TimetableEntry = {
      ...entry,
      day,
      slotIndex,
      startTime: targetSlot?.time.split(' - ')[0] || entry.startTime,
      endTime: targetSlot?.time.split(' - ')[1] || entry.endTime,
      staffCode,
      staffName: currentStaff?.name || entry.staffName,
      roomNumber,
      notes,
    };

    onUpdateClass(updated);
    toast.success(`Updated ${entry.subjectCode}`);
    onClose();
  };

  const handleDelete = () => {
    if (isLocked) {
      toast.error('Locked sessions cannot be deleted.');
      return;
    }
    onDeleteClass(entry.id);
    toast.success(`Removed ${entry.subjectCode}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLocked ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' : 'bg-luna-primary-blue/10 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-400'}`}>
              {isLocked ? <Lock className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{entry.subjectCode} - Details</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{entry.subjectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLocked && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Locked Institutional Session:</strong> This slot is reserved for mandatory college programs (e.g. Naan Mudhalvan) and cannot be modified or rescheduled.
            </div>
          </div>
        )}

        {/* Faculty Picker */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Assigned Faculty</label>
          <select
            value={staffCode || ''}
            disabled={isLocked}
            onChange={(e) => setStaffCode(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue disabled:bg-gray-100 dark:disabled:bg-slate-800/50 dark:disabled:text-gray-400"
          >
            {staff.map((st, idx) => (
              <option key={st.id || `${st.staffCode}_${idx}`} value={st.staffCode}>
                {st.name} ({st.staffCode}) - {st.department}
              </option>
            ))}
          </select>
        </div>

        {/* Room Picker */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Room / Facility</label>
          <select
            value={roomNumber || ''}
            disabled={isLocked}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue disabled:bg-gray-100 dark:disabled:bg-slate-800/50 dark:disabled:text-gray-400"
          >
            {rooms.map((r, idx) => (
              <option key={r.id || `${r.roomNumber}_${idx}`} value={r.roomNumber}>
                Room {r.roomNumber} ({r.type} - Cap: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        {/* Day & Slot */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Day</label>
            <select
              value={day || 'Monday'}
              disabled={isLocked}
              onChange={(e) => setDay(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue disabled:bg-gray-100 dark:disabled:bg-slate-800/50 dark:disabled:text-gray-400"
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Period</label>
            <select
              value={slotIndex ?? 0}
              disabled={isLocked}
              onChange={(e) => setSlotIndex(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue disabled:bg-gray-100 dark:disabled:bg-slate-800/50 dark:disabled:text-gray-400"
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

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Notes / Remarks</label>
          <input
            type="text"
            value={notes || ''}
            disabled={isLocked}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Combined batch session, Lab assistant required..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue disabled:bg-gray-100 dark:disabled:bg-slate-800/50 dark:disabled:text-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t dark:border-slate-800">
          {!isLocked ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 dark:hover:border-red-800 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {!isLocked && (
              <Button size="sm" onClick={handleSave} className="bg-luna-primary-blue hover:bg-luna-steel-blue text-white cursor-pointer">
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
