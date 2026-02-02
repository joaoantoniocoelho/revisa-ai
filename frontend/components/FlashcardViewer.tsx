"use client";

import { useState, useEffect, useRef } from 'react';
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
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipping, setIsSwipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  const nextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setShowAnswer(false);
      setSlideDirection("left");
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 1);
        setSlideDirection(null);
      }, 300);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setShowAnswer(false);
      setSlideDirection("right");
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex - 1);
        setSlideDirection(null);
      }, 300);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwipping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipping) return;
    setTouchEnd(e.targetTouches[0].clientX);
    setSwipeOffset(e.targetTouches[0].clientX - touchStart);
  };

  const handleTouchEnd = () => {
    setIsSwipping(false);
    if (swipeOffset > 100) {
      prevCard();
    } else if (swipeOffset < -100) {
      nextCard();
    }
    setSwipeOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTouchEnd(e.clientX);
    setSwipeOffset(e.clientX - touchStart);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (swipeOffset > 100) {
      prevCard();
    } else if (swipeOffset < -100) {
      nextCard();
    }
    setSwipeOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const handleCardClick = () => {
    if (Math.abs(swipeOffset) < 5) {
      setShowAnswer(!showAnswer);
    }
  };

  useEffect(() => {
    if (viewMode !== "deck" || cards.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prevCard();
      } else if (e.key === "ArrowRight") {
        nextCard();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setShowAnswer(!showAnswer);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [viewMode, currentCardIndex, showAnswer, cards.length]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (swipeOffset > 100) {
          prevCard();
        } else if (swipeOffset < -100) {
          nextCard();
        }
        setSwipeOffset(0);
        setTouchStart(0);
        setTouchEnd(0);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging, swipeOffset, currentCardIndex, cards.length]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum card encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {deckName && (
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate max-w-[200px] sm:max-w-none">
              {deckName}
            </h2>
          )}
          <span className="text-xs sm:text-sm text-gray-500">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {/* View Mode Toggle */}
          <div className="inline-flex bg-gray-100 rounded-xl sm:rounded-2xl p-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode("deck")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
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
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Lista</span>
            </button>
          </div>

          {/* Export Button */}
          {onExport && (
            <button
              onClick={onExport}
              disabled={exporting || exportDisabled}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exportando..." : "Baixar .apkg"}
            </button>
          )}
        </div>
      </div>

      {/* Deck View */}
      {viewMode === "deck" && (
        <div className="space-y-4 sm:space-y-6">
          {/* Counter */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Card {currentCardIndex + 1} de {cards.length}
            </span>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl" style={{ perspective: "2000px" }}>
            <div
              ref={cardRef}
              className="min-h-[240px] sm:min-h-[280px] rounded-2xl sm:rounded-3xl shadow-2xl cursor-pointer relative overflow-hidden select-none"
              style={{
                transform: (isSwipping || isDragging)
                  ? `translate3d(${swipeOffset}px, 0, 0) rotate(${swipeOffset / 20}deg)` 
                  : slideDirection === "left"
                  ? "translate3d(-100%, 0, 0)"
                  : slideDirection === "right"
                  ? "translate3d(100%, 0, 0)"
                  : "translate3d(0, 0, 0)",
                opacity: slideDirection ? 0 : 1,
                transition: (isSwipping || isDragging) ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
                transformStyle: "preserve-3d",
              }}
              onClick={handleCardClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {/* Front */}
              <div
                className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-white overflow-hidden ${
                  !showAnswer ? "hover:scale-[1.02]" : ""
                }`}
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: showAnswer ? "rotateY(180deg)" : "rotateY(0deg)",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s ease-out",
                  willChange: "transform",
                }}
              >
                <div className="text-center space-y-3 sm:space-y-4 px-2">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] sm:text-xs uppercase tracking-wide">
                    <HelpCircle className="w-3 h-3" />
                    Pergunta
                  </div>
                  <p className="text-base sm:text-xl font-semibold leading-relaxed">
                    {cards[currentCardIndex].front}
                  </p>
                  <p className="text-xs sm:text-sm opacity-75">
                    Clique para ver a resposta
                  </p>
                </div>
              </div>

              {/* Back */}
              <div
                className={`absolute inset-0 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-white overflow-hidden ${
                  showAnswer ? "hover:scale-[1.02]" : ""
                }`}
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: showAnswer ? "rotateY(0deg)" : "rotateY(-180deg)",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s ease-out",
                  willChange: "transform",
                }}
              >
                <div className="text-center space-y-3 sm:space-y-4 w-full px-2">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] sm:text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-3 h-3" />
                    Resposta
                  </div>
                  <div className="text-sm sm:text-lg font-medium leading-relaxed">
                    {cards[currentCardIndex].back}
                  </div>
                  {cards[currentCardIndex].tags && cards[currentCardIndex].tags!.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mt-3 sm:mt-4">
                      {cards[currentCardIndex].tags!.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full">
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

          {/* Navigation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <button
                onClick={prevCard}
                disabled={currentCardIndex === 0}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-blue-200 text-blue-600 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1.5 sm:gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Anterior</span>
                <span className="sm:hidden">Ant</span>
              </button>

              <div className="text-center">
                <span className="text-sm sm:text-base font-semibold text-gray-700">
                  {currentCardIndex + 1} / {cards.length}
                </span>
              </div>

              <button
                onClick={nextCard}
                disabled={currentCardIndex === cards.length - 1}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-white border-2 border-blue-200 text-blue-600 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1.5 sm:gap-2"
              >
                <span className="hidden sm:inline">Próximo</span>
                <span className="sm:hidden">Prox</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
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
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
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
