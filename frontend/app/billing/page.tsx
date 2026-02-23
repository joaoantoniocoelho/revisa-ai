"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Check, Loader2, Copy, ExternalLink, ChevronLeft } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import {
  fetchPackages,
  checkout,
  formatPrice,
  type Package,
  type CheckoutResult,
} from "@/lib/billing";

type Step = "packages" | "pix";

export default function BillingPage() {
  const { isAuthenticated, loading: userLoading } = useUser();
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();

  const [step, setStep] = useState<Step>("packages");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [pendingPackage, setPendingPackage] = useState<Package | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pixData, setPixData] = useState<CheckoutResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, userLoading, router]);

  useEffect(() => {
    fetchPackages()
      .then(setPackages)
      .catch(() => showToast("Erro ao carregar pacotes.", "error"))
      .finally(() => setLoadingPackages(false));
  }, []);

  const handleSelectPackage = (pkg: Package) => {
    setPendingPackage(pkg);
  };

  const handleConfirmCheckout = async () => {
    if (!pendingPackage) return;
    const pkg = pendingPackage;
    setPendingPackage(null);
    setSelectedPackage(pkg);
    setCheckoutLoading(true);
    try {
      const result = await checkout(pkg.code);
      setPixData(result);
      setStep("pix");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 502) {
        showToast("Erro no gateway de pagamento. Tente novamente.", "error");
      } else if (status === 404) {
        showToast("Pacote não encontrado.", "error");
      } else {
        showToast("Erro ao iniciar pagamento. Tente novamente.", "error");
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!selectedPackage || !pixData) return;
    setCheckoutLoading(true);
    try {
      const result = await checkout(selectedPackage.code, pixData.checkoutId);
      setPixData(result);
    } catch {
      showToast("Erro ao tentar novamente. Aguarde e tente de novo.", "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    showToast("Código Pix copiado!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    setStep("packages");
    setPixData(null);
    setSelectedPackage(null);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirmation modal */}
      {pendingPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPendingPackage(null)}
            aria-hidden
          />
          <div
            className="relative bg-white rounded-card-lg border border-border shadow-card-hover max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-card flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Confirmar compra</p>
                  <p className="text-sm text-muted">{pendingPackage.name}</p>
                </div>
              </div>
              <div className="bg-surface rounded-card border border-border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Créditos</span>
                  <span className="font-medium text-primary">
                    {pendingPackage.credits} créditos
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Valor</span>
                  <span className="font-bold text-gray-900">
                    {formatPrice(pendingPackage.priceCents)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Você será redirecionado para o pagamento via Pix. O QR Code será gerado após a confirmação.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingPackage(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-muted border border-border rounded-card hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  className="flex-1 py-2.5 text-sm font-medium bg-primary text-white rounded-card hover:bg-primary-hover transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {step === "pix" && (
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 text-muted hover:text-gray-900 rounded transition-colors"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 bg-amber-100 rounded-card flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Comprar créditos</h1>
            <p className="text-sm text-muted">
              {step === "packages"
                ? "Escolha um pacote para continuar"
                : "Escaneie o QR Code ou copie o código Pix"}
            </p>
          </div>
        </div>

        {/* Step: packages */}
        {step === "packages" && (
          <div className="space-y-3">
            {loadingPackages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              packages.map((pkg) => (
                <button
                  key={pkg.code}
                  type="button"
                  onClick={() => handleSelectPackage(pkg)}
                  disabled={checkoutLoading}
                  className="w-full text-left bg-white rounded-card-lg border border-border shadow-card hover:shadow-card-hover hover:border-primary transition-all p-5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {checkoutLoading && selectedPackage?.code === pkg.code ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <div className="w-9 h-9 bg-primary-muted rounded-card flex items-center justify-center">
                          <Coins className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{pkg.name}</p>
                        <p className="text-sm text-muted">{pkg.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold text-gray-900">{formatPrice(pkg.priceCents)}</p>
                      <p className="text-sm text-primary font-medium">
                        {pkg.credits} {pkg.credits === 1 ? "crédito" : "créditos"}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: pix */}
        {step === "pix" && pixData && selectedPackage && (
          <div className="bg-white rounded-card-lg border border-border shadow-card p-6 space-y-6">
            {/* Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Pacote</span>
              <span className="font-medium text-gray-900">{selectedPackage.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Créditos</span>
              <span className="font-medium text-primary">
                {selectedPackage.credits} créditos
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Total</span>
              <span className="font-bold text-gray-900">
                {formatPrice(selectedPackage.priceCents)}
              </span>
            </div>

            <hr className="border-border" />

            {/* QR Code */}
            {pixData.qrCodeBase64 ? (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-48 h-48 rounded-card border border-border"
                />
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <p className="text-sm text-muted">QR Code indisponível. Use o código abaixo.</p>
              </div>
            )}

            {/* Copy code */}
            <div>
              <p className="text-xs text-muted mb-2">Pix copia e cola</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-surface border border-border rounded-card px-3 py-2 truncate text-gray-700">
                  {pixData.qrCode}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-white rounded-card hover:bg-primary-hover transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            {/* Ticket URL */}
            {pixData.ticketUrl && (
              <a
                href={pixData.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-primary border border-primary rounded-card hover:bg-primary-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no Mercado Pago
              </a>
            )}

            {/* Info */}
            <p className="text-xs text-muted text-center leading-relaxed">
              Após o pagamento, seus créditos serao adicionados automaticamente.
              Esta janela pode ser fechada com segurança.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2.5 text-sm font-medium text-muted border border-border rounded-card hover:bg-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRetry}
                disabled={checkoutLoading}
                className="flex-1 py-2.5 text-sm font-medium bg-primary text-white rounded-card hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Gerar novo QR Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
