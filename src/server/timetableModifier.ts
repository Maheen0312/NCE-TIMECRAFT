import { Timetable, TimetableEntry, Subject, Room, ValidationResult } from '../types/timetable';
import { TimetableValidator } from '../scheduler/validator';
import { ScheduleOptimizer } from '../scheduler/optimizer';
import { defaultMasterTimeSlots } from '../services/timeSlotService';
import { PeriodSlot } from '../scheduler/types';
import { matchYear } from '@/utils/yearUtils';

const defaultPeriodSlots: PeriodSlot[] = defaultMasterTimeSlots.map((s, idx) => ({
  id: (s as any).id || `${s.day}_${s.order}`,
  day: s.day as any,
  slotIndex: s.order,
  startTime: s.startTime,
  endTime: s.endTime,
  type: s.type as any,
  isMorning: s.order < 5,
  isAfternoon: s.order >= 5,
}));

export interface MoveClassParams {
  timetable: Timetable;
  entryId: string;
  targetDay: string;
  targetSlotIndex: number;
  subjects: Subject[];
  rooms?: Room[];
}

export interface ValidationMoveResult {
  valid: boolean;
  message?: string;
  updatedTimetable?: Timetable;
  validation?: ValidationResult;
}

export class TimetableModifier {
  /**
   * Validates and executes a drag & drop move of an entry (or lab pair)
   */
  static moveClass(params: MoveClassParams): ValidationMoveResult {
    const { timetable, entryId, targetDay, targetSlotIndex, subjects, rooms = [] } = params;

    // 1. Find entry
    const entryIndex = timetable.entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) {
      return { valid: false, message: 'Class entry not found in timetable.' };
    }

    const currentEntry = timetable.entries[entryIndex];

    // 2. Check if current entry is locked or is Career Guidance
    const isCurrentCG = (currentEntry.subjectName || '').toLowerCase().includes('career guidance') || 
                        currentEntry.subjectCode === 'CG401' ||
                        (matchYear(timetable.year, 'IV') && currentEntry.slotIndex >= 6);

    if (isCurrentCG) {
      return {
        valid: false,
        message: 'Career Guidance is a locked Final Year special session and cannot be modified.'
      };
    }

    if (currentEntry.locked || currentEntry.type === 'LOCKED') {
      return {
        valid: false,
        message: 'This session is locked (e.g. Naan Mudhalvan) and cannot be moved.'
      };
    }

    // 3. Check target slot for breaks or lunch
    const targetSlotDef = defaultPeriodSlots.find(s => s.day === targetDay && s.slotIndex === targetSlotIndex);
    if (targetSlotDef && (targetSlotDef.type === 'BREAK' || targetSlotDef.type === 'LUNCH')) {
      return {
        valid: false,
        message: `Cannot place class during ${targetSlotDef.type === 'BREAK' ? 'Tea Break' : 'Lunch Break'}.`
      };
    }

    // 4. Check Final Year Afternoon Lock: The entire afternoon is strictly Career Guidance (and Wednesday Naan Mudhalvan)
    if (matchYear(timetable.year, 'IV') && targetSlotIndex >= 6) {
      return {
        valid: false,
        message: 'Career Guidance is a locked Final Year special session and cannot be modified.'
      };
    }

    // 5. Check Naan Mudhalvan (Wednesday PM slots >= 5)
    if (targetDay === 'Wednesday' && (targetSlotIndex >= 6 || (targetSlotIndex === 5 && targetSlotDef?.type !== 'LUNCH'))) {
      return {
        valid: false,
        message: 'Wednesday afternoon is strictly reserved for Naan Mudhalvan sessions.'
      };
    }

    // 6. Handle LAB blocks: if currentEntry is a LAB, find its paired session
    const isLab = currentEntry.type === 'LAB';
    let pairedEntry: TimetableEntry | null = null;
    let pairedIndex = -1;

    if (isLab) {
      // Find the adjacent lab entry for same subject and same day
      pairedIndex = timetable.entries.findIndex(
        (e, idx) => idx !== entryIndex &&
                    e.type === 'LAB' &&
                    e.subjectCode === currentEntry.subjectCode &&
                    e.day === currentEntry.day &&
                    Math.abs(e.slotIndex - currentEntry.slotIndex) === 1
      );
      if (pairedIndex !== -1) {
        pairedEntry = timetable.entries[pairedIndex];
      }
    }

    // Clone entries to perform speculative test
    const newEntries = timetable.entries.map(e => ({ ...e }));

    // Calculate time strings for target slot
    const targetSlot = defaultPeriodSlots.find(s => s.day === targetDay && s.slotIndex === targetSlotIndex);
    const newStartTime = targetSlot ? targetSlot.startTime : '09:10';
    const newEndTime = targetSlot ? targetSlot.endTime : '10:00';

    if (!isLab || !pairedEntry) {
      // Single period move
      // Check if target slot already has a class in this timetable
      const existingInTarget = newEntries.find(
        (e, idx) => idx !== entryIndex && e.day === targetDay && e.slotIndex === targetSlotIndex
      );

      if (existingInTarget) {
        const isTargetCG = (existingInTarget.subjectName || '').toLowerCase().includes('career guidance') ||
                           existingInTarget.subjectCode === 'CG401' ||
                           (matchYear(timetable.year, 'IV') && existingInTarget.slotIndex >= 6);
        if (isTargetCG) {
          return {
            valid: false,
            message: 'Career Guidance is a locked Final Year special session and cannot be modified.'
          };
        }
        if (existingInTarget.locked || existingInTarget.type === 'LOCKED' || existingInTarget.type === 'SPECIAL') {
          return {
            valid: false,
            message: 'Cannot swap or displace a locked special session.'
          };
        }

        // Swap slots
        existingInTarget.day = currentEntry.day;
        existingInTarget.slotIndex = currentEntry.slotIndex;
        existingInTarget.startTime = currentEntry.startTime;
        existingInTarget.endTime = currentEntry.endTime;
      }

      newEntries[entryIndex] = {
        ...currentEntry,
        day: targetDay,
        slotIndex: targetSlotIndex,
        startTime: newStartTime,
        endTime: newEndTime,
      };
    } else {
      // Lab Block Move (2 continuous periods)
      // Determine second target slot
      let secondTargetSlotIndex = targetSlotIndex + 1;
      if (secondTargetSlotIndex >= 9 || (targetDay === 'Wednesday' && secondTargetSlotIndex >= 6)) {
        secondTargetSlotIndex = targetSlotIndex - 1;
      }

      const secondTargetSlotDef = defaultPeriodSlots.find(s => s.day === targetDay && s.slotIndex === secondTargetSlotIndex);
      if (!secondTargetSlotDef || secondTargetSlotDef.type === 'BREAK' || secondTargetSlotDef.type === 'LUNCH') {
        return {
          valid: false,
          message: 'Laboratory sessions require 2 continuous unobstructed class periods.'
        };
      }

      // Check Wednesday PM for second slot
      if (targetDay === 'Wednesday' && secondTargetSlotIndex >= 6) {
        return {
          valid: false,
          message: 'Laboratory block would overlap with Wednesday afternoon Naan Mudhalvan.'
        };
      }

      // Move both
      newEntries[entryIndex] = {
        ...currentEntry,
        day: targetDay,
        slotIndex: targetSlotIndex,
        startTime: newStartTime,
        endTime: newEndTime,
      };

      newEntries[pairedIndex] = {
        ...pairedEntry,
        day: targetDay,
        slotIndex: secondTargetSlotIndex,
        startTime: secondTargetSlotDef.startTime,
        endTime: secondTargetSlotDef.endTime,
      };
    }

    // 6. Run comprehensive validator on the new candidate layout
    const validation = TimetableValidator.validate(newEntries, subjects, defaultPeriodSlots);
    const quality = ScheduleOptimizer.calculateQuality(newEntries, subjects, defaultPeriodSlots);
    validation.qualityScore = quality.score;
    validation.qualityMetrics = quality.metrics;

    // Check if move created a hard conflict (staff or room collision)
    if (validation.staffConflicts?.length || validation.roomConflicts?.length || validation.lockedSessionConflicts?.length) {
      const firstConflict = validation.conflicts[0] || 'Constraint collision detected.';
      return {
        valid: false,
        message: `Move rejected: ${firstConflict}`,
        validation
      };
    }

    const updatedTimetable: Timetable = {
      ...timetable,
      entries: newEntries,
      validation,
      qualityScore: quality.score,
      updatedAt: new Date().toISOString()
    };

    return {
      valid: true,
      updatedTimetable,
      validation
    };
  }

  /**
   * Partially regenerates slots for a specific subject while keeping other classes fixed
   */
  static regenerateSubject(
    timetable: Timetable,
    subjectCode: string,
    subjects: Subject[],
    rooms: Room[]
  ): { success: boolean; timetable?: Timetable; message?: string } {
    if (subjectCode === 'CG401') {
      return { success: false, message: 'Career Guidance is a locked Final Year special session and cannot be modified.' };
    }

    const targetSubject = subjects.find(s => s.subjectCode === subjectCode);
    if (!targetSubject) {
      return { success: false, message: `Subject ${subjectCode} not found.` };
    }

    if ((targetSubject.subjectName || '').toLowerCase().includes('career guidance')) {
      return { success: false, message: 'Career Guidance is a locked Final Year special session and cannot be modified.' };
    }

    const staffCode = targetSubject.assignedStaff?.[0] || 'JT';
    const requiredHours = targetSubject.weeklyHours || (targetSubject.type === 'LAB' ? 2 : 4);
    const isLab = targetSubject.type === 'LAB';

    // Keep all other entries
    const fixedEntries = timetable.entries.filter(
      e => e.subjectCode !== subjectCode || e.type === 'LOCKED' || e.type === 'BREAK' || e.type === 'LUNCH'
    );

    const availableSlots: { day: string; slotIndex: number; startTime: string; endTime: string }[] = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    for (const day of days) {
      for (let slotIndex = 0; slotIndex < 9; slotIndex++) {
        // Skip break, lunch
        const slotDef = defaultPeriodSlots.find(s => s.day === day && s.slotIndex === slotIndex);
        if (!slotDef || slotDef.type === 'BREAK' || slotDef.type === 'LUNCH') continue;

        // Skip Wednesday PM (>= 6)
        if (day === 'Wednesday' && slotIndex >= 6) continue;

        // Final Year subjects can only appear in morning periods (slots 0, 1, 3, 4)
        if (matchYear(timetable.year, 'IV') && slotIndex >= 5) continue;

        // Check if slot occupied in fixedEntries
        const occupied = fixedEntries.some(e => e.day === day && e.slotIndex === slotIndex && (e.type === 'THEORY' || e.type === 'LAB' || e.type === 'LOCKED'));
        if (occupied) continue;

        // Check if staff is occupied
        const staffBusy = fixedEntries.some(e => e.day === day && e.slotIndex === slotIndex && e.staffCode === staffCode);
        if (staffBusy) continue;

        availableSlots.push({
          day,
          slotIndex,
          startTime: slotDef.startTime,
          endTime: slotDef.endTime,
        });
      }
    }

    const assignedEntries: TimetableEntry[] = [];
    const preferredRoom = rooms.find(r => r.active && (isLab ? r.type === 'LAB' : r.type === 'CLASSROOM'))?.roomNumber || 'CSE-101';

    if (isLab) {
      // Find 2 continuous available slots
      let foundPair = false;
      for (let i = 0; i < availableSlots.length - 1; i++) {
        const slot1 = availableSlots[i];
        const slot2 = availableSlots[i + 1];
        if (slot1.day === slot2.day && slot2.slotIndex === slot1.slotIndex + 1) {
          // Found pair
          assignedEntries.push({
            id: `entry_${Date.now()}_lab1`,
            day: slot1.day,
            slotIndex: slot1.slotIndex,
            startTime: slot1.startTime,
            endTime: slot1.endTime,
            subjectCode: targetSubject.subjectCode,
            subjectName: targetSubject.subjectName,
            staffCode,
            roomNumber: preferredRoom,
            type: 'LAB',
            source: 'GENERATED'
          });
          assignedEntries.push({
            id: `entry_${Date.now()}_lab2`,
            day: slot2.day,
            slotIndex: slot2.slotIndex,
            startTime: slot2.startTime,
            endTime: slot2.endTime,
            subjectCode: targetSubject.subjectCode,
            subjectName: targetSubject.subjectName,
            staffCode,
            roomNumber: preferredRoom,
            type: 'LAB',
            source: 'GENERATED'
          });
          foundPair = true;
          break;
        }
      }
      if (!foundPair) {
        return { success: false, message: `Could not find 2 continuous free periods for Lab ${subjectCode}.` };
      }
    } else {
      // Theory: spread across distinct days if possible
      const chosenDays = new Set<string>();
      let hoursAssigned = 0;

      for (const slot of availableSlots) {
        if (hoursAssigned >= requiredHours) break;
        if (!chosenDays.has(slot.day) || hoursAssigned + (5 - chosenDays.size) >= requiredHours) {
          chosenDays.add(slot.day);
          assignedEntries.push({
            id: `entry_${Date.now()}_${hoursAssigned}`,
            day: slot.day,
            slotIndex: slot.slotIndex,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectCode: targetSubject.subjectCode,
            subjectName: targetSubject.subjectName,
            staffCode,
            roomNumber: preferredRoom,
            type: 'THEORY',
            source: 'GENERATED'
          });
          hoursAssigned++;
        }
      }

      if (hoursAssigned < requiredHours) {
        return { success: false, message: `Could only fit ${hoursAssigned}/${requiredHours} hours for ${subjectCode}.` };
      }
    }

    const mergedEntries = [...fixedEntries, ...assignedEntries];
    const validation = TimetableValidator.validate(mergedEntries, subjects, defaultPeriodSlots);
    const quality = ScheduleOptimizer.calculateQuality(mergedEntries, subjects, defaultPeriodSlots);
    validation.qualityScore = quality.score;
    validation.qualityMetrics = quality.metrics;

    return {
      success: true,
      timetable: {
        ...timetable,
        entries: mergedEntries,
        validation,
        qualityScore: quality.score,
        updatedAt: new Date().toISOString()
      },
      message: `Successfully rescheduled ${targetSubject.subjectCode} (${requiredHours} hrs).`
    };
  }

  /**
   * Auto-Fix tool: Automatically relocates conflicting classes to free valid slots
   */
  static autoFixConflicts(
    timetable: Timetable,
    subjects: Subject[],
    rooms: Room[]
  ): { success: boolean; timetable?: Timetable; resolvedCount: number; message: string } {
    let currentEntries = timetable.entries.map(e => ({ ...e }));
    let initialValidation = TimetableValidator.validate(currentEntries, subjects, defaultPeriodSlots);

    if (initialValidation.valid) {
      return {
        success: true,
        timetable,
        resolvedCount: 0,
        message: 'Timetable already has 0 conflicts.'
      };
    }

    let resolvedCount = 0;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Identify conflicting entries
    for (const conflict of initialValidation.detailedConflicts || []) {
      if (!conflict.day || conflict.slotIndex === undefined) continue;

      const targetEntry = currentEntries.find(
        e => e.day === conflict.day && e.slotIndex === conflict.slotIndex && (e.type === 'THEORY' || e.type === 'LAB') && !e.locked
      );

      if (!targetEntry) continue;

      // Find alternative open slot
      for (const altDay of days) {
        for (let altSlot = 0; altSlot < 9; altSlot++) {
          const slotDef = defaultPeriodSlots.find(s => s.day === altDay && s.slotIndex === altSlot);
          if (!slotDef || slotDef.type === 'BREAK' || slotDef.type === 'LUNCH') continue;
          if (altDay === 'Wednesday' && altSlot >= 6) continue;
          if (matchYear(timetable.year, 'IV') && altSlot >= 5) continue;

          // Check if slot occupied
          const isOccupied = currentEntries.some(e => e.day === altDay && e.slotIndex === altSlot && (e.type === 'THEORY' || e.type === 'LAB' || e.type === 'LOCKED'));
          if (isOccupied) continue;

          // Check if staff is free in altSlot
          const staffOccupied = currentEntries.some(e => e.day === altDay && e.slotIndex === altSlot && e.staffCode === targetEntry.staffCode);
          if (staffOccupied) continue;

          // Try moving
          targetEntry.day = altDay;
          targetEntry.slotIndex = altSlot;
          targetEntry.startTime = slotDef.startTime;
          targetEntry.endTime = slotDef.endTime;
          resolvedCount++;
          break;
        }
      }
    }

    const finalValidation = TimetableValidator.validate(currentEntries, subjects, defaultPeriodSlots);
    const finalQuality = ScheduleOptimizer.calculateQuality(currentEntries, subjects, defaultPeriodSlots);
    finalValidation.qualityScore = finalQuality.score;
    finalValidation.qualityMetrics = finalQuality.metrics;

    return {
      success: true,
      timetable: {
        ...timetable,
        entries: currentEntries,
        validation: finalValidation,
        qualityScore: finalQuality.score,
        updatedAt: new Date().toISOString()
      },
      resolvedCount,
      message: `Auto-Fix complete. Resolved ${resolvedCount} conflict(s). Remaining conflicts: ${finalValidation.conflicts.length}.`
    };
  }
}
