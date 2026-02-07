"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  Tag as TagIcon,
  Layers,
  List,
  Download,
} from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
  tags?: string[];
}

type ViewMode = "list" | "deck";

interface FlashcardViewerProps {
  cards: Flashcard[];
  deckName?: string;
  onExport?: () => void;
  exporting?: boolean;
  exportDisabled?: boolean;
}

export default function FlashcardViewer({
  cards,
  deckName,
  onExport,
  exporting = false,
  exportDisabled = false,
}: FlashcardViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("deck");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevIndexRef = useRef(0);

  const updateCurrentIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || cards.length === 0) return;
    const cardWidth = el.offsetWidth;
    const scrollLeft = el.scrollLeft;
    const index = Math.round(scrollLeft / cardWidth);
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    if (clamped !== prevIndexRef.current) {
      prevIndexRef.current = clamped;
      setCurrentCardIndex(clamped);
      setShowAnswer(false);
    }
  }, [cards.length]);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, cards.length);
  }, [cards.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) updateCurrentIndex();
  }, [viewMode, updateCurrentIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScrollEnd = () => updateCurrentIndex();
    el.addEventListener('scrollend', handleScrollEnd);
    return () => el.removeEventListener('scrollend', handleScrollEnd);
  }, [updateCurrentIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(updateCurrentIndex, 100);
    };
    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [updateCurrentIndex]);

  const scrollToCard = (index: number) => {
    const el = scrollRef.current;
    const slide = slideRefs.current[index];
    if (el && slide) {
      setShowAnswer(false);
      slide.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    }
  };

  const nextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      scrollToCard(currentCardIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      scrollToCard(currentCardIndex - 1);
    }
  };

  const handleCardClick = (index: number) => {
    if (index === currentCardIndex) {
      setShowAnswer((prev) => !prev);
    }
  };

  useEffect(() => {
    if (viewMode !== "deck" || cards.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevCard();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextCard();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setShowAnswer((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [viewMode, currentCardIndex, cards.length]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum card encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header: linha 1 = nome + deck/lista, linha 2 = download */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 min-w-0">
          {deckName && (
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate min-w-0 flex-1">
              {deckName}
            </h2>
          )}
          <div className="inline-flex flex-shrink-0 bg-gray-100 rounded-xl sm:rounded-2xl p-1">
            <button
              onClick={() => setViewMode("deck")}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 sm:gap-2 ${
                viewMode === "deck"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Deck</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 sm:gap-2 ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Lista</span>
            </button>
          </div>
        </div>

        {onExport && (
          <div>
            <button
              onClick={onExport}
              disabled={exporting || exportDisabled}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-200 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exportando..." : "Baixar .apkg"}
            </button>
          </div>
        )}
      </div>

      {/* Deck View - CSS scroll-snap (animação nativa do browser) */}
      {viewMode === "deck" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Card {currentCardIndex + 1} de {cards.length}
            </span>
          </div>

          {/* Scroll container - navegador controla swipe nativamente */}
          <div
            ref={scrollRef}
            className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory py-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto' }}
          >
            {cards.map((card, index) => (
              <div
                key={index}
                ref={(el) => { slideRefs.current[index] = el; }}
                className="flex-shrink-0 w-full min-w-full snap-center px-3 flex justify-center"
              >
                {/* Wrapper com sombra (sem overflow) para a sombra rolar com o card */}
                <div
                  className="rounded-2xl sm:rounded-3xl min-h-[240px] sm:min-h-[280px] w-full max-w-[calc(100%-1rem)] shadow-2xl cursor-pointer"
                  onClick={() => handleCardClick(index)}
                >
                <div
                  className="relative w-full h-full min-h-[240px] sm:min-h-[280px] rounded-2xl sm:rounded-3xl overflow-hidden perspective-[2000px]"
                >
                  {/* Flip container - só CSS transition */}
                  <div
                    className="relative w-full h-full min-h-[240px] sm:min-h-[280px]"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: index === currentCardIndex && showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform 0.35s ease-out',
                    }}
                  >
                    {/* Front */}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-white overflow-hidden [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
                      style={{ transform: 'rotateY(0deg)' }}
                    >
                      <div className="text-center space-y-3 sm:space-y-4 px-2">
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 bg-white/25 rounded-full text-[10px] sm:text-xs uppercase tracking-wide">
                          <HelpCircle className="w-3 h-3" />
                          Pergunta
                        </div>
                        <p className="text-base sm:text-xl font-semibold leading-relaxed">
                          {card.front}
                        </p>
                        <p className="text-xs sm:text-sm opacity-75">
                          Clique para ver a resposta
                        </p>
                      </div>
                    </div>

                    {/* Back */}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-white overflow-hidden [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
                      style={{ transform: 'rotateY(180deg)' }}
                    >
                      <div className="text-center space-y-3 sm:space-y-4 w-full px-2">
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 bg-white/25 rounded-full text-[10px] sm:text-xs uppercase tracking-wide">
                          <CheckCircle2 className="w-3 h-3" />
                          Resposta
                        </div>
                        <div className="text-sm sm:text-lg font-medium leading-relaxed">
                          {card.back}
                        </div>
                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mt-3 sm:mt-4">
                            {card.tags.map((tag, i) => (
                              <span key={i} className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 bg-white/25 rounded-full">
                                <TagIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs sm:text-sm opacity-75">
                          Clique para voltar
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <button
                onClick={prevCard}
                disabled={currentCardIndex === 0}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-blue-200 text-blue-600 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-1.5 sm:gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Anterior</span>
                <span className="sm:hidden">Ant</span>
              </button>

              <button
                onClick={nextCard}
                disabled={currentCardIndex === cards.length - 1}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-blue-200 text-blue-600 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-1.5 sm:gap-2"
              >
                <span className="hidden sm:inline">Próximo</span>
                <span className="sm:hidden">Prox</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-[width] duration-300 ease-out"
                style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
          {cards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 transition-colors duration-200"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-blue-600 uppercase mb-1.5 sm:mb-2">
                      <HelpCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Pergunta</span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-900 font-medium break-words">
                      {card.front}
                    </p>
                  </div>
                  <div className="pt-3 sm:pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-cyan-600 uppercase mb-1.5 sm:mb-2">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>Resposta</span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">
                      {card.back}
                    </p>
                  </div>
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
                      {card.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full font-medium"
                        >
                          <TagIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                          <span className="truncate">{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
