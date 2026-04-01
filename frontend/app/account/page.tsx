"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { useUser } from "@/contexts/UserContext";
import { logout } from "@/lib/auth";
import BuyCreditsModal from "@/components/BuyCreditsModal";
import { pollPaymentStatus } from "@/lib/payments";
import {
  Loader2,
  User as UserIcon,
  Coins,
  LogOut,
  LayoutDashboard,
  Sparkles,
  ShoppingCart,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const { user, loading: authLoading, isAuthenticated, getCredits, refreshUser } = useUser();
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    // Clean URL immediately
    window.history.replaceState({}, "", "/account");

    // Poll until webhook confirms credits
    pollingRef.current = setInterval(async () => {
      try {
        const { status } = await pollPaymentStatus(sessionId);
        if (status === "credited") {
          clearInterval(pollingRef.current!);
          await refreshUser();
          setPaymentSuccess(true);
        } else if (status === "failed") {
          clearInterval(pollingRef.current!);
          setPaymentFailed(true);
        }
      } catch {
        // silent — keeps polling
      }
    }, 2000);

    // Stop after 60s — if still unresolved, show neutral failure message
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        setPaymentFailed(true);
      }
    }, 60_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-surface py-6 md:py-12 px-4 pb-28 md:pb-6">
          <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <UserIcon className="w-16 h-16 text-gray-300 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-800">Acesso à conta</h2>
              <p className="text-muted text-sm">
                Faça login para ver seus dados e créditos.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const credits = getCredits();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface py-6 md:py-12 px-4 pb-28 md:pb-6">
        <div className="max-w-lg mx-auto space-y-6">
          <h1 className="text-2xl font-semibold text-gray-900">Conta</h1>

          {paymentSuccess && (
            <div className="flex items-center gap-3 p-4 rounded-card bg-green-50 border border-green-200 text-green-800">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">
                Pagamento confirmado! Seus créditos foram adicionados.
              </p>
            </div>
          )}

          {paymentFailed && (
            <div className="flex items-center gap-3 p-4 rounded-card bg-red-50 border border-red-200 text-red-800">
              <XCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">
                Não foi possível confirmar o pagamento. Se o valor foi cobrado, entre em contato com o suporte.
              </p>
            </div>
          )}

          <div className="bg-white rounded-card-lg border border-border shadow-card p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-muted flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-muted">{user?.email}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted mb-1">Créditos disponíveis</p>
              <p className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Coins className="w-6 h-6 text-amber-500" />
                {credits}
              </p>
              <p className="text-xs text-muted mt-1">
                Usados para gerar decks a partir de PDFs. 1 crédito por página.
              </p>
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(true)}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-card border border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Comprar créditos
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-card bg-white border border-border shadow-card hover:shadow-card-hover transition-shadow text-gray-700"
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-medium">Gerar flashcards</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-card bg-white border border-border shadow-card hover:shadow-card-hover transition-shadow text-gray-700"
            >
              <LayoutDashboard className="w-5 h-5 text-primary" />
              <span className="font-medium">Meus decks</span>
            </Link>
          </div>

          <div className="pt-4">
            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-card border border-red-200 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>
        </div>
      </main>
      <BuyCreditsModal isOpen={isBuyModalOpen} onClose={() => setIsBuyModalOpen(false)} />
    </>
  );
}
