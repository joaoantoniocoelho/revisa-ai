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

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

const loadingMessages = [
  { icon: FileText, text: "Extraindo texto do PDF..." },
  { icon: Search, text: "Analisando conteúdo..." },
  { icon: Bot, text: "Gerando flashcards com IA..." },
  { icon: Sparkles, text: "Criando perguntas inteligentes..." },
  { icon: Target, text: "Otimizando respostas..." },
  { icon: Trash2, text: "Removendo duplicatas..." },
  { icon: CheckCircle2, text: "Finalizando..." },
];

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, getCredits, refreshUser } = useUser();
  const { openLoginModal } = useAuthModal();
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [density, setDensity] = useState<Density>("low");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [meta, setMeta] = useState<GenerateResponse["meta"] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deckId, setDeckId] = useState<string | null>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [creditsConfig, setCreditsConfig] = useState<{ creditsPerPage: number } | null>(null);

  const { toasts, showToast, removeToast } = useToast();
  const { isOpen: isCreditsModalOpen, title: modalTitle, message: modalMessage, showCreditsModal, closeModal } = useCreditsModal();

  useEffect(() => {
    fetchCreditsConfig().then((cfg) => setCreditsConfig(cfg)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setLoadingMessageIndex(0);
      return;
    }

    let currentProgress = 0;
    let messageIndex = 0;

    const messageInterval = setInterval(() => {
      if (messageIndex < loadingMessages.length) {
        setLoadingMessageIndex(messageIndex);
        messageIndex++;
      }
    }, 3000);

    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 90) currentProgress = 90;
      setProgress(Math.min(currentProgress, 90));
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  // Bloquear scroll do fundo quando o overlay de loading está visível
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [loading]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        showToast("Por favor, selecione um arquivo PDF válido", "error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast("PDF deve ter menos de 10MB", "error");
        return;
      }
      setPdfFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    if (!pdfFile) {
      showToast("Selecione um arquivo PDF", "error");
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
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 300_000,
        }
      );

      setProgress(100);
      setLoadingMessageIndex(loadingMessages.length - 1);

      const cardsData = response.data.cards;
      const metaData = response.data.meta;

      if (!cardsData || !Array.isArray(cardsData)) {
        throw new Error("Resposta inválida do servidor");
      }

      setCards(cardsData);
      setMeta(metaData ?? null);
      setDeckId(response.data.deckId ?? null);
      setLoading(false);

      const count = metaData?.finalCount ?? metaData?.afterDeduplication ?? cardsData.length;
      showToast(`${count} flashcards gerados com sucesso!`, "success");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardsContainerRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });

      refreshUser();
    } catch (err: unknown) {
      setLoading(false);

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const errorData = err.response?.data as { error?: string; message?: string } | undefined;
        const message = errorData?.error ?? errorData?.message ?? "Erro ao gerar flashcards";

        if (status === 400) {
          showToast(message, "error");
          return;
        }

        if (status === 402) {
          const data = err.response?.data as { creditsRequired?: number; creditsAvailable?: number } | undefined;
          const req = data?.creditsRequired ?? 0;
          const avail = data?.creditsAvailable ?? 0;
          const msg = req && avail
            ? `Esta geração requer ${req} crédito${req !== 1 ? 's' : ''}. Você tem ${avail} disponíveis.`
            : "Você não tem créditos suficientes para esta geração.";
          showCreditsModal("Créditos insuficientes", msg);
          return;
        }

        if (status === 403) {
          showToast(message, "error");
          return;
        }

        if (status === 409) {
          const msg =
            errorData?.message ??
            "Você já tem uma geração em andamento. Aguarde a conclusão antes de iniciar outra.";
          showToast(msg, "error");
          return;
        }

        if (status === 500) {
          const msg =
            message ||
            "Erro interno do servidor. Se o problema persistir, tente novamente em alguns minutos.";
          showToast(msg, "error");
          return;
        }

        if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
          showToast("A requisição demorou muito. Verifique sua conexão e tente novamente.", "error");
          return;
        }

        if (err.code === "ERR_NETWORK" || !err.response) {
          showToast("Erro de conexão. Verifique sua internet e tente novamente.", "error");
          return;
        }

        showToast(message, "error");
      } else {
        const msg = err instanceof Error ? err.message : "Erro desconhecido ao gerar flashcards";
        showToast(msg, "error");
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
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response
        ? err.response.data.error || "Erro ao exportar"
        : err instanceof Error ? err.message : "Erro ao exportar";
      showToast(String(msg), "error");
    } finally {
      setExporting(false);
    }
  };


  const CurrentLoadingIcon = loadingMessages[loadingMessageIndex]?.icon || Loader2;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 py-6 md:py-12 px-4 pb-28 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          
          {/* Title */}
          <div className="text-center space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">
              Gerar Flashcards
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Transforme PDFs em flashcards usando IA
            </p>
          </div>

        {/* Credits Info */}
        {user && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Créditos</p>
                <p className="text-xs text-gray-600 mt-1">
                  Você tem <span className="font-bold text-blue-600">{credits} créditos</span> disponíveis
                </p>
              </div>
              <div className="text-2xl font-bold text-blue-600">{credits}</div>
            </div>
          </div>
        )}

        {/* Upload Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/10 p-4 sm:p-8 border border-blue-100">
          <div className="space-y-4 sm:space-y-6">
            
            {/* File Upload */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <FileText className="w-4 h-4" />
                Selecione seu PDF
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-dashed border-blue-300 rounded-xl sm:rounded-2xl cursor-pointer hover:border-blue-400 hover:from-blue-100 hover:to-cyan-100 transition-all duration-300"
                >
                  <Upload className="w-5 h-5 text-blue-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">
                    {pdfFile ? pdfFile.name : "Clique ou arraste seu PDF aqui"}
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Máximo 10MB</p>
            </div>

            {/* Density Selector */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Target className="w-4 h-4" />
                Densidade de Cards
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "low" as Density, label: "Baixa", desc: "~20" },
                  { value: "medium" as Density, label: "Média", desc: "~35" },
                  { value: "high" as Density, label: "Alta", desc: "~60" },
                ].map((option) => {
                  const isSelected = density === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setDensity(option.value)}
                      className={`relative px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="text-xs sm:text-sm flex items-center gap-1 justify-center">
                        {option.label}
                      </div>
                      <div className="text-[10px] sm:text-xs opacity-75">{option.desc} cards</div>
                    </button>
                  );
                })}
              </div>
              {creditsConfig && (
                <p className="mt-2 text-xs text-gray-500">
                  Custo: {creditsConfig.creditsPerPage} crédito{creditsConfig.creditsPerPage !== 1 ? 's' : ''} por página do PDF
                </p>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!pdfFile || loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Gerando..." : "Gerar Flashcards"}
            </button>

            {/* AI Disclaimer */}
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">Aviso:</span> Os flashcards são gerados por IA e podem conter imprecisões. Revise e valide todo o conteúdo antes de usar para estudos.
              </div>
            </div>
          </div>
        </div>

        {/* Cards Display */}
        {cards.length > 0 && !loading && (
          <div ref={cardsContainerRef} className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/10 p-4 sm:p-8 border border-blue-100">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                Seus Flashcards
              </h2>
            </div>
            
            <FlashcardViewer
              cards={cards}
              onExport={handleExport}
              exporting={exporting}
              exportDisabled={!deckId}
            />
          </div>
        )}
      </div>
    </main>

      {/* Loading overlay - fora do main, z-[100] para ficar acima do header em qualquer scroll */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mx-4 max-w-sm w-full border border-blue-100">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 text-blue-600 text-sm sm:text-base font-medium text-center">
                <CurrentLoadingIcon className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse flex-shrink-0" />
                <span>{loadingMessages[loadingMessageIndex]?.text}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-500 leading-relaxed">
                Pode demorar um pouco. Por favor, não feche esta aba.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
