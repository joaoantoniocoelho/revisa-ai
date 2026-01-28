"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, 
  LogOut, 
  LayoutDashboard, 
  Sparkles, 
  User as UserIcon,
  Crown,
  Home,
  LogIn
} from 'lucide-react';
import { logout } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, getPdfLimit, getPdfUsed } = useUser();

  const handleLogout = () => {
    logout();
  };

  const pdfUsed = getPdfUsed();
  const pdfLimit = getPdfLimit();

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block bg-white/70 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                pdf2anki
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar</span>
                </div>
              </Link>
              
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    pathname === '/dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Decks</span>
                  </div>
                </Link>
              )}
            </nav>

            {/* User Info - Compact */}
            <div className="flex items-center gap-2 flex-shrink-0 relative">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                      {pdfUsed}/{pdfLimit}
                    </span>
                  </div>

                  {user?.planType === 'free' && (
                    <button
                      onClick={() => window.location.href = '/upgrade'}
                      className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1"
                    >
                      <Crown className="w-3 h-3" />
                      Upgrade
                    </button>
                  )}

                  {user?.planType === 'paid' && (
                    <span className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1 rounded-lg font-medium flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Pro
                    </span>
                  )}

                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white/70 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                pdf2anki
              </span>
            </div>

            {/* User Info Compact */}
            <div className="flex items-center gap-2 relative">
              {isAuthenticated ? (
                <>
                  <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-blue-200">
                    {pdfUsed}/{pdfLimit}
                  </span>
                  {user?.planType === 'free' ? (
                    <button
                      onClick={() => window.location.href = '/upgrade'}
                      className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded font-semibold flex items-center gap-1 hover:shadow-md transition-all"
                    >
                      <Crown className="w-3 h-3" />
                      Tornar-se Pro
                    </button>
                  ) : (
                    <span className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-1 rounded font-semibold flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Pro
                    </span>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" />
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Fixed */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-blue-100 z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-3">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              pathname === '/'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-medium">Gerar</span>
          </Link>

          {isAuthenticated && (
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                pathname === '/dashboard'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-medium">Decks</span>
            </Link>
          )}

          {isAuthenticated && (
            <>
              {user?.planType === 'free' && (
                <Link
                  href="/upgrade"
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                >
                  <Crown className="w-5 h-5" />
                  <span className="text-xs font-semibold">Upgrade</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all text-gray-600 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-xs font-medium">Sair</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
