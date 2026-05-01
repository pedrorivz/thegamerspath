import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchGames } from '../api/client';
import { GameCard } from '../components/GameCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { ManualGameForm } from '../components/ManualGameForm';
import type { SpeedrunGame } from '../types/speedrun';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PlusCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

function ManualCTA({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
      style={{
        border: '1px dashed rgba(124,58,237,0.4)',
        color: '#a78bfa',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(124,58,237,0.7)';
        e.currentTarget.style.background = 'rgba(124,58,237,0.07)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <PlusCircleIcon />
      Não encontrou? Adicione manualmente
    </motion.button>
  );
}

export function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpeedrunGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchGames(query);
      setResults(data as SpeedrunGame[]);
      setSearched(true);
      setLoading(false);
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const clear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const openManual = () => setShowManualForm(true);
  const closeManual = () => setShowManualForm(false);

  return (
    <div className="min-h-dvh pb-24">
      <div className="px-4 pt-10 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold text-slate-100 mb-4"
        >
          Buscar Jogos
        </motion.h1>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nome do jogo, abreviação..."
            className="w-full bg-[#1a1a2e] border border-violet-900/30 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
            autoFocus
          />
          <AnimatePresence>
            {query && (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={clear}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <XIcon />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <p className="text-xs text-slate-600 mt-2 ml-1">
          Funciona com nomes parciais, abreviações e títulos com underline
        </p>
      </div>

      <div className="px-4">
        {/* Skeleton loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10"
          >
            <p className="text-slate-500 text-sm">Nenhum jogo encontrado para "{query}"</p>
            <p className="text-slate-600 text-xs mt-1 mb-6">Tente um nome diferente ou abreviação</p>
            <AnimatePresence>
              <ManualCTA key="cta-empty" onClick={openManual} />
            </AnimatePresence>
          </motion.div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-xs text-slate-500 mb-3">
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {results.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} />
              ))}
            </div>
            <div className="mt-5">
              <AnimatePresence>
                <ManualCTA key="cta-results" onClick={openManual} />
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Idle */}
        {!loading && !searched && !query && (
          <div className="text-center py-12 text-slate-600 flex flex-col items-center gap-3">
            <SearchIcon />
            <p className="text-sm">Digite para buscar jogos</p>
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {showManualForm && (
          <ManualGameForm key="manual-form" onClose={closeManual} />
        )}
      </AnimatePresence>
    </div>
  );
}
