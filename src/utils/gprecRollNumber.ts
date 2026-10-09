/**
 * GPREC Roll-Number & College Identification Utility
 *
 * College Name: G. Pulla Reddy Engineering College
 * College Code: GPREC
 * College Email Domain: gprec.ac.in
 * Code Embedded in Roll Numbers: 9XA
 *
 * Format: YY9XADDNNN (Total length: exactly 10 characters)
 *   YY  = 2-digit admission-year code (e.g., "25")
 *   9XA = GPREC roll-number code (never substitute GPREC for 9XA or vice versa)
 *   DD  = 2-digit branch code (e.g., "05" for CSE, "33" for CSM, "04" for EEE)
 *   NNN = 3-digit student sequence number
 */

import type { GprecRollDetails } from '../types/spectra';

export const COLLEGE_CONFIG = {
  name: 'G. Pulla Reddy Engineering College',
  shortCode: 'GPREC',
  emailDomain: 'gprec.ac.in',
  rollCode: '9XA',
} as const;

/**
 * Authorized branch mappings for GPREC.
 * Configurable for future authorized additions without guessing.
 */
export const GPREC_BRANCHES: Record<string, { shortName: string; fullName: string }> = {
  '05': {
    shortName: 'CSE',
    fullName: 'Computer Science and Engineering',
  },
  '33': {
    shortName: 'CSM',
    fullName: 'Computer Science and Machine Learning (AI & ML)',
  },
  '04': {
    shortName: 'EEE',
    fullName: 'Electrical and Electronics Engineering',
  },
};

/**
 * Register a new authorized branch code into the GPREC registry.
 */
export function registerAuthorizedBranch(code: string, shortName: string, fullName: string): void {
  const normalizedCode = code.trim();
  if (normalizedCode.length === 2) {
    GPREC_BRANCHES[normalizedCode] = { shortName, fullName };
  }
}

/**
 * Parse and validate a GPREC student roll number.
 *
 * @param input Raw roll number string (e.g. "259xa05308" or " 259XA05308 ")
 * @returns Typed result with parsed segments or explicit error
 */
export function parseGprecRollNumber(input: string | null | undefined): GprecRollDetails {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalizedRoll: '',
      admissionYear: '',
      rollCode: '',
      branchCode: '',
      branchName: '',
      sequenceNumber: '',
      collegeEmail: '',
      error: 'Roll number cannot be empty.',
    };
  }

  const trimmed = input.trim();
  const normalizedRoll = trimmed.toUpperCase();

  // Explicit check for using GPREC instead of 9XA
  if (normalizedRoll.includes('GPREC')) {
    return {
      isValid: false,
      normalizedRoll,
      admissionYear: '',
      rollCode: 'GPREC',
      branchCode: '',
      branchName: '',
      sequenceNumber: '',
      collegeEmail: '',
      error: `Invalid roll code: 'GPREC' is the college identifier, but '9XA' must be used inside roll numbers (YY9XADDNNN).`,
    };
  }

  // Exactly 10 characters required: YY(2) + 9XA(3) + DD(2) + NNN(3) = 10
  if (normalizedRoll.length !== 10) {
    return {
      isValid: false,
      normalizedRoll,
      admissionYear: '',
      rollCode: '',
      branchCode: '',
      branchName: '',
      sequenceNumber: '',
      collegeEmail: '',
      error: `Invalid length: Expected exactly 10 characters, received ${normalizedRoll.length}.`,
    };
  }

  const admissionYear = normalizedRoll.slice(0, 2);
  const rollCode = normalizedRoll.slice(2, 5);
  const branchCode = normalizedRoll.slice(5, 7);
  const sequenceNumber = normalizedRoll.slice(7, 10);

  // Check YY is numeric
  if (!/^\d{2}$/.test(admissionYear)) {
    return {
      isValid: false,
      normalizedRoll,
      admissionYear,
      rollCode,
      branchCode,
      branchName: '',
      sequenceNumber,
      collegeEmail: '',
      error: `Invalid admission year '${admissionYear}'. Must be 2 numeric digits.`,
    };
  }

  // Check college roll code is strictly "9XA"
  if (rollCode !== COLLEGE_CONFIG.rollCode) {
    if (rollCode === 'GPR' || normalizedRoll.includes('GPREC')) {
      return {
        isValid: false,
        normalizedRoll,
        admissionYear,
        rollCode,
        branchCode,
        branchName: '',
        sequenceNumber,
        collegeEmail: '',
        error: `Invalid roll code: 'GPREC' is the college identifier, but '9XA' must be used inside roll numbers (YY9XADDNNN).`,
      };
    }
    return {
      isValid: false,
      normalizedRoll,
      admissionYear,
      rollCode,
      branchCode,
      branchName: '',
      sequenceNumber,
      collegeEmail: '',
      error: `Invalid college roll code '${rollCode}'. Expected '${COLLEGE_CONFIG.rollCode}'.`,
    };
  }

  // Check branch code is 2 digits
  if (!/^\d{2}$/.test(branchCode)) {
    return {
      isValid: false,
      normalizedRoll,
      admissionYear,
      rollCode,
      branchCode,
      branchName: '',
      sequenceNumber,
      collegeEmail: '',
      error: `Invalid branch code format '${branchCode}'. Must be 2 digits.`,
    };
  }

  // Check if branch code exists in authorized registry
  const branchEntry = GPREC_BRANCHES[branchCode];
  if (!branchEntry) {
    return {
      isValid: false,
      normalizedRoll,
      admissionYear,
      rollCode,
      branchCode,
      branchName: 'Unknown Branch',
      sequenceNumber,
      collegeEmail: '',
      error: `Unknown branch code '${branchCode}'. Authorized GPREC branch codes: ${Object.keys(GPREC_BRANCHES).join(', ')}.`,
    };
  }

  // Check sequence number is exactly 3 numeric digits
  if (!/^\d{3}$/.test(sequenceNumber)) {
    return {
      isValid: false,
      normalizedRoll,
      admissionYear,
      rollCode,
      branchCode,
      branchName: branchEntry.shortName,
      sequenceNumber,
      collegeEmail: '',
      error: `Invalid student sequence '${sequenceNumber}'. Must be exactly 3 digits.`,
    };
  }

  // Generate lowercase official college email
  const collegeEmail = `${normalizedRoll.toLowerCase()}@${COLLEGE_CONFIG.emailDomain}`;

  return {
    isValid: true,
    normalizedRoll,
    admissionYear,
    rollCode,
    branchCode,
    branchName: branchEntry.shortName,
    sequenceNumber,
    collegeEmail,
  };
}

/**
 * Generate official college email from a validated roll number.
 * Returns null if roll number is not valid.
 */
export function getCollegeEmailFromRoll(rollNumber: string): string | null {
  const details = parseGprecRollNumber(rollNumber);
  return details.isValid ? details.collegeEmail : null;
}

/**
 * Check if an email is a student college email matching GPREC format.
 */
export function parseStudentCollegeEmail(email: string): { isStudentEmail: boolean; rollNumber?: string } {
  if (!email || !email.includes('@')) return { isStudentEmail: false };
  const [localPart, domain] = email.trim().toLowerCase().split('@');
  if (domain !== COLLEGE_CONFIG.emailDomain) return { isStudentEmail: false };

  const parsed = parseGprecRollNumber(localPart);
  if (parsed.isValid) {
    return { isStudentEmail: true, rollNumber: parsed.normalizedRoll };
  }
  return { isStudentEmail: false };
}
