import { create } from 'zustand';

type PrefKey = 'memory' | 'improve' | 'chatHistory';

type State = {
  memory: boolean;
  improve: boolean;
  chatHistory: boolean;
  set: (key: PrefKey, value: boolean) => void;
};

export const usePreferences = create<State>((set) => ({
  memory: true,
  improve: true,
  chatHistory: true,
  set: (key, value) => set({ [key]: value } as Partial<State>),
}));
