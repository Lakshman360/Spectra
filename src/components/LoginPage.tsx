import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  GraduationCap,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Send,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { auth, INITIAL_PROVISIONED_PASSWORD } from '../services/auth';
import type { UserAccount, Role } from '../types/spectra';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onNavigateResetToken?: (token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateResetToken,
}) => {
  const [viewMode, setViewMode] = useState<'login' | 'forgot-request'>('login');
  const [roleTab, setRoleTab] = useState<Role>('student');
  const [email, setEmail] = useState('259xa05308@gprec.ac.in');
  const [password, setPassword] = useState(INITIAL_PROVISIONED_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Change Modal state (Mandatory first-login)
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  // Dedicated Forgot Password Request state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [generatedResetToken, setGeneratedResetToken] = useState<string | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const handleRoleTabChange = (newRole: Role) => {
    setRoleTab(newRole);
    setErrorMessage('');
    if (newRole === 'student') {
      setEmail('259xa05308@gprec.ac.in');
      setPassword(INITIAL_PROVISIONED_PASSWORD);
    } else {
      setEmail('faculty.cse@gprec.ac.in');
      setPassword('Faculty@GPREC2026');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await auth.login(email, password, roleTab);
      if (!result.success || !result.user) {
        setErrorMessage(result.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Check mandatory first-login password change
      if (result.user.mustChangePassword) {
        setPendingUser(result.user);
        setCurrentPassword(password);
        setLoading(false);
        return;
      }

      onLoginSuccess(result.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleMandatoryPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setChangeError('');
    setChangeSuccess('');

    const res = await auth.changePassword(
      pendingUser.id,
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (!res.success) {
      setChangeError(res.error || 'Failed to update password.');
      return;
    }

    setChangeSuccess('Password changed successfully! Logging you in...');
    setTimeout(() => {
      const updatedUser = { ...pendingUser, mustChangePassword: false };
      setPendingUser(null);
      onLoginSuccess(updatedUser);
    }, 1200);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSubmitting(true);
    setForgotMessage('');
    setGeneratedResetToken(null);

    const res = await auth.requestPasswordReset(forgotEmail);
    setForgotMessage(res.message);
    if (res.resetToken) {
      setGeneratedResetToken(res.resetToken);
    }
    setForgotSubmitting(false);
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
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7965F5, #38D9CE)',
              marginBottom: '14px',
              boxShadow: '0 8px 24px rgba(121, 101, 245, 0.35)',
            }}
          >
            <Sparkles size={26} color="#0B1020" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', color: '#fff', margin: 0 }}>
            SPECTRA<span style={{ color: '#38D9CE' }}>•</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#38D9CE', letterSpacing: '1.5px', fontWeight: 700, margin: '4px 0 6px' }}>
            SEE BEYOND THE SCORES
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#18223d',
              border: '1px solid #253358',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '10px',
              color: '#cdd4ed',
            }}
          >
            <GraduationCap size={13} color="#38D9CE" />
            <span>G. Pulla Reddy Engineering College (GPREC)</span>
          </div>
        </div>

        {/* VIEW: FORGOT PASSWORD REQUEST PAGE */}
        {viewMode === 'forgot-request' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className="icon-btn"
                style={{ width: '30px', height: '30px' }}
                onClick={() => {
                  setViewMode('login');
                  setForgotMessage('');
                  setGeneratedResetToken(null);
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Forgot Password
                </h2>
                <span style={{ fontSize: '10.5px', color: '#959cb3' }}>
                  Request secure reset link for your account
                </span>
              </div>
            </div>

            {forgotMessage ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <CheckCircle2 size={36} color="#38D9CE" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '12px', color: '#c9d0e7', lineHeight: 1.6, marginBottom: '16px' }}>
                  {forgotMessage}
                </p>

                {/* Direct Test Link for Dev/Evaluation */}
                {generatedResetToken && onNavigateResetToken && (
                  <div
                    style={{
                      background: '#161f38',
                      border: '1px solid #243154',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '16px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#38D9CE', fontWeight: 700, marginBottom: '6px' }}>
                      DEMO & EVALUATION SHORTCUT:
                    </div>
                    <p style={{ fontSize: '11px', color: '#cbd2e8', margin: '0 0 10px' }}>
                      A secure single-use token was dispatched to the system activity log. You can proceed directly to the token-verified reset screen below:
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '11px' }}
                      onClick={() => onNavigateResetToken(generatedResetToken)}
                    >
                      <span>Open Verified Reset Screen Now</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setViewMode('login');
                    setForgotMessage('');
                    setGeneratedResetToken(null);
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'grid', gap: '14px' }}>
                <p style={{ fontSize: '11.5px', color: '#959cb3', margin: 0, lineHeight: 1.5 }}>
                  Enter your registered GPREC college email (e.g. <code>259xa05308@gprec.ac.in</code>). We will generate a secure 15-minute single-use reset link.
                </p>

                <label className="field-label">
                  <span>Registered College Email</span>
                  <input
                    type="email"
                    required
                    className="input-dark"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. 259xa05308@gprec.ac.in"
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
                  Safe confirmation: Responses do not expose whether an arbitrary address is registered.
                </div>

                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '11px' }}
                >
                  {forgotSubmitting ? (
                    'Generating Reset Link...'
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send Secure Reset Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ width: '100%' }}
                  onClick={() => setViewMode('login')}
                >
                  Cancel & Return to Sign In
                </button>
              </form>
            )}
          </div>
        ) : (
          /* VIEW: NORMAL LOGIN (Student vs Faculty) */
          <>
            {/* Tab Selection: Student vs Faculty */}
            <div className="tab-strip" style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={`tab-btn ${roleTab === 'student' ? 'active' : ''}`}
                onClick={() => handleRoleTabChange('student')}
              >
                Student Login
              </button>
              <button
                type="button"
                className={`tab-btn ${roleTab === 'faculty' ? 'active' : ''}`}
                onClick={() => handleRoleTabChange('faculty')}
              >
                Faculty Login
              </button>
            </div>

            {errorMessage && (
              <div className="alert-banner critical" style={{ marginBottom: '18px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} style={{ display: 'grid', gap: '15px' }}>
              <label className="field-label">
                <span>{roleTab === 'student' ? 'Student College Email (rollnumber@gprec.ac.in)' : 'Faculty College Email'}</span>
                <input
                  type="email"
                  required
                  className="input-dark"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={roleTab === 'student' ? '259xa05308@gprec.ac.in' : 'faculty@gprec.ac.in'}
                />
              </label>

              <label className="field-label">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Password</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setViewMode('forgot-request');
                    }}
                    style={{
                      border: 0,
                      background: 'transparent',
                      color: '#38D9CE',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-dark"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
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

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '13px', marginTop: '6px' }}
              >
                {loading ? (
                  'Verifying Credentials...'
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign In to SPECTRA</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Test Demo Credential Selector */}
            <div
              style={{
                marginTop: '22px',
                paddingTop: '16px',
                borderTop: '1px solid #202b48',
              }}
            >
              <div style={{ fontSize: '10px', color: '#8890ab', marginBottom: '8px', fontWeight: 600 }}>
                QUICK LOGIN TEST ACCOUNTS:
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ justifyContent: 'flex-start', fontSize: '10.5px', padding: '7px 10px' }}
                  onClick={() => {
                    setRoleTab('student');
                    setEmail('259xa05308@gprec.ac.in');
                    setPassword(INITIAL_PROVISIONED_PASSWORD);
                  }}
                >
                  <span className="live-dot" style={{ background: '#f59e0b' }} />
                  <span>Aarav Sharma (Student · Mandatory Password Change)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ justifyContent: 'flex-start', fontSize: '10.5px', padding: '7px 10px' }}
                  onClick={() => {
                    setRoleTab('student');
                    setEmail('259xa05301@gprec.ac.in');
                    setPassword('Meera@Pass2026');
                  }}
                >
                  <span className="live-dot" style={{ background: '#10b981' }} />
                  <span>Meera Iyer (Student · CSE Batch 2025-29)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ justifyContent: 'flex-start', fontSize: '10.5px', padding: '7px 10px' }}
                  onClick={() => {
                    setRoleTab('faculty');
                    setEmail('faculty.cse@gprec.ac.in');
                    setPassword('Faculty@GPREC2026');
                  }}
                >
                  <span className="live-dot" style={{ background: '#7965F5' }} />
                  <span>Dr. R. Sudhakar (Faculty Coordinator · CSE)</span>
                </button>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '10px', color: '#747c98' }}>
          <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          <span>GPREC Authorized Access Only · Strict Dark Mode Policy</span>
        </div>
      </div>

      {/* Mandatory First-Login Password Change Modal */}
      {pendingUser && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow" style={{ color: '#f59e0b' }}>MANDATORY SECURITY REQUIREMENT</span>
                <h2>Change Temporary Password</h2>
                <p>
                  Welcome to SPECTRA, <strong>{pendingUser.fullName}</strong>. Accounts provisioned with the initial
                  temporary password (<code>{INITIAL_PROVISIONED_PASSWORD}</code>) must set a secure permanent password before proceeding.
                </p>
              </div>
            </div>

            {changeError && (
              <div className="alert-banner critical" style={{ marginBottom: '14px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{changeError}</span>
              </div>
            )}

            {changeSuccess && (
              <div className="alert-banner success" style={{ marginBottom: '14px' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{changeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMandatoryPasswordChange} style={{ display: 'grid', gap: '13px' }}>
              <label className="field-label">
                <span>Current Temporary Password</span>
                <input
                  type="password"
                  required
                  className="input-dark"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>

              <label className="field-label">
                <span>New Password (minimum 8 characters)</span>
                <input
                  type="password"
                  required
                  className="input-dark"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong new password"
                />
              </label>

              <label className="field-label">
                <span>Confirm New Password</span>
                <input
                  type="password"
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
                Changing your SPECTRA password does not alter your college email mailbox password.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => setPendingUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <KeyRound size={15} />
                  <span>Update Password & Continue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
