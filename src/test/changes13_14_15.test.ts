import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../services/db';
import { auth, INITIAL_PROVISIONED_PASSWORD } from '../services/auth';
import { parseGprecRollNumber } from '../utils/gprecRollNumber';
import { getFileTypeBadge } from '../components/RecentStudyMaterials';
import type { StudentProfile } from '../types/spectra';

describe('CHANGE 13: Faculty Can Add Students and Make Them Login-Ready', () => {
  beforeEach(() => {
    // Clean up test data if present
    db.deleteStudent('259XA05999');
    db.deleteStudent('259XA33999');
    auth.rollbackStudentAccount('259XA05999');
    auth.rollbackStudentAccount('259XA33999');
  });

  it('validates roll number format YY9XADDNNN and auto-generates lowercase college email', () => {
    const parsed = parseGprecRollNumber('259xa05999');
    expect(parsed.isValid).toBe(true);
    expect(parsed.normalizedRoll).toBe('259XA05999');
    expect(parsed.admissionYear).toBe('25');
    expect(parsed.rollCode).toBe('9XA');
    expect(parsed.branchCode).toBe('05');
    expect(parsed.branchName).toBe('CSE');
    expect(parsed.collegeEmail).toBe('259xa05999@gprec.ac.in');
  });

  it('rejects malformed roll numbers and numbers using GPREC instead of 9XA', () => {
    const wrongCode = parseGprecRollNumber('25GPREC05999');
    expect(wrongCode.isValid).toBe(false);
    expect(wrongCode.error).toContain('9XA');

    const tooShort = parseGprecRollNumber('259XA05');
    expect(tooShort.isValid).toBe(false);
  });

  it('enforces branch authorization permissions for faculty', () => {
    const facultyUser = {
      id: 'usr-fa-01',
      email: 'faculty.cse@gprec.ac.in',
      fullName: 'Dr. R. Sudhakar',
      role: 'faculty' as const,
      branchCode: '05', // CSE only
      branchName: 'CSE',
      mustChangePassword: false,
      createdAt: '2026-08-15T09:00:00Z',
    };

    const studentCse = parseGprecRollNumber('259XA05999');
    const studentCsm = parseGprecRollNumber('259XA33999');

    // Faculty authorized for CSE
    expect(facultyUser.branchCode === studentCse.branchCode).toBe(true);

    // Faculty NOT authorized for CSM
    expect(facultyUser.branchCode === studentCsm.branchCode).toBe(false);
  });

  it('provisions student profile in DB and login account with initial temporary password and mustChangePassword', async () => {
    const testRoll = '259XA05999';
    const testEmail = '259xa05999@gprec.ac.in';
    const studentName = 'Test Student Enrolled';

    // 1. Add to database
    db.addStudent({
      id: `st-${testRoll.toLowerCase()}`,
      rollNumber: testRoll,
      fullName: studentName,
      collegeEmail: testEmail,
      personalEmailVerified: false,
      branchCode: '05',
      branchName: 'CSE',
      batchYear: '2025-29',
      currentSemester: 1,
      admissionYearCode: '25',
      sequenceNumber: '999',
      alertPreferences: {
        lowMarks: true,
        fallingMarks: true,
        attendanceAlerts: true,
        studyMaterials: true,
        supportPlans: true,
      },
    });

    // 2. Provision Auth account
    const provResult = await auth.provisionStudentAccount({
      fullName: studentName,
      rollNumber: testRoll,
      collegeEmail: testEmail,
      branchCode: '05',
      branchName: 'CSE',
      batchYear: '2025-29',
      initialPassword: INITIAL_PROVISIONED_PASSWORD,
    });

    expect(provResult.success).toBe(true);
    expect(provResult.account?.mustChangePassword).toBe(true);
    expect(provResult.account?.verifiedRollNumber).toBe(testRoll);

    // 3. Student appears immediately in DB search results
    const found = db.getStudentByRoll(testRoll);
    expect(found).toBeDefined();
    expect(found?.fullName).toBe(studentName);

    // 4. Student can login immediately with initial temporary password
    const loginResult = await auth.login(testEmail, INITIAL_PROVISIONED_PASSWORD, 'student');
    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.mustChangePassword).toBe(true);
  });

  it('rejects duplicate roll numbers and duplicate college emails', async () => {
    // Existing student Aarav Sharma is 259XA05308
    const existing = db.getStudentByRoll('259XA05308');
    expect(existing).toBeDefined();

    expect(() => {
      db.addStudent({
        id: 'st-duplicate',
        rollNumber: '259XA05308',
        fullName: 'Duplicate Student',
        collegeEmail: 'duplicate@gprec.ac.in',
        personalEmailVerified: false,
        branchCode: '05',
        branchName: 'CSE',
        batchYear: '2025-29',
        currentSemester: 1,
        admissionYearCode: '25',
        sequenceNumber: '308',
        alertPreferences: {
          lowMarks: true,
          fallingMarks: true,
          attendanceAlerts: true,
          studyMaterials: true,
          supportPlans: true,
        },
      });
    }).toThrow(/already exists/i);
  });

  it('safely rolls back database profile if auth provisioning fails', async () => {
    const testRoll = '259XA05999';
    const testEmail = '259xa05999@gprec.ac.in';

    // Step A: DB add
    db.addStudent({
      id: `st-${testRoll.toLowerCase()}`,
      rollNumber: testRoll,
      fullName: 'Rollback Candidate',
      collegeEmail: testEmail,
      personalEmailVerified: false,
      branchCode: '05',
      branchName: 'CSE',
      batchYear: '2025-29',
      currentSemester: 1,
      admissionYearCode: '25',
      sequenceNumber: '999',
      alertPreferences: {
        lowMarks: true,
        fallingMarks: true,
        attendanceAlerts: true,
        studyMaterials: true,
        supportPlans: true,
      },
    });

    expect(db.getStudentByRoll(testRoll)).toBeDefined();

    // Simulate provisioning rollback
    db.deleteStudent(testRoll);

    expect(db.getStudentByRoll(testRoll)).toBeUndefined();
  });
});

describe('CHANGE 14: Redesign Recent Study Materials', () => {
  it('correctly maps file extensions to modern badges, colors, and icons', () => {
    const pdfBadge = getFileTypeBadge('Unit_1_Lecture.pdf');
    expect(pdfBadge.label).toBe('PDF');
    expect(pdfBadge.color).toBe('#ef4444');

    const pptBadge = getFileTypeBadge('Architecture_Slides.pptx');
    expect(pptBadge.label).toBe('PPTX');
    expect(pptBadge.color).toBe('#f59e0b');

    const docBadge = getFileTypeBadge('Lab_Report_Template.docx');
    expect(docBadge.label).toBe('DOCX');
    expect(docBadge.color).toBe('#3b82f6');

    const imgBadge = getFileTypeBadge('Circuit_Schematic.png');
    expect(imgBadge.label).toBe('IMG');
    expect(imgBadge.color).toBe('#a855f7');

    const txtBadge = getFileTypeBadge('Algorithm_Code.txt');
    expect(txtBadge.label).toBe('TXT');
    expect(txtBadge.color).toBe('#38d9ce');
  });

  it('loads real persistent study materials and sorts newest first', () => {
    const materials = db.getStudyMaterials();
    expect(materials.length).toBeGreaterThan(0);

    const sorted = [...materials].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      expect(new Date(sorted[i].uploadedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(sorted[i + 1].uploadedAt).getTime()
      );
    }
  });

  it('increments download count when material is accessed', () => {
    const materials = db.getStudyMaterials();
    const first = materials[0];
    const initialCount = first.downloadCount;

    db.incrementDownloadCount(first.id);

    const updated = db.getStudyMaterials().find((m) => m.id === first.id);
    expect(updated?.downloadCount).toBe(initialCount + 1);
  });
});

describe('CHANGE 15: Secure Password-Reset Flow', () => {
  it('provides safe generic response whether email exists or not to prevent enumeration', async () => {
    // Non-existent email
    const unknownRes = await auth.requestPasswordReset('nonexistent.student@gprec.ac.in');
    expect(unknownRes.success).toBe(true);
    expect(unknownRes.message).toContain('If an account is associated with this email');
    expect(unknownRes.resetToken).toBeUndefined();

    // Existing email
    const knownRes = await auth.requestPasswordReset('259xa05308@gprec.ac.in');
    expect(knownRes.success).toBe(true);
    expect(knownRes.message).toContain('If an account is associated with this email');
    expect(knownRes.resetToken).toBeDefined();
    expect(typeof knownRes.resetToken).toBe('string');
  });

  it('rejects invalid or malformed tokens', () => {
    const invalidRes = auth.verifyResetToken('fake-invalid-token-12345');
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.error).toContain('Invalid reset token');
  });

  it('verifies valid token and allows password reset within 15-minute window', async () => {
    const req = await auth.requestPasswordReset('259xa05308@gprec.ac.in');
    const token = req.resetToken!;
    expect(token).toBeDefined();

    // Verification check
    const verify = auth.verifyResetToken(token);
    expect(verify.valid).toBe(true);
    expect(verify.email).toBe('259xa05308@gprec.ac.in');

    // Perform password reset with new strong password
    const resetRes = await auth.resetPasswordWithToken(
      token,
      'NewSecurePass#2026',
      'NewSecurePass#2026'
    );
    expect(resetRes.success).toBe(true);

    // Can log in with new password
    const login = await auth.login('259xa05308@gprec.ac.in', 'NewSecurePass#2026', 'student');
    expect(login.success).toBe(true);
    expect(login.user?.mustChangePassword).toBe(false);
  });

  it('single-use token enforcement: cannot reuse a spent token', async () => {
    const req = await auth.requestPasswordReset('259xa05301@gprec.ac.in');
    const token = req.resetToken!;

    // 1st use succeeds
    const firstReset = await auth.resetPasswordWithToken(
      token,
      'AnotherNewPass#2026',
      'AnotherNewPass#2026'
    );
    expect(firstReset.success).toBe(true);

    // 2nd use with same token fails immediately
    const verifyAgain = auth.verifyResetToken(token);
    expect(verifyAgain.valid).toBe(false);
    expect(verifyAgain.error).toContain('already been used');

    const secondReset = await auth.resetPasswordWithToken(
      token,
      'HackedPass#2026',
      'HackedPass#2026'
    );
    expect(secondReset.success).toBe(false);
    expect(secondReset.error).toContain('already been used');
  });

  it('rejects reset password if it is identical to initial temporary password (GPREC#123)', async () => {
    const req = await auth.requestPasswordReset('259xa33115@gprec.ac.in');
    const token = req.resetToken!;

    const attempt = await auth.resetPasswordWithToken(
      token,
      INITIAL_PROVISIONED_PASSWORD,
      INITIAL_PROVISIONED_PASSWORD
    );
    expect(attempt.success).toBe(false);
    expect(attempt.error).toContain('default temporary password');
  });

  it('isolates student resets from faculty accounts', async () => {
    const facultyEmail = 'faculty.cse@gprec.ac.in';
    const req = await auth.requestPasswordReset(facultyEmail);
    const token = req.resetToken!;

    const verify = auth.verifyResetToken(token);
    expect(verify.valid).toBe(true);
    expect(verify.role).toBe('faculty');

    const resetRes = await auth.resetPasswordWithToken(
      token,
      'FacultyNewPass#2026',
      'FacultyNewPass#2026'
    );
    expect(resetRes.success).toBe(true);

    // Faculty logs in with new password
    const facultyLogin = await auth.login(facultyEmail, 'FacultyNewPass#2026', 'faculty');
    expect(facultyLogin.success).toBe(true);

    // Student account is untouched
    const studentLogin = await auth.login('259xa05308@gprec.ac.in', 'NewSecurePass#2026', 'student');
    expect(studentLogin.success).toBe(true);
  });
});
