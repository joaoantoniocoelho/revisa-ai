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
  Info,
  ArrowRight,
  ShieldCheck,
  Lock,
  BrainCircuit,
  Zap,
  BookOpenCheck,
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
import {
  fetchCreditsConfig,
  fetchCreditsEstimate,
  type CreditsConfig,
  type CreditsEstimate,
} from "@/lib/credits";

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
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}[] = [
  {
    value: "low",
    label: "Baixa",
    cards: "~20",
    description: "Resumos e conceitos principais. Ideal para visão geral.",
    icon: Zap,
  },
  {
    value: "medium",
    label: "Média",
    cards: "~35",
    description: "Equilíbrio entre quantidade e foco. Estudo regular.",
    icon: Target,
    recommended: true,
  },
  {
    value: "high",
    label: "Alta",
    cards: "~60",
    description: "Maior cobertura. Recomendado para provas e conteúdo denso.",
    icon: BookOpenCheck,
  },
];

export default function Home() {
  const isMaintenanceMode =
    process.env.NEXT_PUBLIC_APP_MAINTENANCE_MODE === "true";
  const { user, loading: authLoading, isAuthenticated, getCredits, refreshUser } =
    useUser();
  const { openLoginModal } = useAuthModal();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [density, setDensity] = useState<Density>("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [meta, setMeta] = useState<GenerateResponse["meta"] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deckId, setDeckId] = useState<string | null>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [creditsConfig, setCreditsConfig] = useState<CreditsConfig | null>(null);
  const [creditsEstimate, setCreditsEstimate] = useState<CreditsEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

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
    let cancelled = false;
    if (!pdfFile) {
      setCreditsEstimate(null);
      setEstimateLoading(false);
      return;
    }

    setEstimateLoading(true);
    fetchCreditsEstimate(pdfFile, density)
      .then((estimate) => {
        if (!cancelled) setCreditsEstimate(estimate);
      })
      .catch(() => {
        if (!cancelled) setCreditsEstimate(null);
      })
      .finally(() => {
        if (!cancelled) setEstimateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdfFile, density]);

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
    if (!pdfFile) {
      showToast("Faça upload de um PDF para continuar.", "error");
      return;
    }
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (user?.emailVerified === false) {
      showToast(
        "Confirme seu email para gerar decks. Use o banner acima para reenviar o email.",
        "error"
      );
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
        if (status === 429) {
          showToast(
            errorData?.message ??
              "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
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
  const selectedMultiplier = creditsConfig?.densityMultipliers?.[density] ?? 1;
  const estimatedPerPage = Math.ceil(
    (creditsConfig?.creditsPerPageBase ?? 1) * selectedMultiplier
  );

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
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-surface to-slate-100/50 py-8 md:py-12 px-4 pb-28 md:pb-12">
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
          {/* Headline */}
          <section className="text-center space-y-5">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              PDF para flashcards em segundos
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
                Envie um PDF e receba um deck compatível com Anki. A IA extrai o
                conteúdo e gera os cartões automaticamente para você.
              </p>
            </div>

            <div className="mx-auto max-w-2xl rounded-card-lg border border-primary/15 bg-gradient-to-r from-primary-muted/50 via-white to-primary-muted/30 p-4 sm:p-5 shadow-card">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                <div className="rounded-card border border-border bg-white p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Seu PDF</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100" />
                  <div className="mt-2 h-1.5 w-4/5 rounded-full bg-slate-100" />
                  <div className="mt-2 h-1.5 w-3/5 rounded-full bg-slate-100" />
                </div>
                <ArrowRight className="w-5 h-5 text-primary/70" />
                <div className="rounded-card border border-primary/20 bg-white p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Flashcards prontos</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                      O que é fotossíntese?
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                      Função da mitocôndria
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
                    PDF consome a partir de{" "}
                    {creditsConfig?.creditsPerPageBase ?? 1} crédito
                    {(creditsConfig?.creditsPerPageBase ?? 1) !== 1 ? "s" : ""}{" "}
                    (varia por densidade).
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
          <div className="bg-white/95 backdrop-blur rounded-card-lg border border-border shadow-card p-5 sm:p-6 space-y-6">
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
                className="group flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-6 py-9 bg-primary-muted/25 border-2 border-dashed border-primary/40 rounded-card cursor-pointer hover:border-primary hover:bg-primary-muted/45 active:scale-[0.995] transition-all duration-200"
              >
                <Upload className="w-8 h-8 text-primary/80 group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium text-slate-800 text-center">
                  {pdfFile
                    ? pdfFile.name
                    : "Arraste seu PDF aqui ou clique para gerar seus flashcards"}
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-2">
                Processamento rápido e seguro.
              </p>
              <p className="text-xs text-muted mt-1">
                Máximo 10 MB e {creditsConfig?.maxPdfPages ?? 50} páginas. O arquivo não é compartilhado.
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
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDensity(opt.value)}
                      className={`w-full text-left px-4 py-3 rounded-card border-2 transition-all duration-200 hover:shadow-sm ${
                        isSelected
                          ? "border-primary bg-primary-muted/60 shadow-md scale-[1.02]"
                          : "border-border bg-white hover:border-primary/40 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-slate-500"}`} />
                          <span className="font-medium text-gray-900">
                            {opt.label}
                          </span>
                          {opt.recommended && (
                            <span className="text-[11px] font-medium text-primary bg-primary-muted px-2 py-0.5 rounded-full border border-primary/20">
                              Mais escolhida
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted">{opt.cards} cartões</span>
                      </div>
                      <p className="text-xs text-muted mt-1">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
              {creditsConfig && (
                <p className="text-xs text-muted mt-2">
                  Custo estimado ({DENSITY_OPTIONS.find((d) => d.value === density)?.label}):{" "}
                  {estimatedPerPage} crédito
                  {estimatedPerPage !== 1 ? "s" : ""} por página.
                </p>
              )}
            </div>

            <div className="rounded-card border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      pdfFile ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  PDF selecionado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Quantidade definida
                </span>
              </div>
              {pdfFile && (
                <p className="mt-2 text-xs text-slate-600">
                  {estimateLoading
                    ? "Calculando custo..."
                    : creditsEstimate
                    ? `Esta geração vai custar ${creditsEstimate.creditsRequired} crédito${
                        creditsEstimate.creditsRequired !== 1 ? "s" : ""
                      } (${creditsEstimate.numPages} página${
                        creditsEstimate.numPages !== 1 ? "s" : ""
                      }).`
                    : "Não foi possível calcular o custo deste PDF agora."}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-card hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "A gerar..." : "Gerar flashcards"}
            </button>
            <p className="text-xs text-slate-500/90 text-center -mt-1">
              Leva menos de 30 segundos
            </p>
            {user?.emailVerified === false && (
              <p className="text-xs text-amber-600 text-center -mt-2">
                Verifique sua caixa de entrada e clique no link enviado, ou use &quot;Reenviar email&quot; no banner acima.
              </p>
            )}

            <div className="flex items-start gap-2.5 p-3 bg-amber-50/45 border border-amber-100 rounded-card">
              <AlertCircle className="w-4 h-4 text-amber-700/80 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900/80 leading-relaxed">
                <span className="font-medium">Conteúdo gerado por IA.</span>{" "}
                Revise os cartões antes de usar em estudo. Podem existir
                imprecisões.
              </div>
            </div>
          </div>

          <section className="rounded-card-lg border border-border bg-white/90 backdrop-blur px-4 py-3 shadow-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                <span>Compatível com Anki</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Arquivos não são armazenados</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Processamento seguro</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <BrainCircuit className="w-4 h-4 text-slate-500" />
                <span>Geração automática com IA</span>
              </div>
            </div>
          </section>

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

          <footer className="pt-2 pb-1 text-center">
            <p className="text-xs text-slate-500">
              Suporte:{" "}
              <a
                href="mailto:revisaai.app@gmail.com"
                className="text-primary hover:underline"
              >
                revisaai.app@gmail.com
              </a>
            </p>
          </footer>
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
