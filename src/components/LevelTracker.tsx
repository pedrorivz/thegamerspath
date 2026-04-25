import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibrary } from '../store/library';
import { toast } from './Toast';
import { Confetti } from './Confetti';
import type { LibraryLevel } from '../types/speedrun';

interface Props {
  gameId: string;
  levels: LibraryLevel[];
}

function haptic(duration = 40) {
  if ('vibrate' in navigator) navigator.vibrate(duration);
}

export function LevelTracker({ gameId, levels }: Props) {
  const toggleLevel = useLibrary(s => s.toggleLevel);
  const [confetti, setConfetti] = useState(false);
  const prevCompleted = useRef(levels.filter(l => l.completed).length);

  const completed = levels.filter(l => l.completed).length;
  const total = levels.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = total > 0 && completed === total;

  useEffect(() => {
    if (isComplete && prevCompleted.current < total) {
      setConfetti(true);
      haptic(200);
      toast.trophy('🏆 Jogo concluído! Parabéns!');
      const t = setTimeout(() => setConfetti(false), 3500);
      return () => clearTimeout(t);
    }
    prevCompleted.current = completed;
  }, [isComplete, completed, total]);

  const handleToggle = async (level: LibraryLevel) => {
    haptic(40);
    await toggleLevel(gameId, level.id);
    if (!level.completed) {
      toast.success(`✓ ${level.name}`);
    }
  };

  if (total === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        Nenhum capítulo/fase disponível para este jogo.
      </div>
    );
  }

  return (
    <>
      <Confetti trigger={confetti} originY={0.35} />

      {/* Progress block */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Progresso</span>
          <motion.span
            key={percent}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`text-sm font-bold ${isComplete ? 'text-emerald-400' : 'text-violet-400'}`}
          >
            {percent}%
          </motion.span>
        </div>

        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: isComplete
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #7c3aed, #22d3ee)',
            }}
          />
        </div>

        <div className="flex justify-between mt-1.5">
          <p className="text-xs text-slate-500">{completed} de {total} concluídos</p>
          {isComplete && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-semibold text-emerald-400"
            >
              Completo!
            </motion.span>
          )}
        </div>
      </div>

      {/* Level list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {levels.map((level, index) => (
            <motion.button
              key={level.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              onClick={() => handleToggle(level)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left select-none ${
                level.completed
                  ? 'bg-violet-900/20 border-violet-700/40'
                  : 'bg-[#0f0f1a] border-slate-800 active:border-slate-700'
              }`}
            >
              {/* Checkbox */}
              <motion.div
                animate={{
                  backgroundColor: level.completed ? '#7c3aed' : 'transparent',
                  borderColor: level.completed ? '#7c3aed' : '#374151',
                  scale: level.completed ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 0.25, times: [0, 0.4, 1] }}
                className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2"
              >
                <AnimatePresence>
                  {level.completed && (
                    <motion.svg
                      key="check"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Number */}
              <span className="text-xs text-slate-500 w-5 flex-shrink-0 text-right">{index + 1}</span>

              {/* Name */}
              <span className={`text-sm font-medium flex-1 transition-colors ${
                level.completed ? 'text-violet-300 line-through opacity-60' : 'text-slate-200'
              }`}>
                {level.name}
              </span>

              {/* Completion glow */}
              {level.completed && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"
                />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
