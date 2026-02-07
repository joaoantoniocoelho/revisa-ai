import api from './api';

export interface User {
  _id: string;
  name: string;
  email: string;
  credits?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const response = await api.post('/auth/login', { email, password });
  const { user, token } = response.data;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
  
  return { user, token };
}

export async function signup(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
  const response = await api.post('/auth/signup', { name, email, password });
  const { user, token } = response.data;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
  
  return { user, token };
}

export async function getProfile(): Promise<User> {
  const response = await api.get('/auth/profile');
  return response.data.user;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/';
  }
}
