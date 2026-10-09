import { describe, it, expect, beforeEach } from 'vitest';
import { auth, INITIAL_PROVISIONED_PASSWORD } from '../services/auth';

describe('SPECTRA Authentication & Password Policy', () => {
  beforeEach(() => {
    auth.logout();
  });

  it('rejects non-college emails', async () => {
    const res = await auth.login('student@gmail.com', 'somepass', 'student');
    expect(res.success).toBe(false);
    expect(res.error).toContain('@gprec.ac.in');
  });

  it('authenticates provisioned student Aarav Sharma with temporary password GPREC#123', async () => {
    const res = await auth.login('259xa05308@gprec.ac.in', INITIAL_PROVISIONED_PASSWORD, 'student');
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.role).toBe('student');
    expect(res.user?.mustChangePassword).toBe(true);
  });

  it('rejects student attempting to login through faculty portal', async () => {
    const res = await auth.login('259xa05308@gprec.ac.in', INITIAL_PROVISIONED_PASSWORD, 'faculty');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Faculty portal');
  });

  it('enforces mandatory password change and rejects reuse of temporary password', async () => {
    const user = (await auth.login('259xa05308@gprec.ac.in', INITIAL_PROVISIONED_PASSWORD, 'student')).user!;

    // Attempting to reuse GPREC#123
    const reuseAttempt = await auth.changePassword(
      user.id,
      INITIAL_PROVISIONED_PASSWORD,
      INITIAL_PROVISIONED_PASSWORD,
      INITIAL_PROVISIONED_PASSWORD
    );
    expect(reuseAttempt.success).toBe(false);
    expect(reuseAttempt.error).toContain('cannot reuse the default temporary password');

    // Attempting mismatch
    const mismatchAttempt = await auth.changePassword(
      user.id,
      INITIAL_PROVISIONED_PASSWORD,
      'NewSecurePass123!',
      'DifferentPass123!'
    );
    expect(mismatchAttempt.success).toBe(false);
    expect(mismatchAttempt.error).toContain('do not match');

    // Successful update
    const successAttempt = await auth.changePassword(
      user.id,
      INITIAL_PROVISIONED_PASSWORD,
      'Aarav@Secure2026',
      'Aarav@Secure2026'
    );
    expect(successAttempt.success).toBe(true);

    // Verify mustChangePassword is now false
    const relogin = await auth.login('259xa05308@gprec.ac.in', 'Aarav@Secure2026', 'student');
    expect(relogin.success).toBe(true);
    expect(relogin.user?.mustChangePassword).toBe(false);
  });

  it('provides safe responses on password reset without leaking account existence', async () => {
    const res = await auth.requestPasswordReset('nonexistent@gprec.ac.in');
    expect(res.success).toBe(true);
    expect(res.message).toContain('If an account is associated');
  });
});
