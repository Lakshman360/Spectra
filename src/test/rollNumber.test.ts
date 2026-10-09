import { describe, it, expect } from 'vitest';
import {
  parseGprecRollNumber,
  COLLEGE_CONFIG,
  GPREC_BRANCHES,
  parseStudentCollegeEmail,
} from '../utils/gprecRollNumber';

describe('GPREC Roll-Number & Identification Requirements', () => {
  it('correctly distinguishes college code GPREC from roll-embedded code 9XA', () => {
    expect(COLLEGE_CONFIG.shortCode).toBe('GPREC');
    expect(COLLEGE_CONFIG.rollCode).toBe('9XA');
    expect(COLLEGE_CONFIG.shortCode).not.toBe(COLLEGE_CONFIG.rollCode);
  });

  it('parses valid uppercase roll number 259XA05308', () => {
    const result = parseGprecRollNumber('259XA05308');
    expect(result.isValid).toBe(true);
    expect(result.normalizedRoll).toBe('259XA05308');
    expect(result.admissionYear).toBe('25');
    expect(result.rollCode).toBe('9XA');
    expect(result.branchCode).toBe('05');
    expect(result.branchName).toBe('CSE');
    expect(result.sequenceNumber).toBe('308');
    expect(result.collegeEmail).toBe('259xa05308@gprec.ac.in');
  });

  it('normalizes lowercase input 259xa05308 with whitespace', () => {
    const result = parseGprecRollNumber('  259xa05308  ');
    expect(result.isValid).toBe(true);
    expect(result.normalizedRoll).toBe('259XA05308');
    expect(result.collegeEmail).toBe('259xa05308@gprec.ac.in');
  });

  it('validates CSM branch code 33 and EEE branch code 04', () => {
    const csmResult = parseGprecRollNumber('259XA33102');
    expect(csmResult.isValid).toBe(true);
    expect(csmResult.branchCode).toBe('33');
    expect(csmResult.branchName).toBe('CSM');
    expect(csmResult.collegeEmail).toBe('259xa33102@gprec.ac.in');

    const eeeResult = parseGprecRollNumber('249XA04205');
    expect(eeeResult.isValid).toBe(true);
    expect(eeeResult.branchCode).toBe('04');
    expect(eeeResult.branchName).toBe('EEE');
    expect(eeeResult.collegeEmail).toBe('249xa04205@gprec.ac.in');
  });

  it('rejects roll numbers substituting GPREC for 9XA', () => {
    const result = parseGprecRollNumber('25GPREC05308');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('9XA');
  });

  it('flags unknown branch codes rather than guessing', () => {
    const result = parseGprecRollNumber('259XA99101');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unknown branch code');
  });

  it('rejects invalid length or malformed characters', () => {
    expect(parseGprecRollNumber('259XA0530').isValid).toBe(false); // 9 chars
    expect(parseGprecRollNumber('259XA053089').isValid).toBe(false); // 11 chars
    expect(parseGprecRollNumber('XX9XA05308').isValid).toBe(false); // non-numeric YY
    expect(parseGprecRollNumber('259XA0530A').isValid).toBe(false); // non-numeric sequence
    expect(parseGprecRollNumber('').isValid).toBe(false);
    expect(parseGprecRollNumber(null).isValid).toBe(false);
  });

  it('correctly identifies student college emails', () => {
    const valid = parseStudentCollegeEmail('259xa05308@gprec.ac.in');
    expect(valid.isStudentEmail).toBe(true);
    expect(valid.rollNumber).toBe('259XA05308');

    const external = parseStudentCollegeEmail('student@gmail.com');
    expect(external.isStudentEmail).toBe(false);

    const faculty = parseStudentCollegeEmail('faculty.cse@gprec.ac.in');
    expect(faculty.isStudentEmail).toBe(false);
  });
});
