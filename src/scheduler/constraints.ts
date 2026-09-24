import { TimetableEntry, Room, Lab } from '../types/timetable';
import { PeriodSlot } from './types';

export class ConstraintChecker {
  /**
   * Hard Constraint 1: A staff member cannot teach two classes at the same time.
   */
  static isStaffFree(
    staffCode: string,
    day: string,
    slotIndex: number,
    currentEntries: TimetableEntry[]
  ): boolean {
    return !currentEntries.some(
      entry => entry.day === day && 
               entry.slotIndex === slotIndex && 
               entry.staffCode === staffCode &&
               entry.type !== 'BREAK' &&
               entry.type !== 'LUNCH'
    );
  }

  /**
   * Hard Constraint 2: A room cannot contain two classes at the same time.
   */
  static isRoomFree(
    roomId: string,
    day: string,
    slotIndex: number,
    currentEntries: TimetableEntry[]
  ): boolean {
    return !currentEntries.some(
      entry => entry.day === day && 
               entry.slotIndex === slotIndex && 
               entry.roomId === roomId
    );
  }

  /**
   * Hard Constraint 3: A lab resource cannot contain two sessions simultaneously.
   */
  static isLabFree(
    labRoomId: string,
    day: string,
    slotIndices: number[],
    currentEntries: TimetableEntry[]
  ): boolean {
    return !currentEntries.some(
      entry => entry.day === day && 
               slotIndices.includes(entry.slotIndex) && 
               entry.roomId === labRoomId
    );
  }

  /**
   * Hard Constraint 4 & 5: Break and Lunch periods cannot contain classes.
   */
  static isBreakOrLunch(slot: PeriodSlot): boolean {
    return slot.type === 'BREAK' || slot.type === 'LUNCH';
  }

  /**
   * Hard Constraint 6 & 7: Check if a slot is locked by a special session (e.g. Naan Mudhalvan on Wednesday afternoon).
   */
  static isSlotLocked(
    day: string,
    slotIndex: number,
    lockedEntries: TimetableEntry[]
  ): boolean {
    return lockedEntries.some(
      entry => entry.day === day && 
               entry.slotIndex === slotIndex && 
               entry.locked
    );
  }

  /**
   * Hard Constraint 9: Verify consecutive slots for lab sessions.
   */
  static areConsecutiveSlots(
    slotIndices: number[],
    availableSlotsForDay: PeriodSlot[]
  ): boolean {
    if (slotIndices.length < 2) return true;
    for (let i = 0; i < slotIndices.length - 1; i++) {
      const current = slotIndices[i];
      const next = slotIndices[i + 1];
      if (next !== current + 1) return false;

      // Ensure no break or lunch sits between them
      const currentSlot = availableSlotsForDay.find(s => s.slotIndex === current);
      const nextSlot = availableSlotsForDay.find(s => s.slotIndex === next);
      if (!currentSlot || !nextSlot || currentSlot.type !== 'CLASS' || nextSlot.type !== 'CLASS') {
        return false;
      }
    }
    return true;
  }

  /**
   * Check staff max consecutive classes constraint.
   */
  static checkStaffConsecutiveLimit(
    staffCode: string,
    day: string,
    newSlotIndex: number,
    maxConsecutive: number,
    currentEntries: TimetableEntry[]
  ): boolean {
    const staffDaySlots = currentEntries
      .filter(e => e.day === day && e.staffCode === staffCode && e.type === 'THEORY')
      .map(e => e.slotIndex)
      .concat(newSlotIndex)
      .sort((a, b) => a - b);

    let consecutive = 1;
    for (let i = 0; i < staffDaySlots.length - 1; i++) {
      if (staffDaySlots[i + 1] === staffDaySlots[i] + 1) {
        consecutive++;
        if (consecutive > maxConsecutive) return false;
      } else if (staffDaySlots[i + 1] !== staffDaySlots[i]) {
        consecutive = 1;
      }
    }
    return true;
  }

  /**
   * Find suitable room for subject type.
   */
  static findAvailableRoom(
    type: 'THEORY' | 'LAB',
    rooms: Room[],
    day: string,
    slotIndex: number,
    currentEntries: TimetableEntry[]
  ): Room | undefined {
    const targetType = type === 'LAB' ? 'LAB' : 'CLASSROOM';
    const candidateRooms = rooms.filter(r => r.active && r.type === targetType);
    
    return candidateRooms.find(room => 
      this.isRoomFree(room.id || room.roomNumber, day, slotIndex, currentEntries)
    );
  }

  /**
   * Find suitable lab for continuous periods.
   */
  static findAvailableLabRoom(
    labs: Lab[],
    rooms: Room[],
    day: string,
    slotIndices: number[],
    currentEntries: TimetableEntry[]
  ): { lab: Lab; room: Room } | undefined {
    const activeLabs = labs.filter(l => l.active);
    const activeLabRooms = rooms.filter(r => r.active && r.type === 'LAB');

    for (const lab of activeLabs) {
      for (const room of activeLabRooms) {
        const roomId = room.id || room.roomNumber;
        const isFree = slotIndices.every(slotIndex => 
          this.isRoomFree(roomId, day, slotIndex, currentEntries)
        );
        if (isFree) {
          return { lab, room };
        }
      }
    }
    return undefined;
  }
}
