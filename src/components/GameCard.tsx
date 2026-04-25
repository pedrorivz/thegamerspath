import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { SpeedrunGame } from '../types/speedrun';
import { getCoverUrl, getPlatformNames } from '../api/speedrun';
import { useLibrary } from '../store/library';
import { OptimizedImage } from './OptimizedImage';

interface Props {
  game: SpeedrunGame;
  index?: number;
}

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const GameFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#0f0f1a] text-slate-700">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z" />
      <path d="M14 8h-1V7a1 1 0 0 0-2 0v1H9a1 1 0 0 0 0 2h2v1a1 1 0 0 0 2 0v-1h1a1 1 0 0 0 0-2z" />
    </svg>
  </div>
);

export function GameCard({ game, index = 0 }: Props) {
  const cover = getCoverUrl(game);
  const platforms = getPlatformNames(game).slice(0, 2);
  const inLibrary = useLibrary(s => s.hasGame(game.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
    >
      <Link
        to={`/game/${game.id}`}
        className="flex gap-3 p-3 rounded-xl bg-[#1a1a2e] border border-violet-900/20 card-glow block"
      >
        <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[#0f0f1a]">
          <OptimizedImage src={cover} alt={game.names.international} fallback={<GameFallback />} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="font-semibold text-sm text-slate-100 truncate leading-tight">
              {game.names.international}
            </p>
            {game.released > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{game.released}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="flex flex-wrap gap-1">
              {platforms.map(p => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{p}</span>
              ))}
            </div>
            {inLibrary && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-900/30 px-1.5 py-0.5 rounded"
              >
                <CheckIcon /> Na biblioteca
              </motion.span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
