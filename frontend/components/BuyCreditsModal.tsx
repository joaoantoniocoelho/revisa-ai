"use client";

import { useEffect, useState } from "react";
import { X, Coins, Loader2, ExternalLink } from "lucide-react";
import {
  fetchCreditPackages,
  createCheckoutSession,
  type CreditPackage,
} from "@/lib/payments";

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatBrl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");

    setLoadingPackages(true);
    fetchCreditPackages()
      .then(setPackages)
      .catch(() => setErrorMessage("Não foi possível carregar os pacotes."))
      .finally(() => setLoadingPackages(false));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSelectPackage(pkg: CreditPackage) {
    setLoadingId(pkg.id);
    setErrorMessage("");
    try {
      const { checkoutUrl } = await createCheckoutSession(pkg.id);
      window.location.href = checkoutUrl;
    } catch {
      setErrorMessage("Falha ao iniciar o pagamento. Tente novamente.");
      setLoadingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white rounded-card-lg border border-border shadow-card-hover max-w-md w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-card flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Comprar créditos</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-gray-900 rounded transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loadingPackages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            packages.map((pkg, i) => {
              const isLoading = loadingId === pkg.id;
              const isDisabled = loadingId !== null;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  disabled={isDisabled}
                  className="w-full flex items-center justify-between p-4 rounded-card border border-border hover:border-primary hover:shadow-card-hover transition-all text-left disabled:opacity-60"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{pkg.label}</span>
                      {i === packages.length - 1 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Melhor valor
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-0.5">
                      {pkg.credits} créditos · ~{pkg.credits} páginas de PDF
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-lg font-bold text-gray-900">
                      {formatBrl(pkg.amountBrl)}
                    </span>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-muted" />
                    )}
                  </div>
                </button>
              );
            })
          )}

          {errorMessage && (
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          )}

          <p className="text-xs text-muted text-center pt-1">
            Você será redirecionado para o Stripe para concluir o pagamento.
          </p>
        </div>
      </div>
    </div>
  );
}
