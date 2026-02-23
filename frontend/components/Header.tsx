"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Sparkles,
  User as UserIcon,
  Coins,
  LogIn,
  ShoppingCart,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, getCredits } = useUser();
  const { openLoginModal } = useAuthModal();
  const credits = getCredits();

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 group flex-shrink-0"
              aria-label="Revisa Aí – início"
            >
              <div className="w-9 h-9 bg-primary rounded-card flex items-center justify-center group-hover:opacity-90 transition-opacity">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">
                Revisa Aí
              </span>
            </Link>

            <nav className="flex items-center gap-1" aria-label="Navegação principal">
              <Link
                href="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/"
                    ? "bg-primary-muted text-primary"
                    : "text-muted hover:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Gerar
                </span>
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === "/dashboard"
                        ? "bg-primary-muted text-primary"
                        : "text-muted hover:bg-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Decks
                    </span>
                  </Link>
                  <Link
                    href="/account"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === "/account"
                        ? "bg-primary-muted text-primary"
                        : "text-muted hover:bg-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Conta
                    </span>
                  </Link>
                </>
              )}
            </nav>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/billing"
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-card hover:bg-amber-100 hover:border-amber-300 transition-colors"
                    title="Comprar créditos"
                  >
                    <Coins className="w-4 h-4 text-amber-500" />
                    {credits}
                    <span className="text-amber-400">·</span>
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </Link>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-card border border-border">
                    <UserIcon className="w-4 h-4 text-muted" />
                    <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {user?.name?.split(" ")[0]}
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-card hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Entrar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-border sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="Revisa Aí"
          >
            <div className="w-8 h-8 bg-primary rounded-card flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-gray-900">
              Revisa Aí
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                href="/billing"
                className="text-xs text-muted flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded border border-border hover:border-amber-400 hover:text-amber-600 transition-colors"
                title="Comprar créditos"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                {credits} créditos
              </Link>
            ) : (
              <button
                type="button"
                onClick={openLoginModal}
                className="px-3 py-2 bg-primary text-white text-sm font-medium rounded-card flex items-center gap-1"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (when logged in) */}
      {isAuthenticated && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border z-50 safe-area-inset-bottom"
          aria-label="Navegação mobile"
        >
          <div className="flex items-center justify-around px-2 py-2">
            <Link
              href="/"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-card transition-colors ${
                pathname === "/"
                  ? "text-primary bg-primary-muted"
                  : "text-muted"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-medium">Gerar</span>
            </Link>
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-card transition-colors ${
                pathname === "/dashboard"
                  ? "text-primary bg-primary-muted"
                  : "text-muted"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-medium">Decks</span>
            </Link>
            <Link
              href="/billing"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-card transition-colors ${
                pathname === "/billing"
                  ? "text-amber-600 bg-amber-50"
                  : "text-muted"
              }`}
            >
              <Coins className="w-5 h-5" />
              <span className="text-xs font-medium">Créditos</span>
            </Link>
            <Link
              href="/account"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-card transition-colors ${
                pathname === "/account"
                  ? "text-primary bg-primary-muted"
                  : "text-muted"
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Conta</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
