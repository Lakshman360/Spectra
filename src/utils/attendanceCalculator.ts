/**
 * GPREC Attendance Calculation & Warning Threshold Rules
 *
 * Implements the 3-state attendance system:
 * - Pending: Attendance not yet recorded; excluded from calculations and warnings.
 * - Present: Student attended class.
 * - Absent: Student was absent.
 *
 * Threshold Rules:
 * - 75% to 100%: No attendance-shortage warning (At exactly 75%, NO warning).
 * - 65% to below 75%: Regular Attendance Warning.
 * - Below 65%: High-Priority Attendance Warning.
 * - No finalized records: "Not available yet", no warning.
 */

import type {
  AttendanceStatus,
  AttendanceWarningLevel,
  AttendanceCalculationResult,
} from '../types/spectra';

export const ATTENDANCE_CONFIG = {
  regularThreshold: 75.0, // Default 75%
  highPriorityThreshold: 65.0, // Default 65%
  regularStudentMessage:
    'Your attendance is below 75%. Please improve your attendance and contact your faculty advisor if you need support.',
  highPriorityStudentMessage:
    'High-priority warning: Your attendance is below 65%. Please contact your faculty advisor as soon as possible.',
};

export interface AttendanceCounts {
  present: number;
  absent: number;
  pending: number;
}

/**
 * Calculates attendance metrics and warning levels from an array of attendance statuses or counts.
 *
 * Formula:
 * Finalized = Present + Absent
 * Attendance percentage = (Present / Finalized) * 100 (Unrounded for threshold evaluations)
 */
export function calculateAttendance(
  recordsOrCounts: Array<AttendanceStatus | { status: AttendanceStatus }> | AttendanceCounts,
  customConfig?: { regularThreshold?: number; highPriorityThreshold?: number }
): AttendanceCalculationResult {
  const regularLimit = customConfig?.regularThreshold ?? ATTENDANCE_CONFIG.regularThreshold;
  const highPriorityLimit =
    customConfig?.highPriorityThreshold ?? ATTENDANCE_CONFIG.highPriorityThreshold;

  let presentCount = 0;
  let absentCount = 0;
  let pendingCount = 0;

  if (Array.isArray(recordsOrCounts)) {
    for (const item of recordsOrCounts) {
      const status = typeof item === 'string' ? item : item.status;
      if (status === 'Present') {
        presentCount++;
      } else if (status === 'Absent') {
        absentCount++;
      } else if (status === 'Pending') {
        pendingCount++;
      }
    }
  } else {
    presentCount = Math.max(0, recordsOrCounts.present || 0);
    absentCount = Math.max(0, recordsOrCounts.absent || 0);
    pendingCount = Math.max(0, recordsOrCounts.pending || 0);
  }

  const finalizedCount = presentCount + absentCount;
  const totalSessions = finalizedCount + pendingCount;

  // If no finalized records, attendance is not available yet
  if (finalizedCount === 0) {
    return {
      presentCount,
      absentCount,
      pendingCount,
      finalizedCount: 0,
      totalSessions,
      rawPercentage: null,
      displayPercentage: 'Not available yet',
      warningLevel: 'NONE',
      studentMessage: null,
      facultyNotice: pendingCount > 0 ? `${pendingCount} sessions pending recording` : 'No finalized attendance sessions',
    };
  }

  // Calculate percentage with full precision using finalized records only
  const rawPercentage = (presentCount / finalizedCount) * 100;
  // Round only for display: 1 decimal place (or integer if whole)
  const displayPercentage =
    rawPercentage % 1 === 0 ? `${rawPercentage.toFixed(0)}%` : `${rawPercentage.toFixed(1)}%`;

  // Apply thresholds to unrounded percentage
  let warningLevel: AttendanceWarningLevel = 'NONE';
  let studentMessage: string | null = null;
  let facultyNotice: string | null = null;

  if (rawPercentage < highPriorityLimit) {
    // Below 65% — High Priority Attendance Warning
    warningLevel = 'HIGH_PRIORITY_WARNING';
    studentMessage = ATTENDANCE_CONFIG.highPriorityStudentMessage;
    facultyNotice = `High-Priority: Attendance is ${displayPercentage} (below ${highPriorityLimit}% limit). Immediate advisor follow-up recommended.`;
  } else if (rawPercentage < regularLimit) {
    // 65% to below 75% — Regular Attendance Warning
    warningLevel = 'ATTENDANCE_WARNING';
    studentMessage = ATTENDANCE_CONFIG.regularStudentMessage;
    facultyNotice = `Attendance Warning: Attendance is ${displayPercentage} (below ${regularLimit}% limit). Monitor student progress.`;
  } else {
    // 75% and above (including exactly 75%) — No warning
    warningLevel = 'NONE';
    studentMessage = null;
    facultyNotice = null;
  }

  return {
    presentCount,
    absentCount,
    pendingCount,
    finalizedCount,
    totalSessions,
    rawPercentage,
    displayPercentage,
    warningLevel,
    studentMessage,
    facultyNotice,
  };
}

export type WarningStateTransition =
  | 'NO_CHANGE'
  | 'CREATED_REGULAR'
  | 'ESCALATED_TO_HIGH'
  | 'DOWNGRADED_TO_REGULAR'
  | 'RESOLVED';

/**
 * Compares old and new attendance warning states to determine transitions.
 * Prevents redundant notification emails when warning state does not change.
 */
export function getAttendanceWarningTransition(
  previousLevel: AttendanceWarningLevel,
  currentLevel: AttendanceWarningLevel
): WarningStateTransition {
  if (previousLevel === currentLevel) {
    return 'NO_CHANGE';
  }

  if (previousLevel === 'NONE') {
    if (currentLevel === 'ATTENDANCE_WARNING') return 'CREATED_REGULAR';
    if (currentLevel === 'HIGH_PRIORITY_WARNING') return 'ESCALATED_TO_HIGH';
  }

  if (previousLevel === 'ATTENDANCE_WARNING') {
    if (currentLevel === 'HIGH_PRIORITY_WARNING') return 'ESCALATED_TO_HIGH';
    if (currentLevel === 'NONE') return 'RESOLVED';
  }

  if (previousLevel === 'HIGH_PRIORITY_WARNING') {
    if (currentLevel === 'ATTENDANCE_WARNING') return 'DOWNGRADED_TO_REGULAR';
    if (currentLevel === 'NONE') return 'RESOLVED';
  }

  return 'NO_CHANGE';
}
