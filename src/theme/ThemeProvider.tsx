import { createContext, PropsWithChildren, useContext } from 'react';

const light = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#171717',
  muted: '#737373',
  border: '#E5E5E5',
  primary: '#111111',
  userBubble: '#F0F0F0',
};

const ThemeContext = createContext({ colors: light });

export function ThemeProvider({ children }: PropsWithChildren) {
  return <ThemeContext.Provider value={{ colors: light }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
