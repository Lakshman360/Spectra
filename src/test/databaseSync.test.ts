import { describe, it, expect } from 'vitest';
import { db } from '../services/db';
import { calculateAttendance } from '../utils/attendanceCalculator';

describe('Faculty-to-Student Synchronization & Database Persistence', () => {
  it('initializes new attendance session with all enrolled students as Pending', () => {
    const session = db.createAttendanceSession(
      {
        date: '2026-10-15',
        subjectId: 'sub-01',
        subjectName: 'Mathematics II',
        branchCode: '05',
        batchYear: '2025-29',
        period: 2,
        facultyId: 'usr-fa-01',
        facultyName: 'Dr. R. Sudhakar',
      },
      ['259XA05308', '259XA05301']
    );

    expect(session.id).toBeDefined();

    const records = db.getSessionAttendanceRecords(session.id);
    expect(records.length).toBe(2);
    expect(records[0].status).toBe('Pending');
    expect(records[1].status).toBe('Pending');
  });

  it('updates attendance status to Present or Absent and reflects in student attendance records', () => {
    const studentRoll = '259XA05308';
    const beforeRecords = db.getStudentAttendance(studentRoll);
    const beforeCalc = calculateAttendance(beforeRecords);

    // Create a new session and mark student Absent
    const session = db.createAttendanceSession(
      {
        date: '2026-10-16',
        subjectId: 'sub-02',
        subjectName: 'Programming in C',
        branchCode: '05',
        batchYear: '2025-29',
        period: 3,
        facultyId: 'usr-fa-01',
        facultyName: 'Dr. R. Sudhakar',
      },
      [studentRoll]
    );

    db.updateAttendanceRecord(session.id, studentRoll, 'Absent', 'usr-fa-01');

    const afterRecords = db.getStudentAttendance(studentRoll);
    const afterCalc = calculateAttendance(afterRecords);

    expect(afterCalc.absentCount).toBe(beforeCalc.absentCount + 1);
    expect(afterCalc.finalizedCount).toBe(beforeCalc.finalizedCount + 1);
  });

  it('prevents marks from exceeding maximum marks', () => {
    expect(() => {
      db.saveMark({
        assessmentId: 'ass-01',
        studentRoll: '259XA05308',
        subjectId: 'sub-01',
        subjectName: 'Mathematics II',
        testName: 'Mid Test 1',
        marksObtained: 35,
        maxMarks: 30, // 35 > 30 should fail!
        recordedByFacultyId: 'usr-fa-01',
      });
    }).toThrow('cannot exceed maximum marks');
  });

  it('saves valid marks and synchronizes with student marks query', () => {
    const saved = db.saveMark({
      assessmentId: 'ass-01',
      studentRoll: '259XA05308',
      subjectId: 'sub-01',
      subjectName: 'Mathematics II',
      testName: 'Mid Test 1',
      marksObtained: 25,
      maxMarks: 30,
      recordedByFacultyId: 'usr-fa-01',
    });

    expect(saved.percentage).toBe(83.3);

    const studentMarks = db.getMarks({ studentRoll: '259XA05308', assessmentId: 'ass-01' });
    expect(studentMarks.length).toBe(1);
    expect(studentMarks[0].marksObtained).toBe(25);
  });

  it('uploads study materials and increments download count', () => {
    const mat = db.addStudyMaterial({
      title: 'Operating Systems — Concurrency',
      subjectId: 'sub-03',
      subjectName: 'Data Structures',
      description: 'Threads, mutexes and semaphores notes.',
      fileName: 'GPREC_OS_Concurrency.pdf',
      fileSizeBytes: 154000,
      fileType: 'application/pdf',
      branchCode: '05',
      batchYear: '2025-29',
      uploadedByFacultyId: 'usr-fa-01',
      uploadedByFacultyName: 'Dr. R. Sudhakar',
    });

    expect(mat.downloadCount).toBe(0);
    db.incrementDownloadCount(mat.id);

    const fetched = db.getStudyMaterials().find((m) => m.id === mat.id);
    expect(fetched?.downloadCount).toBe(1);
  });
});
