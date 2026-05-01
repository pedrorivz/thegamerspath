import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCoverUrl, getPlatformNames, getGenreNames, getLevels } from '../api/speedrun';
import * as backendApi from '../api/client';
import { getOllamaHealth, triggerOllama } from '../api/client';
import { useLibrary } from '../store/library';
import { useSettings } from '../hooks/useSettings';
import { LevelTracker } from '../components/LevelTracker';
import { OptimizedImage } from '../components/OptimizedImage';
import { SkeletonDetailHero, SkeletonLevel } from '../components/SkeletonCard';
import { toast } from '../components/Toast';
import type { SpeedrunGame, LibraryGame } from '../types/speedrun';

function synthSpeedrunGame(entry: LibraryGame): SpeedrunGame {
  const nullAsset = { uri: null };
  return {
    id: entry.speedrunId,
    names: { international: entry.name },
    abbreviation: entry.abbreviation,
    weblink: '',
    released: entry.released,
    'release-date': String(entry.released),
    assets: {
      logo: nullAsset,
      'cover-tiny': nullAsset,
      'cover-small': nullAsset,
      'cover-medium': { uri: entry.coverUrl },
      'cover-large': { uri: entry.coverUrl },
      icon: nullAsset,
      'trophy-1st': nullAsset,
      'trophy-2nd': nullAsset,
      'trophy-3rd': nullAsset,
      'trophy-4th': nullAsset,
      background: nullAsset,
      foreground: nullAsset,
    },
    platforms: entry.platforms,
    genres: entry.genres,
  };
}

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isManualGame = id?.startsWith('manual_') ?? false;
  const [game, setGame] = useState<SpeedrunGame | null>(null);
  const [loading, setLoading] = useState(!isManualGame);
  const [adding, setAdding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionError, setActionError] = useState('');

  const { addGame, removeGame, hasGame, getGame: getLibraryGame, addLevel, addLevels, addNote, updateNote, deleteNote, sync, setOllamaStatus } = useLibrary();
  const { settings } = useSettings();
  const inLibrary = id ? hasGame(id) : false;
  const libraryEntry = id ? getLibraryGame(id) : undefined;
  const displayGame = (isManualGame && libraryEntry)
    ? synthSpeedrunGame(libraryEntry)
    : (game ?? (inLibrary && libraryEntry ? synthSpeedrunGame(libraryEntry) : null));

  const [showAddLevel, setShowAddLevel] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [addingLevel, setAddingLevel] = useState(false);
  const addLevelInputRef = useRef<HTMLInputElement>(null);
  const bulkTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [triggeringOllama, setTriggeringOllama] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id || isManualGame) return;
    setLoading(true);
    backendApi.getGameById(id)
      .then(data => setGame(data as SpeedrunGame))
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [id, isManualGame]);

  useEffect(() => {
    getOllamaHealth().then(setOllamaOnline);
  }, []);

  // Poll for Ollama chapter extraction completion
  useEffect(() => {
    if (!libraryEntry || libraryEntry.ollamaStatus !== 'processing') return;

    pollingRef.current = setInterval(async () => {
      try {
        const status = await backendApi.getGameStatus(libraryEntry.id);
        if (status.ollamaStatus !== 'processing') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          await sync();
          if (status.ollamaStatus === 'done') {
            toast.success(`${status.levelsCount} capítulo(s) extraídos pelo Ollama`);
          } else {
            toast.info('Ollama não encontrou capítulos para este jogo.');
          }
        }
      } catch { /* ignore poll errors */ }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [libraryEntry?.ollamaStatus, libraryEntry?.id, sync]);

  const handleAdd = async () => {
    if (!game || !id) return;
    setAdding(true);
    setActionError('');
    try {
      const levels = getLevels(game).map(l => ({ id: l.id, name: l.name }));
      const useOllama = levels.length === 0 && settings.useOllama;
      await addGame({
        speedrun_id: id,
        name: game.names.international,
        cover_url: getCoverUrl(game),
        abbreviation: game.abbreviation,
        released: game.released,
        platforms: getPlatformNames(game),
        genres: getGenreNames(game),
        levels,
        useOllama,
      });
      if (useOllama) {
        toast.info(`🤖 Extraindo capítulos de "${game.names.international}" via Ollama...`);
      } else {
        toast.info(`🎮 ${game.names.international} adicionado à biblioteca`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao adicionar jogo');
      toast.error('Não foi possível adicionar o jogo');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!libraryEntry) return;
    setShowConfirm(false);
    try {
      await removeGame(libraryEntry.id);
      toast.info(`${libraryEntry.name} removido da biblioteca`);
    } catch {
      setActionError('Erro ao remover jogo');
      toast.error('Não foi possível remover o jogo');
    }
  };

  const handleTriggerOllama = async () => {
    if (!libraryEntry) return;
    setTriggeringOllama(true);
    try {
      await triggerOllama(libraryEntry.id);
      setOllamaStatus(libraryEntry.id, 'processing');
      toast.info(`🤖 Buscando capítulos de "${libraryEntry.name}" via Ollama...`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar Ollama');
    } finally {
      setTriggeringOllama(false);
    }
  };

  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryEntry || !newLevelName.trim()) return;
    setAddingLevel(true);
    try {
      await addLevel(libraryEntry.id, newLevelName.trim());
      toast.success(`Fase "${newLevelName.trim()}" adicionada`);
      setNewLevelName('');
      addLevelInputRef.current?.focus();
    } catch {
      toast.error('Não foi possível adicionar a fase');
    } finally {
      setAddingLevel(false);
    }
  };

  const handleAddLevelsBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryEntry) return;
    const names = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (names.length === 0) return;
    setAddingLevel(true);
    try {
      await addLevels(libraryEntry.id, names);
      toast.success(`${names.length} fase${names.length > 1 ? 's' : ''} adicionada${names.length > 1 ? 's' : ''}`);
      closeAddLevel();
    } catch {
      toast.error('Não foi possível adicionar as fases');
    } finally {
      setAddingLevel(false);
    }
  };

  const openAddLevel = () => {
    setShowAddLevel(true);
    setBulkMode(false);
    setTimeout(() => addLevelInputRef.current?.focus(), 50);
  };

  const closeAddLevel = () => {
    setShowAddLevel(false);
    setBulkMode(false);
    setNewLevelName('');
    setBulkText('');
  };

  const switchToBulk = () => {
    setBulkMode(true);
    setTimeout(() => bulkTextareaRef.current?.focus(), 50);
  };

  const switchToSingle = () => {
    setBulkMode(false);
    setTimeout(() => addLevelInputRef.current?.focus(), 50);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryEntry || !newNoteContent.trim()) return;
    setSavingNote(true);
    try {
      await addNote(libraryEntry.id, newNoteContent.trim());
      setNewNoteContent('');
      setShowNoteForm(false);
    } catch {
      toast.error('Não foi possível salvar a nota');
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!libraryEntry || !editingNoteContent.trim()) return;
    setSavingNote(true);
    try {
      await updateNote(libraryEntry.id, noteId, editingNoteContent.trim());
      setEditingNoteId(null);
      setEditingNoteContent('');
    } catch {
      toast.error('Não foi possível atualizar a nota');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!libraryEntry) return;
    try {
      await deleteNote(libraryEntry.id, noteId);
    } catch {
      toast.error('Não foi possível remover a nota');
    }
  };

  const startEditNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditingNoteContent(content);
  };

  if (loading) {
    return (
      <div className="min-h-dvh pb-24">
        <div className="px-4 pt-6 pb-2">
          <div className="h-4 w-16 skeleton rounded-md" />
        </div>
        <SkeletonDetailHero />
        <div className="h-px bg-slate-800 mx-4" />
        <div className="px-4 pt-5 space-y-2">
          <div className="h-4 w-32 skeleton rounded-md mb-4" />
          {Array.from({ length: 5 }).map((_, i) => <SkeletonLevel key={i} />)}
        </div>
      </div>
    );
  }

  if (!displayGame) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
        <p className="text-slate-400 mb-4">Jogo não encontrado.</p>
        <button onClick={() => navigate(-1)} className="text-violet-400 text-sm">Voltar</button>
      </div>
    );
  }

  const cover = getCoverUrl(displayGame);
  const platforms = getPlatformNames(displayGame);
  const genres = getGenreNames(displayGame);
  const levels = inLibrary && libraryEntry ? libraryEntry.levels : [];

  return (
    <motion.div
      className="min-h-dvh pb-24"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="px-4 pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          <BackIcon /> Voltar
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 pb-5">
        <div className="flex gap-4">
          <div className="w-28 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-[#1a1a2e] shadow-lg shadow-black/50">
            <OptimizedImage
              src={cover}
              alt={displayGame.names.international}
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e] text-slate-600">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                  </svg>
                </div>
              }
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight">
                {displayGame.names.international}
              </h1>
              {displayGame.released > 0 && (
                <p className="text-sm text-slate-500 mt-0.5">{displayGame.released}</p>
              )}
            </div>
            {platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {platforms.map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">{p}</span>
                ))}
              </div>
            )}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {genres.map(g => (
                  <span key={g} className="text-[10px] px-2 py-0.5 rounded-md bg-violet-900/30 text-violet-400 border border-violet-800/40">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <p className="mt-3 text-xs text-rose-400 text-center">{actionError}</p>
        )}

        <div className="mt-4">
          {!inLibrary ? (
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-700 text-white font-semibold text-sm hover:bg-violet-600 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {adding ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><PlusIcon /> Adicionar à biblioteca</>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 py-3 rounded-xl bg-emerald-900/20 border border-emerald-700/30 text-center">
                <span className="text-sm font-medium text-emerald-400">Na biblioteca</span>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="px-4 py-3 rounded-xl bg-rose-900/20 border border-rose-700/30 text-rose-400 hover:bg-rose-900/40 active:scale-95 transition-all"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-800 mx-4" />

      <div className="px-4 pt-5">
        <h2 className="text-base font-semibold text-slate-200 mb-4">
          {inLibrary ? 'Capítulos / Fases' : 'Capítulos / Fases disponíveis'}
        </h2>

        {inLibrary ? (
          <>
            <AnimatePresence>
              {libraryEntry?.ollamaStatus === 'processing' && (
                <motion.div
                  key="ollama-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-violet-900/20 border border-violet-700/40"
                >
                  <div className="w-4 h-4 flex-shrink-0 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  <p className="text-sm text-violet-300">
                    Ollama está buscando capítulos na web…
                  </p>
                </motion.div>
              )}
              {libraryEntry?.ollamaStatus === 'failed' && levels.length === 0 && (
                <motion.div
                  key="ollama-failed"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-amber-900/20 border border-amber-700/40"
                >
                  <p className="text-sm text-amber-400">
                    Ollama não encontrou capítulos. Você pode adicioná-los manualmente.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <LevelTracker gameId={libraryEntry!.id} levels={levels} />

            {/* Ollama import button — visible when no levels and not already processing */}
            <AnimatePresence>
              {levels.length === 0 && libraryEntry?.ollamaStatus !== 'processing' && (
                <motion.div
                  key="ollama-trigger"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4"
                >
                  <button
                    onClick={handleTriggerOllama}
                    disabled={triggeringOllama || ollamaOnline === false}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-900/20 border border-violet-700/30 text-violet-300 hover:bg-violet-900/40 hover:border-violet-600/50 active:scale-[0.98] transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {triggeringOllama ? (
                      <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                      </svg>
                    )}
                    Buscar capítulos com Ollama
                    <span className={`ml-auto flex items-center gap-1 text-xs font-normal ${ollamaOnline === null ? 'text-slate-500' : ollamaOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${ollamaOnline === null ? 'bg-slate-600' : ollamaOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      {ollamaOnline === null ? 'verificando…' : ollamaOnline ? 'online' : 'offline'}
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4">
              <AnimatePresence mode="wait">
                {!showAddLevel ? (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={openAddLevel}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-violet-700/60 hover:text-violet-400 active:scale-[0.98] transition-all text-sm"
                  >
                    <PlusIcon /> Adicionar fase manualmente
                  </motion.button>
                ) : bulkMode ? (
                  <motion.form
                    key="bulk-form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleAddLevelsBulk}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-slate-500">Uma fase por linha</span>
                      <button
                        type="button"
                        onClick={switchToSingle}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Adicionar uma só
                      </button>
                    </div>
                    <textarea
                      ref={bulkTextareaRef}
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      placeholder={'Capítulo 1\nCapítulo 2\nCapítulo 3'}
                      rows={5}
                      className="w-full bg-[#1a1a2e] border border-violet-900/30 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={bulkText.split('\n').filter(l => l.trim()).length === 0 || addingLevel}
                        className="flex-1 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {addingLevel ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                        ) : (() => {
                          const count = bulkText.split('\n').filter(l => l.trim()).length;
                          return count > 0 ? `Importar ${count} fase${count > 1 ? 's' : ''}` : 'Importar';
                        })()}
                      </button>
                      <button
                        type="button"
                        onClick={closeAddLevel}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <XIcon />
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.form
                    key="add-form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleAddLevel}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={switchToBulk}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Importar várias
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={addLevelInputRef}
                        type="text"
                        value={newLevelName}
                        onChange={e => setNewLevelName(e.target.value)}
                        placeholder="Nome da fase..."
                        maxLength={100}
                        className="flex-1 bg-[#1a1a2e] border border-violet-900/30 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!newLevelName.trim() || addingLevel}
                        className="px-4 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {addingLevel
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : 'Salvar'
                        }
                      </button>
                      <button
                        type="button"
                        onClick={closeAddLevel}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <XIcon />
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {getLevels(displayGame).length > 0 ? (
              getLevels(displayGame).map((level, i) => (
                <div key={level.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a2e] border border-slate-800">
                  <span className="text-xs text-slate-600 w-5">{i + 1}</span>
                  <span className="text-sm text-slate-400">{level.name}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-600 text-sm text-center py-4">Nenhuma fase disponível na API.</p>
            )}
            {getLevels(displayGame).length > 0 && (
              <p className="text-xs text-slate-600 text-center pt-2">Adicione à biblioteca para rastrear o progresso</p>
            )}
          </div>
        )}
      </div>

      {inLibrary && libraryEntry && (
        <>
          <div className="h-px bg-slate-800 mx-4 mt-2" />

          <div className="px-4 pt-5 pb-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">Notas</h2>
              {!showNoteForm && (
                <button
                  onClick={() => { setShowNoteForm(true); setEditingNoteId(null); }}
                  className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <PlusIcon /> Nova nota
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {showNoteForm && (
                <motion.form
                  key="note-form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleAddNote}
                  className="mb-4"
                >
                  <textarea
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    placeholder="Escreva sua nota..."
                    rows={4}
                    autoFocus
                    className="w-full bg-[#1a1a2e] border border-violet-900/30 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="submit"
                      disabled={!newNoteContent.trim() || savingNote}
                      className="flex-1 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {savingNote
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                        : 'Salvar nota'
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNoteForm(false); setNewNoteContent(''); }}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <XIcon />
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {libraryEntry.notes.length === 0 && !showNoteForm && (
              <p className="text-sm text-slate-600 text-center py-4">Nenhuma nota ainda.</p>
            )}

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {libraryEntry.notes.map(note => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-[#1a1a2e] border border-slate-800 rounded-xl p-4"
                  >
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editingNoteContent}
                          onChange={e => setEditingNoteContent(e.target.value)}
                          rows={4}
                          autoFocus
                          className="w-full bg-[#0f0f1a] border border-violet-900/30 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors resize-none mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={!editingNoteContent.trim() || savingNote}
                            className="flex-1 py-2 rounded-xl bg-violet-700 text-white text-xs font-semibold hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {savingNote ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Salvar'}
                          </button>
                          <button
                            onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <XIcon />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                          <span className="text-xs text-slate-600">
                            {new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {note.updatedAt !== note.createdAt && ' · editado'}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditNote(note.id, note.content)}
                              className="text-xs text-slate-500 hover:text-violet-400 transition-colors px-2 py-1"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-xs text-slate-500 hover:text-rose-400 transition-colors px-2 py-1"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-lg bg-[#1a1a2e] border-t border-violet-900/40 rounded-t-2xl p-6 pb-10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-slate-100 mb-2">Remover da biblioteca?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Todo o progresso de "{displayGame.names.international}" será perdido.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium text-sm hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRemove}
                  className="flex-1 py-3 rounded-xl bg-rose-700 text-white font-semibold text-sm hover:bg-rose-600 transition-colors"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
