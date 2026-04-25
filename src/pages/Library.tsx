import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibrary } from '../store/library';
import { OptimizedImage } from '../components/OptimizedImage';
import { SkeletonCard } from '../components/SkeletonCard';

const ControllerFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#0f0f1a] text-slate-700">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="11" r="1" fill="currentColor" /><circle cx="17" cy="13" r="1" fill="currentColor" />
      <path d="M6 20H18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
    </svg>
  </div>
);

export function Library() {
  const games = useLibrary(s => s.games);
  const syncing = useLibrary(s => s.syncing);

  return (
    <div className="min-h-dvh pb-24">
      <div className="px-4 pt-10 pb-5">
        <h1 className="text-xl font-bold text-slate-100">Biblioteca</h1>
        {games.length > 0 && (
          <p className="text-slate-500 text-sm mt-1">{games.length} jogo{games.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Skeleton on first sync */}
      {syncing && games.length === 0 && (
        <div className="px-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!syncing && games.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 flex flex-col items-center justify-center pt-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-violet-900/20 border border-violet-700/30 flex items-center justify-center text-violet-400 mb-4">
            <ControllerFallback />
          </div>
          <p className="text-slate-400 text-sm mb-2">Biblioteca vazia</p>
          <p className="text-slate-600 text-xs mb-6 max-w-xs">
            Busque jogos e adicione-os para começar a rastrear seu progresso.
          </p>
          <Link
            to="/search"
            className="px-5 py-2.5 rounded-xl bg-violet-700 text-white font-semibold text-sm hover:bg-violet-600 active:scale-95 transition-all"
          >
            Buscar jogos
          </Link>
        </motion.div>
      )}

      {games.length > 0 && (
        <div className="px-4 space-y-3">
          <AnimatePresence initial={false}>
            {games.map((game, index) => {
              const done = game.levels.filter(l => l.completed).length;
              const total = game.levels.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isComplete = total > 0 && done === total;

              return (
                <motion.div
                  key={game.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.22 }}
                >
                  <Link
                    to={`/game/${game.id}`}
                    className="flex gap-3 p-3 rounded-xl bg-[#1a1a2e] border border-violet-900/20 card-glow block"
                  >
                    <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                      <OptimizedImage src={game.coverUrl} alt={game.name} fallback={<ControllerFallback />} />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <p className="font-semibold text-sm text-slate-100 truncate">{game.name}</p>
                        {game.released > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">{game.released}</p>
                        )}
                      </div>

                      <div>
                        {total > 0 ? (
                          <>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs text-slate-500">{done}/{total} fases</span>
                              <span className={`text-xs font-bold ${isComplete ? 'text-emerald-400' : 'text-violet-400'}`}>
                                {isComplete ? '✓ Completo' : `${pct}%`}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.04 }}
                                style={{
                                  background: isComplete
                                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                    : 'linear-gradient(90deg, #7c3aed, #22d3ee)',
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-600">Sem fases cadastradas</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
