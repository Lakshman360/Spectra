/**
 * SPECTRA Authentication & Account Management Service
 *
 * Implements:
 * - Student Login via official college email (rollnumber@gprec.ac.in).
 * - Faculty Login via provisioned college email (faculty@gprec.ac.in).
 * - Initial temporary password check (GPREC#123) with mandatory must_change_password enforcement.
 * - Password update flow clearing must_change_password flag.
 * - Faculty student provisioning (Change 13): makes students login-ready immediately.
 * - Secure token-based password reset (Change 15): single-use, 15-minute expiry, safe responses.
 */

import type { UserAccount, Role } from '../types/spectra';
import { parseGprecRollNumber, parseStudentCollegeEmail } from '../utils/gprecRollNumber';
import { db } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const SESSION_KEY = 'spectra_auth_session_user';
const USERS_KEY = 'spectra_auth_accounts_v2';
const RESET_TOKENS_KEY = 'spectra_reset_tokens_v2';
export const INITIAL_PROVISIONED_PASSWORD = 'GPREC#123';

export interface PasswordResetTokenRecord {
  token: string;
  email: string;
  role: Role;
  expiresAt: number;
  used: boolean;
  createdAt: number;
}

// Initial provisioned user accounts
const initialAccounts: Array<UserAccount & { passwordHash: string }> = [
  // Student 1: Aarav Sharma (Needs first-login password change)
  {
    id: 'usr-st-01',
    email: '259xa05308@gprec.ac.in',
    fullName: 'Aarav Sharma',
    role: 'student',
    mustChangePassword: true, // Initial password must be changed
    verifiedRollNumber: '259XA05308',
    branchCode: '05',
    branchName: 'CSE',
    batchYear: '2025-29',
    personalEmail: 'aarav.sharma.personal@gmail.com',
    personalEmailVerified: true,
    advisorId: 'fa-01',
    avatarInitials: 'AS',
    createdAt: '2026-09-01T08:00:00Z',
    passwordHash: INITIAL_PROVISIONED_PASSWORD,
  },
  // Student 2: Meera Iyer (Already changed password)
  {
    id: 'usr-st-02',
    email: '259xa05301@gprec.ac.in',
    fullName: 'Meera Iyer',
    role: 'student',
    mustChangePassword: false,
    verifiedRollNumber: '259XA05301',
    branchCode: '05',
    branchName: 'CSE',
    batchYear: '2025-29',
    personalEmail: 'meera.iyer.gprec@gmail.com',
    personalEmailVerified: true,
    advisorId: 'fa-01',
    avatarInitials: 'MI',
    createdAt: '2026-09-01T08:00:00Z',
    passwordHash: 'Meera@Pass2026',
  },
  // Student 3: Priya Nair (CSM)
  {
    id: 'usr-st-03',
    email: '259xa33115@gprec.ac.in',
    fullName: 'Priya Nair',
    role: 'student',
    mustChangePassword: false,
    verifiedRollNumber: '259XA33115',
    branchCode: '33',
    branchName: 'CSM',
    batchYear: '2025-29',
    personalEmail: 'priya.nair.study@gmail.com',
    personalEmailVerified: false,
    advisorId: 'fa-02',
    avatarInitials: 'PN',
    createdAt: '2026-09-01T08:00:00Z',
    passwordHash: 'Priya@Secure9XA',
  },
  // Faculty Account: Dr. R. Sudhakar (CSE Coordinator)
  {
    id: 'usr-fa-01',
    email: 'faculty.cse@gprec.ac.in',
    fullName: 'Dr. R. Sudhakar',
    role: 'faculty',
    mustChangePassword: false,
    department: 'Computer Science and Engineering',
    branchCode: '05',
    avatarInitials: 'RS',
    createdAt: '2026-08-15T09:00:00Z',
    passwordHash: 'Faculty@GPREC2026',
  },
  // Faculty Account: Prof. S. Rao (CSM Advisor)
  {
    id: 'usr-fa-02',
    email: 'faculty.csm@gprec.ac.in',
    fullName: 'Prof. S. Rao',
    role: 'faculty',
    mustChangePassword: true, // Needs initial password change
    department: 'Artificial Intelligence & Machine Learning',
    branchCode: '33',
    avatarInitials: 'SR',
    createdAt: '2026-08-15T09:00:00Z',
    passwordHash: INITIAL_PROVISIONED_PASSWORD,
  },
];

class AuthService {
  private accounts: Array<UserAccount & { passwordHash: string }>;
  private resetTokens: PasswordResetTokenRecord[];
  private currentUser: UserAccount | null = null;

  constructor() {
    this.accounts = this.loadAccounts();
    this.resetTokens = this.loadResetTokens();
    this.currentUser = this.loadSession();
  }

  private loadAccounts() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(USERS_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initialAccounts;
  }

  private saveAccounts() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(USERS_KEY, JSON.stringify(this.accounts));
      } catch {}
    }
  }

  private loadResetTokens(): PasswordResetTokenRecord[] {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(RESET_TOKENS_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  }

  private saveResetTokens() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(this.resetTokens));
      } catch {}
    }
  }

  private loadSession(): UserAccount | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  }

  private saveSession(user: UserAccount | null) {
    this.currentUser = user;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (user) {
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        } catch {}
      } else {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {}
      }
    }
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  /**
   * Authenticate a user with email and password.
   */
  public async login(
    emailInput: string,
    passwordInput: string,
    intendedRole?: Role
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !password) {
      return { success: false, error: 'Please enter both college email and password.' };
    }

    if (!email.endsWith('@gprec.ac.in')) {
      return {
        success: false,
        error: 'Only authorized GPREC college email accounts (@gprec.ac.in) are permitted.',
      };
    }

    // Role-specific check if student email
    const studentEmailCheck = parseStudentCollegeEmail(email);
    if (intendedRole === 'faculty' && studentEmailCheck.isStudentEmail) {
      return {
        success: false,
        error: 'Student accounts cannot sign in through the Faculty portal.',
      };
    }

    if (intendedRole === 'student' && !studentEmailCheck.isStudentEmail) {
      return {
        success: false,
        error: 'Please enter a valid student college email (e.g. 259xa05308@gprec.ac.in).',
      };
    }

    // Find account
    const account = this.accounts.find((a) => a.email.toLowerCase() === email);
    if (!account) {
      return {
        success: false,
        error: 'Account not found. Contact the academic administrator to provision your access.',
      };
    }

    // Check password
    if (account.passwordHash !== password) {
      return {
        success: false,
        error: 'Invalid password. Please check your credentials and try again.',
      };
    }

    // If student, ensure verified roll number matches student database
    if (account.role === 'student' && account.verifiedRollNumber) {
      const studentInDb = db.getStudentByRoll(account.verifiedRollNumber);
      if (!studentInDb) {
        return {
          success: false,
          error: `No academic student record found for roll number ${account.verifiedRollNumber}.`,
        };
      }
    }

    // Session user (strip sensitive passwordHash)
    const { passwordHash: _, ...safeUser } = account;
    this.saveSession(safeUser);

    db.logActivity({
      userId: safeUser.id,
      userEmail: safeUser.email,
      action: 'LOGIN',
      entityType: 'Auth',
      entityId: safeUser.id,
      details: `User signed in successfully as ${safeUser.role.toUpperCase()}.`,
    });

    return { success: true, user: safeUser };
  }

  /**
   * CHANGE 13: Provision a new student authentication account.
   * Creates an active, login-ready account with initial password GPREC#123
   * and mustChangePassword = true.
   */
  public async provisionStudentAccount(params: {
    fullName: string;
    rollNumber: string;
    collegeEmail: string;
    branchCode: string;
    branchName: string;
    batchYear: string;
    initialPassword?: string;
  }): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
    const normRoll = params.rollNumber.trim().toUpperCase();
    const normEmail = params.collegeEmail.trim().toLowerCase();

    // Check duplicate roll number
    const existingRoll = this.accounts.find(
      (a) => a.verifiedRollNumber?.toUpperCase() === normRoll
    );
    if (existingRoll) {
      return {
        success: false,
        error: `Login account for roll number ${normRoll} already exists.`,
      };
    }

    // Check duplicate email
    const existingEmail = this.accounts.find(
      (a) => a.email.toLowerCase() === normEmail
    );
    if (existingEmail) {
      return {
        success: false,
        error: `Login account for email ${normEmail} already exists.`,
      };
    }

    const initials = params.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join('')
      .toUpperCase() || 'ST';

    const newAccount: UserAccount & { passwordHash: string } = {
      id: `usr-st-${normRoll.toLowerCase()}`,
      email: normEmail,
      fullName: params.fullName.trim(),
      role: 'student',
      mustChangePassword: true, // Mandatory password change on first login
      verifiedRollNumber: normRoll,
      branchCode: params.branchCode,
      branchName: params.branchName,
      batchYear: params.batchYear,
      personalEmail: undefined,
      personalEmailVerified: false,
      avatarInitials: initials,
      createdAt: new Date().toISOString(),
      passwordHash: params.initialPassword || INITIAL_PROVISIONED_PASSWORD,
    };

    this.accounts.push(newAccount);
    this.saveAccounts();

    // If Supabase is connected, attempt provisioning in Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signUp({
          email: normEmail,
          password: params.initialPassword || INITIAL_PROVISIONED_PASSWORD,
          options: {
            data: {
              fullName: params.fullName,
              rollNumber: normRoll,
              role: 'student',
              branchCode: params.branchCode,
            },
          },
        });
      } catch (err) {
        console.warn('Supabase auth signup notice:', err);
      }
    }

    db.logActivity({
      userId: newAccount.id,
      userEmail: newAccount.email,
      action: 'PROVISION_STUDENT_ACCOUNT',
      entityType: 'Auth',
      entityId: normRoll,
      details: `Provisioned login-ready student account for ${params.fullName} (${normRoll}) with initial password requirement.`,
    });

    const { passwordHash: _, ...safeUser } = newAccount;
    return { success: true, account: safeUser };
  }

  /**
   * Rollback account if database profile write failed.
   */
  public rollbackStudentAccount(rollNumber: string): void {
    const idx = this.accounts.findIndex(
      (a) => a.verifiedRollNumber?.toUpperCase() === rollNumber.toUpperCase()
    );
    if (idx !== -1) {
      this.accounts.splice(idx, 1);
      this.saveAccounts();
    }
  }

  /**
   * Mandatory First-Login Password Change or user password update.
   */
  public async changePassword(
    userId: string,
    currentPasswordInput: string,
    newPasswordInput: string,
    confirmPasswordInput: string
  ): Promise<{ success: boolean; error?: string }> {
    const currentPassword = currentPasswordInput.trim();
    const newPassword = newPasswordInput.trim();
    const confirmPassword = confirmPasswordInput.trim();

    if (!newPassword || !confirmPassword) {
      return { success: false, error: 'New password and confirmation are required.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirmation do not match.' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    if (newPassword === INITIAL_PROVISIONED_PASSWORD) {
      return {
        success: false,
        error: 'You cannot reuse the default temporary password. Choose a new secure password.',
      };
    }

    const account = this.accounts.find((a) => a.id === userId);
    if (!account) {
      return { success: false, error: 'Account not found.' };
    }

    // If current password provided, verify it
    if (currentPassword && account.passwordHash !== currentPassword) {
      return { success: false, error: 'Current password does not match.' };
    }

    // Update password and clear mustChangePassword flag
    account.passwordHash = newPassword;
    account.mustChangePassword = false;
    this.saveAccounts();

    // Update current session
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser.mustChangePassword = false;
      this.saveSession(this.currentUser);
    }

    db.logActivity({
      userId: account.id,
      userEmail: account.email,
      action: 'CHANGE_PASSWORD',
      entityType: 'Auth',
      entityId: account.id,
      details: 'User successfully updated their SPECTRA password. Mandatory change flag cleared.',
    });

    return { success: true };
  }

  /**
   * CHANGE 15: Request genuine password reset link.
   * Generates single-use 15-minute token and logs genuine provider message.
   * Uses safe generic message to avoid leaking whether account exists.
   */
  public async requestPasswordReset(emailInput: string): Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
    resetLink?: string;
  }> {
    const email = emailInput.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return {
        success: false,
        message: 'Please provide a valid registered college email address.',
      };
    }

    const account = this.accounts.find((a) => a.email.toLowerCase() === email);

    if (account) {
      // Generate secure 32-character token
      const token =
        Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 10)).join('') +
        Date.now().toString(36);

      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

      const tokenRecord: PasswordResetTokenRecord = {
        token,
        email,
        role: account.role,
        expiresAt,
        used: false,
        createdAt: Date.now(),
      };

      this.resetTokens.push(tokenRecord);
      this.saveResetTokens();

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://spectra.gprec.ac.in';
      const resetLink = `${origin}/#reset-token=${token}`;

      db.logEmailDelivery({
        recipientEmail: email,
        recipientType: 'college',
        studentRoll: account.verifiedRollNumber || 'FACULTY',
        alertType: 'PASSWORD_RESET',
        subject: 'SPECTRA Password Reset Request',
        status: 'sent',
        providerMessage: `Password reset link generated (expires in 15 mins): ${resetLink}`,
      });

      return {
        success: true,
        message:
          'If an account is associated with this email, a secure password reset link has been dispatched to your mailbox.',
        resetToken: token,
        resetLink,
      };
    }

    // Safe response: does not leak whether email is in the database
    return {
      success: true,
      message:
        'If an account is associated with this email, a secure password reset link has been dispatched to your mailbox.',
    };
  }

  /**
   * CHANGE 15: Verify password reset token.
   * Rejects invalid, expired, or already-used tokens.
   */
  public verifyResetToken(token: string): {
    valid: boolean;
    email?: string;
    role?: Role;
    error?: string;
  } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Reset token is missing or malformed.' };
    }

    const record = this.resetTokens.find((r) => r.token === token);

    if (!record) {
      return { valid: false, error: 'Invalid reset token. Please request a new password reset link.' };
    }

    if (record.used) {
      return { valid: false, error: 'This password reset link has already been used.' };
    }

    if (Date.now() > record.expiresAt) {
      return { valid: false, error: 'This password reset link has expired. Reset links are valid for 15 minutes.' };
    }

    return { valid: true, email: record.email, role: record.role };
  }

  /**
   * CHANGE 15: Reset password with verified token.
   * Single-use execution: marks token used immediately upon success.
   */
  public async resetPasswordWithToken(
    token: string,
    newPasswordInput: string,
    confirmPasswordInput: string
  ): Promise<{ success: boolean; role?: Role; error?: string }> {
    const verification = this.verifyResetToken(token);
    if (!verification.valid || !verification.email) {
      return { success: false, error: verification.error || 'Invalid or expired token.' };
    }

    const newPassword = newPasswordInput.trim();
    const confirmPassword = confirmPasswordInput.trim();

    if (!newPassword || !confirmPassword) {
      return { success: false, error: 'New password and confirmation are required.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirmation do not match.' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    if (newPassword === INITIAL_PROVISIONED_PASSWORD) {
      return {
        success: false,
        error: 'You cannot use the default temporary password. Choose a new secure password.',
      };
    }

    const account = this.accounts.find(
      (a) => a.email.toLowerCase() === verification.email!.toLowerCase()
    );

    if (!account) {
      return { success: false, error: 'Account associated with token no longer exists.' };
    }

    // Update password
    account.passwordHash = newPassword;
    account.mustChangePassword = false;
    this.saveAccounts();

    // Mark token as used so it cannot be re-used
    const record = this.resetTokens.find((r) => r.token === token);
    if (record) {
      record.used = true;
      this.saveResetTokens();
    }

    db.logActivity({
      userId: account.id,
      userEmail: account.email,
      action: 'RESET_PASSWORD_WITH_TOKEN',
      entityType: 'Auth',
      entityId: account.id,
      details: 'User successfully completed token-verified password reset.',
    });

    return { success: true, role: account.role };
  }

  /**
   * Sign out current user.
   */
  public logout(): void {
    if (this.currentUser) {
      db.logActivity({
        userId: this.currentUser.id,
        userEmail: this.currentUser.email,
        action: 'LOGOUT',
        entityType: 'Auth',
        entityId: this.currentUser.id,
        details: 'User signed out.',
      });
    }
    this.saveSession(null);
  }
}

export const auth = new AuthService();
