import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLibrary } from '../store/library';
import { OptimizedImage } from '../components/OptimizedImage';
import { SkeletonCard } from '../components/SkeletonCard';

const ControllerIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
    <circle cx="15" cy="11" r="1" fill="currentColor" /><circle cx="17" cy="13" r="1" fill="currentColor" />
    <path d="M6 20H18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 21 12 21 16 21" /><line x1="12" y1="17" x2="12" y2="21" />
    <path d="M7 4h10v7a5 5 0 0 1-10 0V4z" />
    <path d="M7 9H4a3 3 0 0 1-3-3V4h6" /><path d="M17 9h3a3 3 0 0 0 3-3V4h-6" />
  </svg>
);

interface StatCardProps { value: number | string; label: string; color: string; delay?: number }
function StatCard({ value, label, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 280, damping: 22 }}
      className="bg-[#1a1a2e] border border-violet-900/20 rounded-xl p-3 text-center"
    >
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

export function Home() {
  const games = useLibrary(s => s.games);
  const syncing = useLibrary(s => s.syncing);

  const totalLevels = games.reduce((acc, g) => acc + g.levels.length, 0);
  const completedLevels = games.reduce((acc, g) => acc + g.levels.filter(l => l.completed).length, 0);
  const completedGames = games.filter(g => g.levels.length > 0 && g.levels.every(l => l.completed)).length;

  return (
    <div className="min-h-dvh pb-24">
      {/* Header */}
      <div className="px-4 pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-1"
        >
          <span className="text-violet-400"><ControllerIcon /></span>
          <h1 className="text-2xl font-bold gradient-text">The Gamer's Path</h1>
        </motion.div>
        <p className="text-slate-500 text-sm ml-1">Rastreie sua jornada nos jogos</p>
      </div>

      {/* Stats skeleton */}
      {syncing && games.length === 0 && (
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a2e] border border-violet-900/20 rounded-xl p-3 text-center">
                <div className="h-7 w-10 skeleton rounded mx-auto mb-1" />
                <div className="h-3 w-8 skeleton rounded mx-auto" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* Populated state */}
      {games.length > 0 && (
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={games.length} label="Jogos" color="text-violet-400" delay={0} />
            <StatCard value={completedLevels} label="Fases" color="text-cyan-400" delay={0.06} />
            <StatCard value={completedGames} label="Completos" color="text-emerald-400" delay={0.12} />
          </div>

          {totalLevels > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="bg-[#1a1a2e] border border-violet-900/20 rounded-xl p-4"
            >
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-400">Progresso geral</span>
                <span className="text-sm font-bold text-violet-400">
                  {Math.round((completedLevels / totalLevels) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((completedLevels / totalLevels) * 100)}%` }}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #22d3ee)' }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{completedLevels} de {totalLevels} fases</p>
            </motion.div>
          )}

          {/* Recent games */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-slate-200">Recentes</h2>
              <Link to="/library" className="text-xs text-violet-400">Ver todos</Link>
            </div>
            <div className="space-y-3">
              {games.slice(0, 3).map((game, index) => {
                const done = game.levels.filter(l => l.completed).length;
                const total = game.levels.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + index * 0.06 }}
                  >
                    <Link
                      to={`/game/${game.id}`}
                      className="flex gap-3 p-3 rounded-xl bg-[#1a1a2e] border border-violet-900/20 card-glow block"
                    >
                      <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                        <OptimizedImage
                          src={game.coverUrl}
                          alt={game.name}
                          fallback={
                            <div className="w-full h-full bg-[#0f0f1a] flex items-center justify-center text-slate-700">
                              <ControllerIcon />
                            </div>
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <p className="font-semibold text-sm text-slate-100 truncate">{game.name}</p>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-slate-500">{done}/{total} fases</span>
                            <span className="text-xs font-medium text-violet-400">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, delay: 0.3 + index * 0.06 }}
                              style={{
                                background: pct === 100
                                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                  : 'linear-gradient(90deg, #7c3aed, #22d3ee)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!syncing && games.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 flex flex-col items-center justify-center pt-16 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-violet-900/20 border border-violet-700/30 flex items-center justify-center text-violet-400 mb-4">
            <TrophyIcon />
          </div>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Sua jornada começa aqui</h2>
          <p className="text-slate-500 text-sm max-w-xs mb-6">
            Busque seus jogos favoritos e adicione à biblioteca para começar a rastrear seu progresso.
          </p>
          <Link
            to="/search"
            className="px-6 py-3 rounded-xl bg-violet-700 text-white font-semibold text-sm hover:bg-violet-600 active:scale-95 transition-all"
          >
            Buscar jogos
          </Link>
        </motion.div>
      )}
    </div>
  );
}
