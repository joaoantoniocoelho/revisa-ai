"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FileText,
  Upload,
  Target,
  Sparkles,
  Download,
  GraduationCap,
  CheckCircle2,
  Search,
  Bot,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  Lock,
} from "lucide-react";
import Header from "@/components/Header";
import { useUser } from "@/contexts/UserContext";
import api from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import { useUpgradeModal } from "@/hooks/useUpgradeModal";
import UpgradeModal from "@/components/UpgradeModal";
import FlashcardViewer from "@/components/FlashcardViewer";

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
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, getAllowedDensities, canUploadPdf, getPdfLimit, getPdfUsed, refreshLimits } = useUser();
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [density, setDensity] = useState<Density>("low");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [meta, setMeta] = useState<GenerateResponse["meta"] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deckId, setDeckId] = useState<string | null>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  
  const { toasts, showToast, removeToast } = useToast();
  const { isOpen: isUpgradeModalOpen, title: modalTitle, message: modalMessage, features: modalFeatures, showUpgradeModal, closeModal } = useUpgradeModal();

  // Não redireciona mais - app funciona sem autenticação

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Por favor, selecione um arquivo PDF válido");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("PDF deve ter menos de 10MB");
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!pdfFile) {
      setError("Selecione um arquivo PDF");
      return;
    }

    if (!canUploadPdf()) {
      const limit = getPdfLimit();
      const used = getPdfUsed();
      showUpgradeModal(
        'Limite de PDFs Atingido',
        `Você já utilizou ${used} de ${limit} PDFs disponíveis este mês no plano Free. Faça upgrade para o Plano Pro e envie até 20 PDFs por mês!`,
        [
          '20 PDFs por mês (vs 2 no Free)',
          'Todas as densidades (low, medium, high)',
          'Suporte prioritário',
          'Acesso ilimitado ao histórico de decks',
        ]
      );
      return;
    }

    const allowed = getAllowedDensities();
    if (!allowed.includes(density)) {
      const densityNames = {
        low: 'Baixa (~20 cards)',
        medium: 'Média (~40 cards)',
        high: 'Alta (~60 cards)',
      };
      showUpgradeModal(
        'Densidade Não Disponível',
        `A densidade ${densityNames[density]} está disponível apenas no Plano Pro. No plano Free, você só pode usar a densidade Baixa (~20 cards).`,
        [
          'Densidade Baixa, Média e Alta',
          '20 PDFs por mês',
          'Suporte prioritário',
          'Acesso ilimitado ao histórico de decks',
        ]
      );
      return;
    }

    setLoading(true);
    setError(null);
      setCards([]);
      setMeta(null);
      setProgress(0);
      setDeckId(null);

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("density", density);

      const response = await api.post('/decks/generate', formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setProgress(100);
      setLoadingMessageIndex(loadingMessages.length - 1);

      const cardsData = response.data.cards;
      const metaData = response.data.meta;
      
      setCards(cardsData);
      setMeta(metaData);
      setDeckId(response.data.deckId);
      setLoading(false);
      
      // Mostra toast de sucesso
      const count = metaData.finalCount || metaData.afterDeduplication || cardsData.length;
      showToast(`${count} flashcards gerados com sucesso!`, 'success');
      
      // Scroll para os cards usando requestAnimationFrame para garantir que o DOM foi atualizado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardsContainerRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        });
      });
      
      // Atualiza limites após gerar
      refreshLimits();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const errorData = err.response.data;
        const message = errorData.error || "Erro ao gerar flashcards";
        
        if (status === 403) {
          // Limite atingido ou densidade não permitida
          const isLimitError = message.toLowerCase().includes('limite');
          const isDensityError = message.toLowerCase().includes('densidade');
          
          if (isLimitError || isDensityError) {
            showUpgradeModal(
              isLimitError ? 'Limite de PDFs Atingido' : 'Densidade Não Disponível',
              message + (errorData.message ? `. ${errorData.message}` : ''),
              [
                '20 PDFs por mês',
                'Todas as densidades (low, medium, high)',
                'Suporte prioritário',
                'Acesso ilimitado ao histórico de decks',
              ]
            );
          } else {
            setError(message);
          }
        } else {
          setError(message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      }
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (cards.length === 0) return;

    setExporting(true);
    setError(null);

    try {
      const response = await api.post(
        '/export',
        {
          cards,
          deckName: pdfFile?.name.replace(".pdf", "") || "Meu Deck",
        },
        {
          responseType: "blob",
        }
      );

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
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || "Erro ao exportar");
      } else {
        setError(err instanceof Error ? err.message : "Erro ao exportar");
      }
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

  const pdfLimit = isAuthenticated ? getPdfLimit() : 0;
  const pdfUsed = isAuthenticated ? getPdfUsed() : 0;
  const allowedDensities = isAuthenticated ? getAllowedDensities() : [];

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <UpgradeModal 
        isOpen={isUpgradeModalOpen}
        onClose={closeModal}
        title={modalTitle}
        message={modalMessage}
        features={modalFeatures}
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

        {/* Usage Info */}
        {user && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Uso mensal</p>
                <p className="text-xs text-gray-600 mt-1">
                  {pdfUsed} de {pdfLimit} PDFs utilizados este mês
                </p>
                <div className="mt-2 w-full sm:w-64 bg-white rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${(pdfUsed / pdfLimit) * 100}%` }}
                  />
                </div>
              </div>
              {user.planType === 'free' && pdfUsed >= pdfLimit && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                  <span className="flex-1">Limite atingido. Faça upgrade para continuar.</span>
                  <button
                    onClick={() => window.location.href = '/upgrade'}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
                  >
                    Fazer Upgrade
                  </button>
                </div>
              )}
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
                  const isLocked = !allowedDensities.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => !isLocked && setDensity(option.value)}
                      disabled={isLocked}
                      className={`relative px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 ${
                        isLocked
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                          : density === option.value
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                      }`}
                    >
                      {isLocked && (
                        <Lock className="w-3 h-3 absolute top-1 right-1" />
                      )}
                      <div className="text-xs sm:text-sm flex items-center gap-1 justify-center">
                        {option.label}
                      </div>
                      <div className="text-[10px] sm:text-xs opacity-75">{option.desc} cards</div>
                    </button>
                  );
                })}
              </div>
              {user?.planType === 'free' && (
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-gray-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Densidades média e alta disponíveis no plano Pro
                  </p>
                  <button
                    onClick={() => window.location.href = '/upgrade'}
                    className="w-full sm:w-auto px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
                  >
                    Fazer Upgrade
                  </button>
                </div>
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl">
            <div className="flex items-start sm:items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span className="text-sm sm:text-base font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/10 p-4 sm:p-8 border border-blue-100">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-blue-600 text-sm sm:text-base font-medium text-center px-2">
                <CurrentLoadingIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0" />
                <span>{loadingMessages[loadingMessageIndex]?.text}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

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
            />
          </div>
        )}
      </div>
    </main>
    </>
  );
}
