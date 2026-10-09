import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  HelpCircle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { auth, INITIAL_PROVISIONED_PASSWORD } from '../services/auth';
import type { Role } from '../types/spectra';

interface ResetPasswordPageProps {
  token: string;
  onComplete: (role?: Role) => void;
  onBackToLogin: () => void;
  onRequestNewLink: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token,
  onComplete,
  onBackToLogin,
  onRequestNewLink,
}) => {
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenRole, setTokenRole] = useState<Role | undefined>(undefined);
  const [tokenError, setTokenError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Verify token strictly on load
  useEffect(() => {
    const verification = auth.verifyResetToken(token);
    if (verification.valid && verification.email) {
      setTokenValid(true);
      setTokenEmail(verification.email);
      setTokenRole(verification.role);
    } else {
      setTokenValid(false);
      setTokenError(verification.error || 'Invalid or expired password reset link.');
    }
    setLoading(false);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (newPassword.length < 8) {
      setFormError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === INITIAL_PROVISIONED_PASSWORD) {
      setFormError('You cannot reuse the default temporary password (GPREC#123).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await auth.resetPasswordWithToken(token, newPassword, confirmPassword);
      if (!res.success) {
        setFormError(res.error || 'Password reset failed. The link may have expired.');
        setSubmitting(false);
        return;
      }

      setSuccessMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        onComplete(res.role || tokenRole);
      }, 1400);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, #151d38 0%, #0b1020 70%)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: 'min(460px, 100%)',
          background: '#11182e',
          border: '1px solid #233056',
          borderRadius: '16px',
          padding: '34px 30px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7965F5, #38D9CE)',
              marginBottom: '12px',
            }}
          >
            <KeyRound size={24} color="#0B1020" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
            SPECTRA<span style={{ color: '#38D9CE' }}>•</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#38D9CE', letterSpacing: '1.4px', fontWeight: 700, margin: '4px 0 6px' }}>
            SECURE PASSWORD RECOVERY
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#18223d',
              border: '1px solid #253358',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '10px',
              color: '#cdd4ed',
            }}
          >
            <GraduationCap size={12} color="#38D9CE" />
            <span>G. Pulla Reddy Engineering College (GPREC)</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#959cb3', fontSize: '12px' }}>
            Verifying reset token security...
          </div>
        ) : !tokenValid ? (
          /* Invalid / Expired Token Error Screen */
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertCircle size={28} />
            </div>

            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              Invalid or Expired Reset Link
            </h2>
            <p style={{ fontSize: '12px', color: '#959cb3', lineHeight: 1.6, margin: '0 0 20px' }}>
              {tokenError ||
                'This password reset link is invalid, has expired (15-minute validity window), or was already used.'}
            </p>

            <div style={{ display: 'grid', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onRequestNewLink}
              >
                Request a New Reset Link
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={onBackToLogin}
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* Valid Token — Password Reset Form */
          <>
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
                Set New Password
              </h2>
              <p style={{ fontSize: '11px', color: '#959cb3', margin: 0 }}>
                Resetting SPECTRA password for <strong>{tokenEmail}</strong>.
              </p>
            </div>

            {formError && (
              <div className="alert-banner critical" style={{ marginBottom: '14px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {successMessage && (
              <div className="alert-banner success" style={{ marginBottom: '14px' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              <label className="field-label">
                <span>New Password (minimum 8 characters)</span>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-dark"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 0,
                      color: '#959cb3',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="field-label">
                <span>Confirm New Password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-dark"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </label>

              <div
                style={{
                  background: '#161f38',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#959cb3',
                }}
              >
                <HelpCircle size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: '#38D9CE' }} />
                Resetting your SPECTRA password does not alter your college email mailbox password.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '6px' }}
              >
                {submitting ? 'Updating Password...' : 'Save New Password & Continue'}
              </button>

              <button
                type="button"
                className="btn btn-quiet"
                onClick={onBackToLogin}
                style={{ width: '100%' }}
              >
                <ArrowLeft size={14} />
                <span>Cancel & Return to Sign In</span>
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#747c98' }}>
          <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          <span>Single-Use Verified Token · Expires in 15 Minutes</span>
        </div>
      </div>
    </div>
  );
};
