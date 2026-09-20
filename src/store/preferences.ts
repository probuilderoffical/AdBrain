import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
type BoolKey = 'memory' | 'improve' | 'chatHistory';

type State = {
  memory: boolean;
  improve: boolean;
  chatHistory: boolean;
  themeMode: ThemeMode;
  hydrated: boolean;
  setBool: (key: BoolKey, value: boolean) => void;
  setThemeMode: (value: ThemeMode) => void;
  hydrate: () => Promise<void>;
};

const KEY = 'adbrain.preferences.v1';

export const usePreferences = create<State>((set, get) => ({
  memory: true,
  improve: true,
  chatHistory: true,
  themeMode: 'light',
  hydrated: false,

  setBool: (key, value) => {
    set({ [key]: value } as Partial<State>);
    const next = { ...get(), [key]: value };
    void AsyncStorage.setItem(KEY, JSON.stringify({
      memory: next.memory,
      improve: next.improve,
      chatHistory: next.chatHistory,
      themeMode: next.themeMode,
    }));
  },

  setThemeMode: (value) => {
    set({ themeMode: value });
    const next = { ...get(), themeMode: value };
    void AsyncStorage.setItem(KEY, JSON.stringify({
      memory: next.memory,
      improve: next.improve,
      chatHistory: next.chatHistory,
      themeMode: next.themeMode,
    }));
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) set({ ...JSON.parse(raw), hydrated: true });
      else set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));
