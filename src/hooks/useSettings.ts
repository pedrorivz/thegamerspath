import { create } from 'zustand';

const STORAGE_KEY = 'tgp-settings';

interface Settings {
  useOllama: boolean;
}

interface SettingsState {
  settings: Settings;
  setUseOllama: (value: boolean) => void;
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { useOllama: false, ...JSON.parse(raw) as Partial<Settings> } : { useOllama: false };
  } catch {
    return { useOllama: false };
  }
}

export const useSettings = create<SettingsState>((set) => ({
  settings: load(),
  setUseOllama: (value) => {
    set(s => {
      const next = { ...s.settings, useOllama: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { settings: next };
    });
  },
}));
