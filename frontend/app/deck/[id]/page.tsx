"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import FlashcardViewer from '@/components/FlashcardViewer';
import { useUser } from '@/contexts/UserContext';
import api from '@/lib/api';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Flashcard {
  front: string;
  back: string;
  tags?: string[];
}

interface Deck {
  _id: string;
  name: string;
  pdfFileName: string;
  density: string;
  cards: Flashcard[];
  metadata?: {
    finalCount?: number;
    language?: string;
  };
  createdAt: string;
}

export default function DeckPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useUser();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDeck();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
      setError('Você precisa estar logado para visualizar decks');
    }
  }, [params.id, authLoading, isAuthenticated]);

  const loadDeck = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/decks/${params.id}`);
      setDeck(response.data.deck);
    } catch (err: any) {
      console.error('Error loading deck:', err);
      if (err.response?.status === 404) {
        setError('Deck não encontrado');
      } else if (err.response?.status === 401) {
        setError('Você precisa estar logado para visualizar este deck');
      } else {
        setError(err.response?.data?.error || 'Erro ao carregar deck');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!deck) return;

    setExporting(true);
    try {
      const response = await api.get(`/export/deck/${deck._id}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/apkg' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deck.name}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting deck:', err);
      setError('Erro ao exportar deck');
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 flex items-center justify-center px-4 py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-600">Carregando deck...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !deck) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Erro ao carregar deck</h2>
              <p className="text-gray-600 mb-6">{error || 'Deck não encontrado'}</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Meus Decks
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 py-6 md:py-12 px-4 pb-28 md:pb-6">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          {/* Back Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar para Meus Decks</span>
          </Link>

          {/* Flashcard Viewer */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-4 sm:p-8 border border-blue-100">
            <FlashcardViewer
              cards={deck.cards}
              deckName={deck.name}
              onExport={handleExport}
              exporting={exporting}
            />
          </div>
        </div>
      </main>
    </>
  );
}
