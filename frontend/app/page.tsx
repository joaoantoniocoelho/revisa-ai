"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  FileText,
  Upload,
  Target,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  Search,
  Bot,
  Trash2,
  AlertCircle,
  Loader2,
  Download,
  Info,
} from "lucide-react";
import Header from "@/components/Header";
import { useUser } from "@/contexts/UserContext";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import { useCreditsModal } from "@/hooks/useCreditsModal";
import CreditsModal from "@/components/CreditsModal";
import { useAuthModal } from "@/contexts/AuthModalContext";
import FlashcardViewer from "@/components/FlashcardViewer";
import { fetchCreditsConfig } from "@/lib/credits";

interface Flashcard {
  front: string;
  back: string;
  tags?: string[];
}

type Density = "low" | "medium" | "high";

interface GenerateResponse {
  cards: Flashcard[];
  meta: {
    chunks: number;
    model: string;
    language: string;
    totalGenerated: number;
    afterDeduplication: number;
    finalCount?: number;
    densityTarget?: number;
  };
}

const loadingSteps = [
  { icon: FileText, text: "Extraindo texto do PDF..." },
  { icon: Search, text: "Analisando conteúdo..." },
  { icon: Bot, text: "Gerando flashcards com IA..." },
  { icon: Sparkles, text: "Criando perguntas e respostas..." },
  { icon: Target, text: "Otimizando cartões..." },
  { icon: Trash2, text: "Removendo duplicatas..." },
  { icon: CheckCircle2, text: "Finalizando..." },
];

const DENSITY_OPTIONS: {
  value: Density;
  label: string;
  cards: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Baixa",
    cards: "~20",
    description: "Resumos e conceitos principais. Ideal para visão geral.",
  },
  {
    value: "medium",
    label: "Média",
    cards: "~35",
    description: "Equilíbrio entre quantidade e foco. Estudo regular.",
  },
  {
    value: "high",
    label: "Alta",
    cards: "~60",
    description: "Maior cobertura. Recomendado para provas e conteúdo denso.",
  },
];

export default function Home() {
  const isMaintenanceMode =
    process.env.NEXT_PUBLIC_APP_MAINTENANCE_MODE === "true";
  const { user, loading: authLoading, isAuthenticated, getCredits, refreshUser } =
    useUser();
  const { openLoginModal } = useAuthModal();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [density, setDensity] = useState<Density>("low");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [meta, setMeta] = useState<GenerateResponse["meta"] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deckId, setDeckId] = useState<string | null>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [creditsConfig, setCreditsConfig] = useState<{
    creditsPerPage: number;
  } | null>(null);

  const { toasts, showToast, removeToast } = useToast();
  const {
    isOpen: isCreditsModalOpen,
    title: modalTitle,
    message: modalMessage,
    showCreditsModal,
    closeModal,
  } = useCreditsModal();

  useEffect(() => {
    fetchCreditsConfig().then((cfg) => setCreditsConfig(cfg)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setStepIndex(0);
      return;
    }
    const stepInterval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, loadingSteps.length - 1));
    }, 3000);
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 90));
    }, 500);
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  useEffect(() => {
    document.body.style.overflow = loading ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      showToast("Selecione um arquivo PDF válido.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("O PDF deve ter menos de 10 MB.", "error");
      return;
    }
    setPdfFile(file);
  };

  const handleGenerate = async () => {
    if (isMaintenanceMode) {
      showToast(
        "Estamos em construção. Geração, login e cadastro estão temporariamente desativados.",
        "error"
      );
      return;
    }
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (!pdfFile) {
      showToast("Selecione um PDF para continuar.", "error");
      return;
    }

    setLoading(true);
    setCards([]);
    setMeta(null);
    setProgress(0);
    setDeckId(null);

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("density", density);

      const response = await api.post(
        `/decks/generate?density=${encodeURIComponent(density)}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 300_000,
        }
      );

      setProgress(100);
      setStepIndex(loadingSteps.length - 1);

      const cardsData = response.data.cards;
      const metaData = response.data.meta;

      if (!cardsData || !Array.isArray(cardsData)) {
        throw new Error("Resposta inválida do servidor");
      }

      setCards(cardsData);
      setMeta(metaData ?? null);
      setDeckId(response.data.deckId ?? null);
      setLoading(false);

      const count =
        metaData?.finalCount ?? metaData?.afterDeduplication ?? cardsData.length;
      showToast(`${count} flashcards gerados. Pode exportar para Anki.`, "success");

      requestAnimationFrame(() => {
        cardsContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

      refreshUser();
    } catch (err: unknown) {
      setLoading(false);

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const errorData = err.response?.data as
          | { error?: string; message?: string }
          | undefined;
        const message =
          errorData?.error ?? errorData?.message ?? "Erro ao gerar flashcards.";

        if (status === 400) {
          showToast(message, "error");
          return;
        }
        if (status === 402) {
          const data = err.response?.data as
            | { creditsRequired?: number; creditsAvailable?: number }
            | undefined;
          const req = data?.creditsRequired ?? 0;
          const avail = data?.creditsAvailable ?? 0;
          const msg =
            req && avail
              ? `Esta geração requer ${req} crédito${req !== 1 ? "s" : ""}. Tem ${avail} disponíveis.`
              : "Créditos insuficientes para esta geração.";
          showCreditsModal("Créditos insuficientes", msg);
          return;
        }
        if (status === 403) {
          const code = (err.response?.data as { code?: string })?.code;
          if (code === "EMAIL_NOT_VERIFIED") {
            showToast("Confirme seu email para gerar decks. Use o banner acima para reenviar o email.", "error");
            return;
          }
          showToast(message, "error");
          return;
        }
        if (status === 409) {
          showToast(
            errorData?.message ??
              "Já tem uma geração em curso. Aguarde a conclusão.",
            "error"
          );
          return;
        }
        if (status === 500) {
          showToast(
            message ||
              "Erro no servidor. Tente novamente dentro de alguns minutos.",
            "error"
          );
          return;
        }
        if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
          showToast(
            "A operação demorou muito. Verifique sua conexão e tente novamente.",
            "error"
          );
          return;
        }
        if (err.code === "ERR_NETWORK" || !err.response) {
          showToast(
            "Sem conexão. Verifique sua internet e tente novamente.",
            "error"
          );
          return;
        }
        showToast(message, "error");
      } else {
        showToast(
          err instanceof Error ? err.message : "Erro ao gerar flashcards.",
          "error"
        );
      }
    }
  };

  const handleExport = async () => {
    if (!deckId) return;
    setExporting(true);
    try {
      const response = await api.get(`/export/deck/${deckId}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/apkg" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfFile?.name.replace(".pdf", "") || "flashcards"}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("Arquivo .apkg baixado. Importe no Anki.", "success");
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response
          ? err.response.data?.error || "Erro ao exportar"
          : err instanceof Error ? err.message : "Erro ao exportar";
      showToast(String(msg), "error");
    } finally {
      setExporting(false);
    }
  };

  const CurrentStepIcon = loadingSteps[stepIndex]?.icon ?? Loader2;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const credits = isAuthenticated ? getCredits() : 0;

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <CreditsModal
        isOpen={isCreditsModalOpen}
        onClose={closeModal}
        title={modalTitle}
        message={modalMessage}
      />
      <Header />
      <main className="min-h-screen bg-surface py-8 md:py-12 px-4 pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Headline */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              PDF para flashcards em segundos
            </h1>
            <p className="text-muted text-sm sm:text-base max-w-md mx-auto">
              Envie um PDF e receba um deck compatível com Anki. A IA extrai o
              conteúdo e gera os cartões automaticamente para você.
            </p>
          </div>

          {/* Credits */}
          {isAuthenticated && (
            <div className="bg-white rounded-card-lg border border-border shadow-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Créditos disponíveis
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {credits} crédito{credits !== 1 ? "s" : ""}. Cada página do
                    PDF consome{" "}
                    {creditsConfig?.creditsPerPage ?? 1} crédito
                    {(creditsConfig?.creditsPerPage ?? 1) !== 1 ? "s" : ""}.
                  </p>
                </div>
                <div className="text-2xl font-semibold text-gray-900 flex items-center gap-1">
                  <span>{credits}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-start gap-2 text-xs text-muted">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Em caso de falha na geração, os créditos são devolvidos
                  automaticamente.
                </span>
              </div>
            </div>
          )}

          {/* Upload */}
          <div className="bg-white rounded-card-lg border border-border shadow-card p-5 sm:p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Arquivo PDF
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-6 py-8 bg-surface border-2 border-dashed border-border-strong rounded-card cursor-pointer hover:border-primary hover:bg-primary-muted/30 transition-colors"
              >
                <Upload className="w-8 h-8 text-muted" />
                <span className="text-sm font-medium text-gray-700 text-center">
                  {pdfFile
                    ? pdfFile.name
                    : "Clique para escolher ou arraste o PDF aqui"}
                </span>
              </label>
              <p className="text-xs text-muted mt-2">
                Máximo 10 MB. O arquivo é processado de forma segura e não é
                compartilhado.
              </p>
            </div>

            {/* Density */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Quantidade de cartões
              </label>
              <div className="space-y-3">
                {DENSITY_OPTIONS.map((opt) => {
                  const isSelected = density === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDensity(opt.value)}
                      className={`w-full text-left px-4 py-3 rounded-card border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary-muted"
                          : "border-border bg-white hover:border-border-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900">
                          {opt.label}
                        </span>
                        <span className="text-sm text-muted">{opt.cards} cartões</span>
                      </div>
                      <p className="text-xs text-muted mt-1">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
              {creditsConfig && (
                <p className="text-xs text-muted mt-2">
                  Custo: {creditsConfig.creditsPerPage} crédito
                  {creditsConfig.creditsPerPage !== 1 ? "s" : ""} por página.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!pdfFile || loading || (!!user && user.emailVerified === false)}
              className="w-full py-3 bg-primary text-white text-sm font-medium rounded-card hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "A gerar..." : user?.emailVerified === false ? "Confirme seu email para gerar" : "Gerar flashcards"}
            </button>
            {user?.emailVerified === false && (
              <p className="text-xs text-amber-600 text-center -mt-2">
                Verifique sua caixa de entrada e clique no link enviado, ou use &quot;Reenviar email&quot; no banner acima.
              </p>
            )}

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-card">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-medium">Conteúdo gerado por IA.</span>{" "}
                Revise os cartões antes de usar em estudo. Podem existir
                imprecisões.
              </div>
            </div>
          </div>

          {/* Result */}
          {cards.length > 0 && !loading && (
            <div
              ref={cardsContainerRef}
              className="bg-white rounded-card-lg border border-border shadow-card p-5 sm:p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Deck gerado
                </h2>
              </div>
              <FlashcardViewer
                cards={cards}
                onExport={handleExport}
                exporting={exporting}
                exportDisabled={!deckId}
              />
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted">
Para usar no Anki: baixe o arquivo .apkg acima e importe em
                Arquivo → Importar no Anki.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-card-lg shadow-card-hover p-6 sm:p-8 mx-4 max-w-sm w-full border border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 text-primary text-sm font-medium">
                <CurrentStepIcon className="w-5 h-5 animate-pulse flex-shrink-0" />
                <span>{loadingSteps[stepIndex]?.text}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted">
                Pode levar alguns minutos. Não feche esta janela.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
