"use client";

import { useState } from 'react';
import { X, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { login, signup } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: () => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { setUser } = useUser();
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const { user, token } = await login(loginEmail, loginPassword);
      setUser(user, token);
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error
          || (err as { message?: string }).message
        : 'Erro ao fazer login';
      setLoginError(String(message));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('As senhas não coincidem');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSignupLoading(true);

    try {
      const { user, token } = await signup(signupName, signupEmail, signupPassword);
      setUser(user, token);
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error
          || (err as { message?: string }).message
        : 'Erro ao criar conta';
      setSignupError(String(message));
    } finally {
      setSignupLoading(false);
    }
  };

  const handleSwitch = () => {
    setIsFlipping(true);
    setTimeout(() => {
      onSwitchMode();
      setIsFlipping(false);
    }, 200);
  };

  const showLogin = mode === 'login';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      
      {/* Container com perspective para o flip 3D */}
      <div className="relative w-full max-w-md md:max-w-xl mx-4" style={{ perspective: '2000px' }}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full border border-blue-100"
          style={{
            transform: showLogin ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.4s ease-out',
            willChange: 'transform',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Login Side */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
              position: showLogin ? 'relative' : 'absolute',
              inset: 0,
              visibility: showLogin ? 'visible' : 'hidden',
            }}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-4 md:px-6 py-3 rounded-t-2xl flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Entrar</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6">
              {loginError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3 md:space-y-4">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Senha
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={handleSwitch}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Criar conta
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Signup Side */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              position: showLogin ? 'absolute' : 'relative',
              inset: 0,
              visibility: showLogin ? 'hidden' : 'visible',
            }}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-4 md:px-6 py-3 rounded-t-2xl flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Criar Conta</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6">
              {signupError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{signupError}</span>
                </div>
              )}

              <form onSubmit={handleSignupSubmit} className="space-y-3 md:space-y-4">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Senha
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                  </div>

                  <div>
                    <label htmlFor="signup-confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Senha
                    </label>
                    <input
                      id="signup-confirmPassword"
                      type="password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {signupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Criando conta...</span>
                    </>
                  ) : (
                    <span>Criar Conta</span>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={handleSwitch}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Fazer login
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
