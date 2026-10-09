/**
 * SPECTRA Academic Early Warning System — Explainable Risk Engine
 *
 * Uses transparent, rule-based weights rather than black-box AI claims.
 * Suggested weights:
 * - Academic weakness: 40%
 * - Attendance concern: 25% (integrated with the 75% and 65% rules)
 * - Falling marks: 20%
 * - Missing or incomplete work: 15%
 */

import type {
  RiskLevel,
  StudentMark,
  AttendanceCalculationResult,
} from '../types/spectra';

export interface StudentAcademicData {
  rollNumber: string;
  studentName: string;
  marks: StudentMark[];
  attendance: AttendanceCalculationResult;
  expectedAssessmentsCount?: number;
}

export interface RiskEvaluationResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0 to 100
  evidenceReasons: string[];
  suggestedAction: string;
  academicScoreComponent: number;
  attendanceScoreComponent: number;
  trendScoreComponent: number;
  missingScoreComponent: number;
}

export const RISK_WEIGHTS = {
  academicWeakness: 0.4, // 40%
  attendanceConcern: 0.25, // 25%
  fallingMarks: 0.2, // 20%
  missingWork: 0.15, // 15%
};

/**
 * Evaluates student academic standing and generates transparent evidence reasons.
 */
export function evaluateStudentRisk(data: StudentAcademicData): RiskEvaluationResult {
  const evidenceReasons: string[] = [];

  // 1. Academic Weakness (40% weight)
  let academicComponent = 0;
  if (data.marks.length > 0) {
    const totalPercentage = data.marks.reduce((sum, m) => sum + m.percentage, 0);
    const avgPercentage = totalPercentage / data.marks.length;

    if (avgPercentage < 50) {
      academicComponent = 100; // full risk in this component
      evidenceReasons.push(`Average assessment score is ${avgPercentage.toFixed(1)}% (below 50% passing threshold).`);
    } else if (avgPercentage < 65) {
      academicComponent = 60;
      evidenceReasons.push(`Average assessment score is ${avgPercentage.toFixed(1)}% (below 65% benchmark).`);
    } else {
      academicComponent = 0;
    }

    // Check individual subjects with low scores
    const weakSubjects = data.marks.filter((m) => m.percentage < 50);
    if (weakSubjects.length > 0) {
      const subjectNames = weakSubjects.map((s) => `${s.subjectName} (${s.percentage}%)`).join(', ');
      evidenceReasons.push(`Low performance in: ${subjectNames}.`);
    }
  }

  // 2. Attendance Concern (25% weight)
  let attendanceComponent = 0;
  if (data.attendance.rawPercentage !== null) {
    const att = data.attendance.rawPercentage;
    if (att < 65.0) {
      attendanceComponent = 100;
      evidenceReasons.push(`High-priority attendance shortage: ${data.attendance.displayPercentage} (below 65%).`);
    } else if (att < 75.0) {
      attendanceComponent = 65;
      evidenceReasons.push(`Attendance warning: ${data.attendance.displayPercentage} (below 75% requirement).`);
    } else {
      attendanceComponent = 0;
    }
  }

  // 3. Falling Marks Trend (20% weight)
  let trendComponent = 0;
  if (data.marks.length >= 2) {
    // Sort chronologically if needed, or compare latest tests
    const sortedMarks = [...data.marks].sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );
    const recent = sortedMarks.slice(-2);
    const drop = recent[0].percentage - recent[1].percentage;

    if (drop >= 15) {
      trendComponent = 100;
      evidenceReasons.push(`Sharp score decline: dropped by ${drop.toFixed(0)} points in consecutive tests.`);
    } else if (drop >= 8) {
      trendComponent = 60;
      evidenceReasons.push(`Declining test performance: decreased by ${drop.toFixed(0)} points.`);
    } else {
      trendComponent = 0;
    }
  }

  // 4. Missing / Incomplete Work (15% weight)
  let missingComponent = 0;
  if (data.expectedAssessmentsCount && data.expectedAssessmentsCount > data.marks.length) {
    const missingCount = data.expectedAssessmentsCount - data.marks.length;
    missingComponent = Math.min(100, missingCount * 50);
    evidenceReasons.push(`${missingCount} scheduled assessment(s) not yet completed or recorded.`);
  }

  // Calculate weighted risk score (0 - 100)
  const weightedScore = Math.round(
    academicComponent * RISK_WEIGHTS.academicWeakness +
      attendanceComponent * RISK_WEIGHTS.attendanceConcern +
      trendComponent * RISK_WEIGHTS.fallingMarks +
      missingComponent * RISK_WEIGHTS.missingWork
  );

  let riskLevel: RiskLevel = 'Low concern';
  let suggestedAction = 'Continue standard study routine and maintain attendance.';

  if (weightedScore >= 60 || attendanceComponent === 100) {
    riskLevel = 'High concern';
    suggestedAction = 'Faculty check-in + guided practice + advisor consultation.';
  } else if (weightedScore >= 30 || attendanceComponent > 0) {
    riskLevel = 'Medium concern';
    suggestedAction = 'Study plan assignment and bi-weekly progress review.';
  }

  if (evidenceReasons.length === 0) {
    evidenceReasons.push('Academic performance and attendance are currently on track.');
  }

  return {
    riskLevel,
    riskScore: weightedScore,
    evidenceReasons,
    suggestedAction,
    academicScoreComponent: academicComponent,
    attendanceScoreComponent: attendanceComponent,
    trendScoreComponent: trendComponent,
    missingScoreComponent: missingComponent,
  };
}
