"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useUser } from '@/contexts/UserContext';
import api from '@/lib/api';
import {
  Loader2,
  Download,
  Trash2,
  FileText,
  Calendar,
  Tag as TagIcon,
  LayoutDashboard,
  AlertCircle,
  Eye,
  Pencil,
  Check,
  X,
} from 'lucide-react';

interface Deck {
  _id: string;
  name: string;
  pdfFileName: string;
  density: string;
  createdAt: string;
  metadata: {
    finalCount: number;
    language: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useUser();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDecks();
    }
  }, [authLoading, isAuthenticated]);

  const loadDecks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/decks');
      setDecks(response.data.decks);
    } catch (err: any) {
      console.error('Error loading decks:', err);
      setError('Erro ao carregar decks');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (deckId: string, deckName: string) => {
    try {
      setExporting(deckId);
      const response = await api.get(`/export/deck/${deckId}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/apkg' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckName}.apkg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting deck:', err);
      setError('Erro ao exportar deck');
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async (deckId: string) => {
    if (!confirm('Tem certeza que deseja deletar este deck?')) {
      return;
    }

    try {
      setDeleting(deckId);
      await api.delete(`/decks/${deckId}`);
      setDecks(decks.filter(d => d._id !== deckId));
    } catch (err: any) {
      console.error('Error deleting deck:', err);
      setError('Erro ao deletar deck');
    } finally {
      setDeleting(null);
    }
  };

  const startEditingName = (deckId: string, currentName: string) => {
    setEditingDeckId(deckId);
    setEditedName(currentName);
  };

  const cancelEditingName = () => {
    setEditingDeckId(null);
    setEditedName('');
  };

  const saveDeckName = async (deckId: string) => {
    if (!editedName.trim()) return;

    try {
      setSavingName(true);
      const response = await api.patch(`/decks/${deckId}`, {
        name: editedName.trim(),
      });
      
      setDecks(decks.map(d => 
        d._id === deckId 
          ? { ...d, name: response.data.deck.name }
          : d
      ));
      setEditingDeckId(null);
      setEditedName('');
    } catch (err: any) {
      console.error('Error updating deck name:', err);
      setError(err.response?.data?.error || 'Erro ao atualizar nome do deck');
    } finally {
      setSavingName(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 py-6 md:py-12 px-4 pb-28 md:pb-6">
          <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <LayoutDashboard className="w-16 h-16 text-gray-400 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-800">Faça login para ver seus decks</h2>
              <p className="text-gray-600">Você precisa estar logado para acessar seus flashcards salvos.</p>
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
          
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
                Meus Decks
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {decks.length} {decks.length === 1 ? 'deck' : 'decks'} salvos
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && decks.length === 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-500/10 p-12 border border-blue-100 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                Nenhum deck ainda
              </h3>
              <p className="text-gray-600 mb-6">
                Gere seu primeiro deck a partir de um PDF
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all"
              >
                Gerar Flashcards
              </button>
            </div>
          )}

          {/* Decks Grid */}
          {!loading && decks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {decks.map((deck) => (
                <div
                  key={deck._id}
                  onClick={() => {
                    if (editingDeckId !== deck._id) {
                      router.push(`/deck/${deck._id}`);
                    }
                  }}
                  className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-500/10 p-6 border border-blue-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                >
                  {/* Deck Header */}
                  <div className="mb-4 min-w-0">
                    {editingDeckId === deck._id ? (
                      <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="flex-1 text-lg font-bold text-gray-800 border-2 border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 min-w-0"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveDeckName(deck._id);
                            if (e.key === 'Escape') cancelEditingName();
                          }}
                        />
                        <button
                          onClick={() => saveDeckName(deck._id)}
                          disabled={savingName || !editedName.trim()}
                          className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                        >
                          {savingName ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={cancelEditingName}
                          disabled={savingName}
                          className="p-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg disabled:opacity-50 transition-all flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 mb-1">
                        <h3 className="flex-1 text-lg font-bold text-gray-800 break-words min-w-0">
                          {deck.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingName(deck._id, deck.name);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                          title="Editar nome"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{deck.pdfFileName}</span>
                    </p>
                  </div>

                  {/* Deck Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cards:</span>
                      <span className="font-semibold text-gray-800">
                        {deck.metadata?.finalCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Densidade:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium capitalize">
                        {deck.density}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(deck.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/deck/${deck._id}`);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Visualizar</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(deck._id, deck.name);
                      }}
                      disabled={exporting === deck._id}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {exporting === deck._id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="hidden sm:inline">Exp...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Exportar</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(deck._id);
                      }}
                      disabled={deleting === deck._id}
                      className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {deleting === deck._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
