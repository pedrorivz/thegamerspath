import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../store/library';

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export function Profile() {
  const { user, logout } = useAuth();
  const clear = useLibrary(s => s.clear);
  const games = useLibrary(s => s.games);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    clear();
    navigate('/auth', { replace: true });
  };

  const totalLevels = games.reduce((a, g) => a + g.levels.length, 0);
  const completedLevels = games.reduce((a, g) => a + g.levels.filter(l => l.completed).length, 0);
  const completedGames = games.filter(g => g.levels.length > 0 && g.levels.every(l => l.completed)).length;

  return (
    <div className="min-h-dvh pb-24">
      <div className="px-4 pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          <BackIcon /> Voltar
        </button>
      </div>

      <div className="px-4 pt-4">
        {/* User info */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#1a1a2e] border border-violet-900/20 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-900/30 border border-violet-700/30 flex items-center justify-center text-xl font-bold text-violet-400">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-slate-100">{user?.email}</p>
            <p className="text-xs text-slate-500 mt-0.5">Conta TGP</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1a1a2e] border border-violet-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-violet-400">{games.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Jogos</p>
          </div>
          <div className="bg-[#1a1a2e] border border-violet-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-cyan-400">{completedLevels}</p>
            <p className="text-xs text-slate-500 mt-0.5">Fases</p>
          </div>
          <div className="bg-[#1a1a2e] border border-violet-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{completedGames}</p>
            <p className="text-xs text-slate-500 mt-0.5">Completos</p>
          </div>
        </div>

        {totalLevels > 0 && (
          <div className="bg-[#1a1a2e] border border-violet-900/20 rounded-xl p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-400">Progresso geral</span>
              <span className="text-sm font-bold text-violet-400">
                {Math.round((completedLevels / totalLevels) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((completedLevels / totalLevels) * 100)}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #22d3ee)',
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{completedLevels} de {totalLevels} fases</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-rose-900/15 border border-rose-700/30 text-rose-400 hover:bg-rose-900/25 active:scale-[0.98] transition-all"
          >
            <LogoutIcon />
            <span className="font-medium text-sm">Sair da conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
