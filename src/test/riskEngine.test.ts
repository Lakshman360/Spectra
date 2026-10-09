import { describe, it, expect } from 'vitest';
import { evaluateStudentRisk } from '../utils/riskEngine';
import { calculateAttendance } from '../utils/attendanceCalculator';
import type { StudentMark } from '../types/spectra';

describe('Academic Early Warning Risk Engine', () => {
  it('flags student with high-priority attendance shortage and failing marks as High concern', () => {
    const attendance = calculateAttendance({ present: 6, absent: 4, pending: 0 }); // 60% -> High-Priority
    const marks: StudentMark[] = [
      {
        id: 'm1',
        assessmentId: 'a1',
        studentRoll: '259XA05308',
        subjectId: 's1',
        subjectName: 'Mathematics II',
        testName: 'Mid Test 1',
        marksObtained: 40,
        maxMarks: 100,
        percentage: 40,
        recordedByFacultyId: 'f1',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'm2',
        assessmentId: 'a2',
        studentRoll: '259XA05308',
        subjectId: 's2',
        subjectName: 'Programming in C',
        testName: 'Mid Test 1',
        marksObtained: 45,
        maxMarks: 100,
        percentage: 45,
        recordedByFacultyId: 'f1',
        updatedAt: '2026-10-02T10:00:00Z',
      },
    ];

    const result = evaluateStudentRisk({
      rollNumber: '259XA05308',
      studentName: 'Aarav Sharma',
      marks,
      attendance,
    });

    expect(result.riskLevel).toBe('High concern');
    expect(result.riskScore).toBeGreaterThanOrEqual(60);
    expect(result.evidenceReasons.some((r) => r.includes('60%'))).toBe(true);
    expect(result.evidenceReasons.some((r) => r.includes('below 50%'))).toBe(true);
  });

  it('marks student with good attendance and high marks as Low concern', () => {
    const attendance = calculateAttendance({ present: 18, absent: 2, pending: 0 }); // 90%
    const marks: StudentMark[] = [
      {
        id: 'm1',
        assessmentId: 'a1',
        studentRoll: '259XA05301',
        subjectId: 's1',
        subjectName: 'Mathematics II',
        testName: 'Mid Test 1',
        marksObtained: 85,
        maxMarks: 100,
        percentage: 85,
        recordedByFacultyId: 'f1',
        updatedAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'm2',
        assessmentId: 'a2',
        studentRoll: '259XA05301',
        subjectId: 's2',
        subjectName: 'Programming in C',
        testName: 'Mid Test 1',
        marksObtained: 90,
        maxMarks: 100,
        percentage: 90,
        recordedByFacultyId: 'f1',
        updatedAt: '2026-10-02T10:00:00Z',
      },
    ];

    const result = evaluateStudentRisk({
      rollNumber: '259XA05301',
      studentName: 'Meera Iyer',
      marks,
      attendance,
    });

    expect(result.riskLevel).toBe('Low concern');
    expect(result.riskScore).toBeLessThan(30);
  });
});
