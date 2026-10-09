import { describe, it, expect } from 'vitest';
import {
  calculateAttendance,
  getAttendanceWarningTransition,
  ATTENDANCE_CONFIG,
} from '../utils/attendanceCalculator';

describe('GPREC Three-State Attendance & Warning Thresholds', () => {
  it('excludes Pending records from both numerator and denominator', () => {
    // 3 Present, 1 Absent, 10 Pending => 3 / 4 = 75%
    const res = calculateAttendance([
      'Present',
      'Present',
      'Present',
      'Absent',
      'Pending',
      'Pending',
      'Pending',
      'Pending',
    ]);
    expect(res.presentCount).toBe(3);
    expect(res.absentCount).toBe(1);
    expect(res.pendingCount).toBe(4);
    expect(res.finalizedCount).toBe(4);
    expect(res.rawPercentage).toBe(75.0);
    expect(res.displayPercentage).toBe('75%');
    expect(res.warningLevel).toBe('NONE');
  });

  it('handles Pending-only sessions without false 0% or warnings', () => {
    const res = calculateAttendance(['Pending', 'Pending', 'Pending']);
    expect(res.finalizedCount).toBe(0);
    expect(res.rawPercentage).toBeNull();
    expect(res.displayPercentage).toBe('Not available yet');
    expect(res.warningLevel).toBe('NONE');
    expect(res.studentMessage).toBeNull();
  });

  it('exactly 75% produces NO attendance shortage warning', () => {
    // 15 Present, 5 Absent => 15 / 20 = 75%
    const res = calculateAttendance({ present: 15, absent: 5, pending: 2 });
    expect(res.rawPercentage).toBe(75.0);
    expect(res.warningLevel).toBe('NONE');
    expect(res.studentMessage).toBeNull();
  });

  it('100% and 85% produce NO attendance warning', () => {
    const res100 = calculateAttendance({ present: 10, absent: 0, pending: 0 });
    expect(res100.warningLevel).toBe('NONE');

    const res85 = calculateAttendance({ present: 85, absent: 15, pending: 0 });
    expect(res85.warningLevel).toBe('NONE');
  });

  it('74% triggers the Regular Attendance Warning', () => {
    // 74 Present, 26 Absent => 74%
    const res = calculateAttendance({ present: 74, absent: 26, pending: 0 });
    expect(res.rawPercentage).toBe(74.0);
    expect(res.warningLevel).toBe('ATTENDANCE_WARNING');
    expect(res.studentMessage).toBe(ATTENDANCE_CONFIG.regularStudentMessage);
    expect(res.studentMessage).toContain('Your attendance is below 75%');
  });

  it('70% triggers the Regular Attendance Warning', () => {
    const res = calculateAttendance({ present: 7, absent: 3, pending: 0 });
    expect(res.rawPercentage).toBe(70.0);
    expect(res.warningLevel).toBe('ATTENDANCE_WARNING');
    expect(res.studentMessage).toBe(ATTENDANCE_CONFIG.regularStudentMessage);
  });

  it('exactly 65% triggers the Regular Attendance Warning (not high-priority)', () => {
    // 13 Present, 7 Absent => 13 / 20 = 65%
    const res = calculateAttendance({ present: 13, absent: 7, pending: 1 });
    expect(res.rawPercentage).toBe(65.0);
    expect(res.warningLevel).toBe('ATTENDANCE_WARNING');
    expect(res.studentMessage).toBe(ATTENDANCE_CONFIG.regularStudentMessage);
  });

  it('64% triggers the High-Priority Attendance Warning', () => {
    // 64 Present, 36 Absent => 64%
    const res = calculateAttendance({ present: 64, absent: 36, pending: 0 });
    expect(res.rawPercentage).toBe(64.0);
    expect(res.warningLevel).toBe('HIGH_PRIORITY_WARNING');
    expect(res.studentMessage).toBe(ATTENDANCE_CONFIG.highPriorityStudentMessage);
    expect(res.studentMessage).toContain('High-priority warning: Your attendance is below 65%');
  });

  it('50% and 0% finalized trigger High-Priority Attendance Warning', () => {
    const res50 = calculateAttendance({ present: 5, absent: 5, pending: 0 });
    expect(res50.warningLevel).toBe('HIGH_PRIORITY_WARNING');

    const res0 = calculateAttendance({ present: 0, absent: 4, pending: 0 });
    expect(res0.warningLevel).toBe('HIGH_PRIORITY_WARNING');
  });

  it('tracks warning state transitions: escalation, downgrade, and resolution', () => {
    // Transition from NONE (76%) to Regular Warning (74%)
    expect(getAttendanceWarningTransition('NONE', 'ATTENDANCE_WARNING')).toBe('CREATED_REGULAR');

    // Escalation from 66% (ATTENDANCE_WARNING) to 64% (HIGH_PRIORITY_WARNING)
    expect(getAttendanceWarningTransition('ATTENDANCE_WARNING', 'HIGH_PRIORITY_WARNING')).toBe('ESCALATED_TO_HIGH');

    // Recovery from 64% (HIGH_PRIORITY_WARNING) to 70% (ATTENDANCE_WARNING)
    expect(getAttendanceWarningTransition('HIGH_PRIORITY_WARNING', 'ATTENDANCE_WARNING')).toBe('DOWNGRADED_TO_REGULAR');

    // Full recovery from 70% (ATTENDANCE_WARNING) to 75%+ (NONE)
    expect(getAttendanceWarningTransition('ATTENDANCE_WARNING', 'NONE')).toBe('RESOLVED');

    // No change
    expect(getAttendanceWarningTransition('ATTENDANCE_WARNING', 'ATTENDANCE_WARNING')).toBe('NO_CHANGE');
  });
});
