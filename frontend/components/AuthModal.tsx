"use client";

import { useState } from 'react';
import { X, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { login, signup, loginWithGoogle } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';

interface AuthModalProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSwitchMode: () => void;
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const isMaintenanceMode =
    process.env.NEXT_PUBLIC_APP_MAINTENANCE_MODE === "true";
  const maintenanceMessage =
    "Estamos em construção. Login e cadastro estão temporariamente desativados.";
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

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credential: string) => {
    if (isMaintenanceMode) {
      setGoogleError(maintenanceMessage);
      return;
    }
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const { user } = await loginWithGoogle(credential);
      setUser(user);
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; message?: string } }; message?: string }).response?.data?.message
          || (err as { response?: { data?: { error?: string; message?: string } }; message?: string }).response?.data?.error
          || (err as { message?: string }).message
        : 'Erro ao fazer login com Google';
      setGoogleError(String(message));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (isMaintenanceMode) {
      setLoginError(maintenanceMessage);
      return;
    }
    setLoginLoading(true);

    try {
      const { user } = await login(loginEmail, loginPassword);
      setUser(user);
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; message?: string } }; message?: string }).response?.data?.message
          || (err as { response?: { data?: { error?: string; message?: string } }; message?: string }).response?.data?.error
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
    if (isMaintenanceMode) {
      setSignupError(maintenanceMessage);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('As senhas não coincidem.');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSignupLoading(true);

    try {
      const { user } = await signup(signupName, signupEmail, signupPassword);
      setUser(user);
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; message?: string } }; message?: string }).response?.data?.message
          || (err as { response?: { data?: { error?: string; message?: string } }; message?: string }).response?.data?.error
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
          className="relative bg-white rounded-card-lg shadow-card-hover w-full border border-border"
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
            <div className="sticky top-0 bg-primary px-4 md:px-6 py-3 rounded-t-card-lg flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-card flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Iniciar sessão</h2>
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
              {isMaintenanceMode && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                  <span className="text-sm">{maintenanceMessage}</span>
                </div>
              )}
              {(loginError || googleError) && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{loginError ?? googleError}</span>
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
                      disabled={isMaintenanceMode}
                      required
                      className="w-full px-3 py-2 border border-border rounded-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                      disabled={isMaintenanceMode}
                      required
                      className="w-full px-3 py-2 border border-border rounded-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading || isMaintenanceMode}
                  className="w-full bg-primary text-white py-2.5 rounded-card font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>A iniciar sessão...</span>
                    </>
                  ) : (
                    <span>Iniciar sessão</span>
                  )}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-sm text-muted">ou</span>
                </div>
              </div>

              <div className="flex justify-center">
                {isMaintenanceMode ? (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-card border border-border text-sm text-muted bg-gray-50 cursor-not-allowed"
                  >
                    Login com Google indisponível
                  </button>
                ) : (
                  <GoogleLogin
                    onSuccess={(res) => {
                      if (res.credential) {
                        handleGoogleSuccess(res.credential);
                      }
                    }}
                    onError={() => setGoogleError('Não foi possível iniciar sessão com Google.')}
                    useOneTap={false}
                  />
                )}
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted">
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={handleSwitch}
                    className="text-primary hover:underline font-medium"
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
            <div className="sticky top-0 bg-primary px-4 md:px-6 py-3 rounded-t-card-lg flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-card flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Criar conta</h2>
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
              {isMaintenanceMode && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                  <span className="text-sm">{maintenanceMessage}</span>
                </div>
              )}
              {(signupError || googleError) && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{signupError ?? googleError}</span>
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
                      disabled={isMaintenanceMode}
                      required
                      className="w-full px-3 py-2 border border-border rounded-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="O seu nome"
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
                      disabled={isMaintenanceMode}
                      required
                      className="w-full px-3 py-2 border border-border rounded-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                      disabled={isMaintenanceMode}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-border rounded-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-muted mt-1">Mínimo 6 caracteres</p>
                  </div>

                  <div>
                    <label htmlFor="signup-confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar senha
                    </label>
                    <input
                      id="signup-confirmPassword"
                      type="password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={isMaintenanceMode}
                      required
                      className="w-full px-3 py-2 border border-border rounded-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading || isMaintenanceMode}
                  className="w-full bg-primary text-white py-2.5 rounded-card font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {signupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>A criar conta...</span>
                    </>
                  ) : (
                    <span>Criar conta</span>
                  )}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-sm text-muted">ou</span>
                </div>
              </div>

              <div className="flex justify-center">
                {isMaintenanceMode ? (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-card border border-border text-sm text-muted bg-gray-50 cursor-not-allowed"
                  >
                    Login com Google indisponível
                  </button>
                ) : (
                  <GoogleLogin
                    onSuccess={(res) => {
                      if (res.credential) {
                        handleGoogleSuccess(res.credential);
                      }
                    }}
                    onError={() => setGoogleError('Não foi possível iniciar sessão com Google.')}
                    useOneTap={false}
                  />
                )}
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted">
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={handleSwitch}
                    className="text-primary hover:underline font-medium"
                  >
                    Iniciar sessão
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
