import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibrary } from '../store/library';
import { OptimizedImage } from './OptimizedImage';
import { toast } from './Toast';
import type { CustomGamePayload } from '../store/library';

interface Props {
  onClose: () => void;
}

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CoverFallback = () => (
  <div className="w-full h-full flex items-center justify-center text-slate-700" style={{ background: '#0f0f1a' }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="5" />
      <path d="M8 12h4M10 10v4" />
      <circle cx="16" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="18" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  </div>
);

const CURRENT_YEAR = new Date().getFullYear();

export function ManualGameForm({ onClose }: Props) {
  const addCustomGame = useLibrary(s => s.addCustomGame);

  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [platform, setPlatform] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [nameError, setNameError] = useState('');
  const [yearError, setYearError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const coverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleCoverChange = (val: string) => {
    setCoverUrl(val);
    if (coverDebounceRef.current) clearTimeout(coverDebounceRef.current);
    coverDebounceRef.current = setTimeout(() => {
      setPreviewUrl(val.trim());
      setPreviewKey(k => k + 1);
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Nome do jogo é obrigatório');
      nameRef.current?.focus();
      return;
    }
    setNameError('');
    const yearNum = year ? parseInt(year, 10) : 0;
    if (year && (Number.isNaN(yearNum) || yearNum < 1970 || yearNum > CURRENT_YEAR + 5)) {
      setYearError(`Ano deve ser entre 1970 e ${CURRENT_YEAR + 5}`);
      return;
    }
    setYearError('');
    setSubmitting(true);
    try {
      const payload: CustomGamePayload = {
        name: trimmedName,
        coverUrl: previewUrl || null,
        released: Number.isNaN(yearNum) ? 0 : yearNum,
        platforms: platform.trim() ? [platform.trim()] : [],
      };
      await addCustomGame(payload);
      toast.success(`"${trimmedName}" adicionado à biblioteca`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar o jogo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{ background: '#1a1a2e', borderTop: '1px solid rgba(124,58,237,0.3)', maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Adicionar manualmente</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="px-5 pt-2 pb-4 space-y-4 overflow-y-auto overscroll-contain flex-1">

            {/* Cover preview + URL */}
            <div className="flex gap-3 items-start">
              <div
                className="w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-slate-800"
                style={{ background: '#0f0f1a' }}
              >
                <OptimizedImage
                  key={previewKey}
                  src={previewUrl || null}
                  alt="Pré-visualização da capa"
                  fallback={<CoverFallback />}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="text-xs text-slate-500 block">URL da Capa</label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={e => handleCoverChange(e.target.value)}
                  placeholder="https://..."
                  inputMode="url"
                  autoComplete="off"
                  maxLength={500}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  style={{ background: '#0f0f1a', border: '1px solid #1e293b' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1e293b')}
                />
                <p className="text-[11px] text-slate-600 leading-tight">
                  Opcional · preview ao parar de digitar
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium block">
                Nome do Jogo{' '}
                <span className="text-rose-400">*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); if (nameError) setNameError(''); }}
                placeholder="Ex: The Legend of Zelda"
                maxLength={120}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                style={{
                  background: '#0f0f1a',
                  border: `1px solid ${nameError ? 'rgba(239,68,68,0.5)' : '#1e293b'}`,
                }}
                onFocus={e => {
                  if (!nameError) e.currentTarget.style.borderColor = '#7c3aed';
                }}
                onBlur={e => {
                  if (!nameError) e.currentTarget.style.borderColor = '#1e293b';
                }}
              />
              <AnimatePresence>
                {nameError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="text-xs text-rose-400"
                  >
                    {nameError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Year + Platform */}
            <div className="flex gap-3">
              <div className="w-28 space-y-1">
                <label className="text-xs text-slate-400 block">Ano</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => { setYear(e.target.value); if (yearError) setYearError(''); }}
                  placeholder={String(CURRENT_YEAR)}
                  min={1970}
                  max={CURRENT_YEAR + 5}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  style={{ background: '#0f0f1a', border: `1px solid ${yearError ? 'rgba(239,68,68,0.5)' : '#1e293b'}` }}
                  onFocus={e => { if (!yearError) e.currentTarget.style.borderColor = '#7c3aed'; }}
                  onBlur={e => { if (!yearError) e.currentTarget.style.borderColor = '#1e293b'; }}
                />
                <AnimatePresence>
                  {yearError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.14 }}
                      className="text-[11px] text-rose-400 leading-tight"
                    >
                      {yearError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <label className="text-xs text-slate-400 block">Plataforma</label>
                <input
                  type="text"
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  placeholder="PC, PS5, Switch…"
                  maxLength={40}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  style={{ background: '#0f0f1a', border: '1px solid #1e293b' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1e293b')}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-8 border-t border-slate-800/50">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full mt-4 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: '#7c3aed' }}
              onMouseEnter={e => { if (!submitting && name.trim()) e.currentTarget.style.background = '#6d28d9'; }}
              onMouseLeave={e => (e.currentTarget.style.background = '#7c3aed')}
            >
              {submitting
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Adicionar à biblioteca'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
