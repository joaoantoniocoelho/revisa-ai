"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile, type User } from '@/lib/auth';
interface UserContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
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
      const freshUser = await getProfile();
      setUserState(freshUser);
      setIsAuthenticated(true);
    } catch {
      setUserState(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const setUser = (userData: User) => {
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
