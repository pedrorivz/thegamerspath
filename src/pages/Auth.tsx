import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../store/library';
import { APIError } from '../api/client';

const ControllerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="12" x2="10" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <circle cx="15" cy="11" r="1" fill="currentColor" />
    <circle cx="17" cy="13" r="1" fill="currentColor" />
    <path d="M6 20H18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
  </svg>
);

export function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register, loading, token } = useAuth();
  const sync = useLibrary(s => s.sync);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  useEffect(() => {
    if (token) navigate(from, { replace: true });
  }, [token, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      await sync();
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 pb-10">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-900/30 border border-violet-700/40 text-violet-400 mb-4">
          <ControllerIcon />
        </div>
        <h1 className="text-2xl font-bold gradient-text">The Gamer's Path</h1>
        <p className="text-slate-500 text-sm mt-1">Rastreie sua jornada nos jogos</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-[#1a1a2e] border border-violet-900/20 p-1 mb-6">
        <button
          onClick={() => { setMode('login'); setError(''); }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            mode === 'login'
              ? 'bg-violet-700 text-white shadow'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => { setMode('register'); setError(''); }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            mode === 'register'
              ? 'bg-violet-700 text-white shadow'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Criar conta
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            autoComplete="email"
            className="w-full bg-[#1a1a2e] border border-violet-900/30 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-[#1a1a2e] border border-violet-900/30 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-600 transition-colors"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-900/20 border border-rose-700/40 text-rose-400 text-sm">
            <svg width="16" height="16" className="flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-violet-700 text-white font-semibold text-sm hover:bg-violet-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
