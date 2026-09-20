import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { usePreferences } from '@/store/preferences';
import { initializeDatabase } from '@/db/database';

function AppShell() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const hydrate = usePreferences((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
    void initializeDatabase();
  }, [hydrate]);

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
