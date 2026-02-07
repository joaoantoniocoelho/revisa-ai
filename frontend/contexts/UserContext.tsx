"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile, isAuthenticated as checkAuth, type User } from '@/lib/auth';
interface UserContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  getCredits: () => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      if (!checkAuth()) {
        setLoading(false);
        return;
      }

      const freshUser = await getProfile();
      setUserState(freshUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error loading user:', error);
      setUserState(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const setUser = (userData: User, token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    setUserState(userData);
    setIsAuthenticated(true);
  };

  const updateUser = (newData: Partial<User>) => {
    if (user) {
      setUserState({ ...user, ...newData });
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const getCredits = () => {
    return user?.credits ?? 0;
  };

  const value: UserContextType = {
    user,
    loading,
    isAuthenticated,
    setUser,
    updateUser,
    refreshUser,
    getCredits,
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
