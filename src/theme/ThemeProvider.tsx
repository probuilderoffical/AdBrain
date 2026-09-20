import { createContext, PropsWithChildren, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { usePreferences } from '@/store/preferences';

const light = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#171717',
  muted: '#737373',
  border: '#E5E5E5',
  primary: '#111111',
  userBubble: '#F0F0F0',
};

const dark = {
  background: '#101010',
  card: '#191919',
  text: '#F5F5F5',
  muted: '#A3A3A3',
  border: '#2A2A2A',
  primary: '#F5F5F5',
  userBubble: '#242424',
};

const ThemeContext = createContext({ colors: light, isDark: false });

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const mode = usePreferences((state) => state.themeMode);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return (
    <ThemeContext.Provider value={{ colors: isDark ? dark : light, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
