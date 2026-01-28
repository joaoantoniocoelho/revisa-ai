"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, getProfile, isAuthenticated as checkAuth } from '@/lib/auth';
import api from '@/lib/api';

interface UserLimits {
  plan: {
    name: string;
    displayName: string;
    features: string[];
  };
  limits: {
    pdfsPerMonth: number;
    allowedDensities: string[];
    maxCardsPerDeck: number | null;
  };
  usage: {
    pdfUsed: number;
    pdfRemaining: number;
    canUploadPdf: boolean;
  };
}

interface UserContextType {
  user: User | null;
  limits: UserLimits | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  refreshLimits: () => Promise<void>;
  getPdfLimit: () => number;
  getAllowedDensities: () => string[];
  canUploadPdf: () => boolean;
  getPdfUsed: () => number;
  getPdfRemaining: () => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  // Não redireciona mais - o app funciona sem autenticação

  const loadUser = async () => {
    try {
      if (!checkAuth()) {
        setLoading(false);
        return;
      }

      // Busca perfil do servidor (já inclui limites)
      const freshUser = await getProfile();
      setUser(freshUser);
      setIsAuthenticated(true);
      
      // Extrai limites do perfil
      if (freshUser.limits) {
        setLimits(freshUser.limits);
      } else {
        console.warn('User profile without limits, retrying...');
        // Se não tem limits, busca novamente
        const retryUser = await getProfile();
        if (retryUser.limits) {
          setUser(retryUser);
          setLimits(retryUser.limits);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
      setIsAuthenticated(false);
      setLimits(null);
    } finally {
      setLoading(false);
    }
  };

  const setUserData = (userData: User, token: string) => {
    // Salva token no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    
    // Atualiza estado
    setUser(userData);
    setIsAuthenticated(true);
    
    // Extrai limites do usuário
    if (userData.limits) {
      setLimits(userData.limits);
    }
  };

  const updateUser = (newData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...newData };
      setUser(updatedUser);
      // Dados ficam apenas em memória
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const refreshLimits = async () => {
    // Recarrega o perfil completo (que já inclui limites)
    await loadUser();
  };

  const getPdfLimit = () => {
    return limits?.limits.pdfsPerMonth || 0;
  };

  const getAllowedDensities = () => {
    return limits?.limits.allowedDensities || ['low'];
  };

  const canUploadPdf = () => {
    return limits?.usage.canUploadPdf || false;
  };

  const getPdfUsed = () => {
    return limits?.usage.pdfUsed || 0;
  };

  const getPdfRemaining = () => {
    return limits?.usage.pdfRemaining || 0;
  };

  const value: UserContextType = {
    user,
    limits,
    loading,
    isAuthenticated,
    setUser: setUserData,
    updateUser,
    refreshUser,
    refreshLimits,
    getPdfLimit,
    getAllowedDensities,
    canUploadPdf,
    getPdfUsed,
    getPdfRemaining,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
