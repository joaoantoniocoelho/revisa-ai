"use client";

import { UserProvider } from '@/contexts/UserContext';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <AuthModalProvider>
        {children}
      </AuthModalProvider>
    </UserProvider>
  );
}
