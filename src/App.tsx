import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { StudentPortal } from './components/StudentPortal';
import { FacultyPortal } from './components/FacultyPortal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { BackendStatusModal } from './components/BackendStatusModal';
import { auth } from './services/auth';
import type { UserAccount, Role } from './types/spectra';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => auth.getCurrentUser());
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      // Check hash e.g. #reset-token=XYZ
      const hash = window.location.hash;
      if (hash.includes('reset-token=')) {
        return hash.split('reset-token=')[1].split('&')[0];
      }
      // Check query param e.g. ?resetToken=XYZ
      const params = new URLSearchParams(window.location.search);
      return params.get('resetToken') || params.get('token');
    }
    return null;
  });

  // Enforce dark-mode only on root html/body
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    document.body.style.backgroundColor = '#0b1020';
    document.body.style.color = '#f4f6fc';
  }, []);

  // Listen for hash change for password reset links
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('reset-token=')) {
        setResetToken(hash.split('reset-token=')[1].split('&')[0]);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    auth.logout();
    setCurrentUser(null);
  };

  const clearResetTokenFromUrl = () => {
    setResetToken(null);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // If a reset token is present in the URL, show the token-verified Reset Password Page
  if (resetToken) {
    return (
      <div className="dark app-container" style={{ minHeight: '100vh', background: '#0b1020', color: '#f4f6fc' }}>
        <ResetPasswordPage
          token={resetToken}
          onComplete={(role) => {
            clearResetTokenFromUrl();
          }}
          onBackToLogin={() => {
            clearResetTokenFromUrl();
          }}
          onRequestNewLink={() => {
            clearResetTokenFromUrl();
          }}
        />
      </div>
    );
  }

  return (
    <div className="dark app-container" style={{ minHeight: '100vh', background: '#0b1020', color: '#f4f6fc' }}>
      {!currentUser ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateResetToken={(token) => setResetToken(token)}
        />
      ) : currentUser.role === 'student' ? (
        <StudentPortal
          user={currentUser}
          onLogout={handleLogout}
          onOpenBackendStatus={() => setShowBackendModal(true)}
        />
      ) : (
        <FacultyPortal
          user={currentUser}
          onLogout={handleLogout}
          onOpenBackendStatus={() => setShowBackendModal(true)}
        />
      )}

      {showBackendModal && (
        <BackendStatusModal onClose={() => setShowBackendModal(false)} />
      )}
    </div>
  );
}
