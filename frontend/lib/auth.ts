import api from './api';

export interface User {
  _id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  credits?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  const response = await api.post('/auth/login', { email, password });
  const { user } = response.data;
  return { user };
}

export async function loginWithGoogle(credential: string): Promise<{ user: User }> {
  const response = await api.post('/auth/google', { credential });
  const { user } = response.data;
  return { user };
}

export async function signup(name: string, email: string, password: string): Promise<{ user: User }> {
  const response = await api.post('/auth/signup', { name, email, password });
  const { user } = response.data;
  return { user };
}

export async function getProfile(): Promise<User> {
  const response = await api.get('/auth/profile');
  return response.data.user;
}


export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}

export async function resendVerificationEmail(): Promise<void> {
  await api.post('/auth/resend-verification');
}
