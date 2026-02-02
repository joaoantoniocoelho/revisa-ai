"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AuthModal from '@/components/AuthModal';

type AuthModalType = 'login' | 'signup' | null;

interface AuthModalContextValue {
  openLoginModal: () => void;
  openSignupModal: () => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [whichModal, setWhichModal] = useState<AuthModalType>(null);

  const openLoginModal = useCallback(() => {
    setWhichModal('login');
  }, []);

  const openSignupModal = useCallback(() => {
    setWhichModal('signup');
  }, []);

  const closeAuthModal = useCallback(() => {
    setWhichModal(null);
  }, []);

  const switchMode = useCallback(() => {
    setWhichModal(prev => prev === 'login' ? 'signup' : 'login');
  }, []);

  useEffect(() => {
    const isOpen = whichModal !== null;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [whichModal]);

  return (
    <AuthModalContext.Provider value={{ openLoginModal, openSignupModal, closeAuthModal }}>
      {children}
      {whichModal && (
        <AuthModal
          mode={whichModal}
          onClose={closeAuthModal}
          onSwitchMode={switchMode}
        />
      )}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return ctx;
}
