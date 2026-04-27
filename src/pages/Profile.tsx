import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../store/library';
import { useSettings } from '../hooks/useSettings';
import * as api from '../api/client';
import { toast } from '../components/Toast';

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

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export function Profile() {
  const { user, logout } = useAuth();
  const { clear, sync } = useLibrary();
  const games = useLibrary(s => s.games);
  const { settings, setUseOllama } = useSettings();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<object | null>(null);
  const [pendingImportCount, setPendingImportCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    logout();
    clear();
    navigate('/auth', { replace: true });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tgp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exportado com sucesso');
    } catch {
      toast.error('Não foi possível exportar o backup');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        if (!data || data['version'] !== 1 || !Array.isArray(data['games'])) {
          toast.error('Arquivo de backup inválido');
          return;
        }
        setPendingImport(data);
        setPendingImportCount((data['games'] as unknown[]).length);
      } catch {
        toast.error('Não foi possível ler o arquivo');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    setPendingImport(null);
    try {
      await api.importBackup(pendingImport);
      await sync();
      toast.success(`${pendingImportCount} jogo${pendingImportCount !== 1 ? 's' : ''} importado${pendingImportCount !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Não foi possível importar o backup');
    } finally {
      setImporting(false);
      setPendingImportCount(0);
    }
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

        {/* Settings */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-1">Configurações</p>
          <button
            onClick={() => setUseOllama(!settings.useOllama)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#1a1a2e] border border-slate-800 text-slate-300 hover:border-violet-700/50 active:scale-[0.98] transition-all"
          >
            <div
              className={`w-11 h-6 flex-shrink-0 rounded-full transition-colors duration-200 ${settings.useOllama ? 'bg-violet-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${settings.useOllama ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
              />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Busca de capítulos (Ollama)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Usa IA local para extrair capítulos de jogos sem fases na API
              </p>
            </div>
          </button>
        </div>

        {/* Backup */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-1">Backup</p>
          <div className="space-y-2">
            <button
              onClick={handleExport}
              disabled={exporting || games.length === 0}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#1a1a2e] border border-slate-800 text-slate-300 hover:border-violet-700/50 hover:text-violet-300 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {exporting
                ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                : <DownloadIcon />
              }
              <div className="text-left">
                <p className="font-medium text-sm">Exportar backup</p>
                <p className="text-xs text-slate-500 mt-0.5">Salva jogos, fases e notas em JSON</p>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#1a1a2e] border border-slate-800 text-slate-300 hover:border-violet-700/50 hover:text-violet-300 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {importing
                ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                : <UploadIcon />
              }
              <div className="text-left">
                <p className="font-medium text-sm">Importar backup</p>
                <p className="text-xs text-slate-500 mt-0.5">Restaura a partir de um arquivo JSON</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

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

      {/* Import confirmation sheet */}
      <AnimatePresence>
        {pendingImport && (
          <motion.div
            key="import-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setPendingImport(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-lg bg-[#1a1a2e] border-t border-violet-900/40 rounded-t-2xl p-6 pb-10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-slate-100 mb-2">Importar backup?</h3>
              <p className="text-sm text-slate-400 mb-1">
                {pendingImportCount} jogo{pendingImportCount !== 1 ? 's' : ''} encontrado{pendingImportCount !== 1 ? 's' : ''} no arquivo.
              </p>
              <p className="text-sm text-amber-400/80 mb-6">
                Atenção: a biblioteca atual será substituída por completo.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingImport(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium text-sm hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 py-3 rounded-xl bg-violet-700 text-white font-semibold text-sm hover:bg-violet-600 transition-colors"
                >
                  Importar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
