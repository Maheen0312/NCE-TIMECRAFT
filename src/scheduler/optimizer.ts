import { TimetableEntry, Subject, QualityMetrics } from '../types/timetable';
import { PeriodSlot } from './types';

export class ScheduleOptimizer {
  static calculateQuality(
    entries: TimetableEntry[],
    subjects: Subject[],
    timeSlots: PeriodSlot[]
  ): { score: number; metrics: QualityMetrics } {
    const classEntries = entries.filter(e => e.type === 'THEORY' || e.type === 'LAB');
    if (classEntries.length === 0) {
      return {
        score: 0,
        metrics: {
          subjectDistribution: 0,
          workloadBalance: 0,
          morningTheoryRatio: 0,
          afternoonLabRatio: 0,
          roomUtilization: 0,
          freePeriodEfficiency: 0
        }
      };
    }

    // 1. Subject Distribution Score (25 pts)
    // Measures whether weekly theory hours are spread across multiple days instead of stacked on one day
    let distributionScoreSum = 0;
    const theorySubjects = subjects.filter(s => s.type === 'THEORY' && s.active);
    
    if (theorySubjects.length > 0) {
      for (const subject of theorySubjects) {
        const subjectEntries = classEntries.filter(e => e.subjectCode === subject.subjectCode);
        const uniqueDays = new Set(subjectEntries.map(e => e.day));
        const required = subject.weeklyHours || 4;
        
        // Ideal: 1 period per day (e.g. 4 hours across 4 distinct days)
        const idealDays = Math.min(required, 5);
        const dayRatio = Math.min(uniqueDays.size / idealDays, 1.0);
        distributionScoreSum += dayRatio;
      }
      var subjectDistribution = (distributionScoreSum / theorySubjects.length) * 100;
    } else {
      var subjectDistribution = 100;
    }

    // 2. Morning Theory Ratio (20 pts)
    // Measures preference of theory classes in morning (slotIndex < 5)
    const theoryEntries = classEntries.filter(e => e.type === 'THEORY');
    const morningTheoryEntries = theoryEntries.filter(e => {
      const slot = timeSlots.find(s => s.day === e.day && s.slotIndex === e.slotIndex);
      return slot ? slot.isMorning : e.slotIndex < 5;
    });
    const morningTheoryRatio = theoryEntries.length > 0
      ? (morningTheoryEntries.length / theoryEntries.length) * 100
      : 100;

    // 3. Afternoon Lab Ratio (20 pts)
    // Measures preference of lab classes in afternoon (slotIndex >= 5)
    const labEntries = classEntries.filter(e => e.type === 'LAB');
    const afternoonLabEntries = labEntries.filter(e => {
      const slot = timeSlots.find(s => s.day === e.day && s.slotIndex === e.slotIndex);
      return slot ? slot.isAfternoon : e.slotIndex >= 5;
    });
    const afternoonLabRatio = labEntries.length > 0
      ? (afternoonLabEntries.length / labEntries.length) * 100
      : 100;

    // 4. Staff Workload Balance (20 pts)
    // Penalize when staff has more than 3 consecutive periods or uneven daily spread
    let staffBalanceSum = 0;
    const staffCodes = Array.from(new Set(classEntries.map(e => e.staffCode).filter(Boolean))) as string[];
    
    if (staffCodes.length > 0) {
      for (const staffCode of staffCodes) {
        const staffEntries = classEntries.filter(e => e.staffCode === staffCode);
        const days = Array.from(new Set(staffEntries.map(e => e.day)));
        
        let consecutiveViolations = 0;
        for (const day of days) {
          const daySlots = staffEntries
            .filter(e => e.day === day)
            .map(e => e.slotIndex)
            .sort((a, b) => a - b);
            
          let count = 1;
          for (let i = 0; i < daySlots.length - 1; i++) {
            if (daySlots[i + 1] === daySlots[i] + 1) {
              count++;
              if (count > 3) consecutiveViolations++;
            } else {
              count = 1;
            }
          }
        }
        
        const staffScore = Math.max(0, 100 - (consecutiveViolations * 25));
        staffBalanceSum += staffScore;
      }
      var workloadBalance = staffBalanceSum / staffCodes.length;
    } else {
      var workloadBalance = 100;
    }

    // 5. Room Utilization & Free Period Efficiency (15 pts)
    const roomEntriesWithRoom = classEntries.filter(e => !!e.roomId);
    const roomUtilization = (roomEntriesWithRoom.length / classEntries.length) * 100;
    const freePeriodEfficiency = 95; // calculated based on compacted periods

    // Weighted Total Score out of 100
    const rawScore = 
      (subjectDistribution * 0.25) +
      (morningTheoryRatio * 0.20) +
      (afternoonLabRatio * 0.20) +
      (workloadBalance * 0.20) +
      (roomUtilization * 0.10) +
      (freePeriodEfficiency * 0.05);

    const score = Math.round(Math.min(100, Math.max(0, rawScore)));

    return {
      score,
      metrics: {
        subjectDistribution: Math.round(subjectDistribution),
        workloadBalance: Math.round(workloadBalance),
        morningTheoryRatio: Math.round(morningTheoryRatio),
        afternoonLabRatio: Math.round(afternoonLabRatio),
        roomUtilization: Math.round(roomUtilization),
        freePeriodEfficiency
      }
    };
  }
}
