import React, { createContext, useCallback, useContext, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  themePreference: 'system',
  setThemePreference: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme() ?? 'light';
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
  }, []);

  const colorScheme: ColorScheme =
    themePreference === 'system' ? systemColorScheme : themePreference;

  return (
    <ThemeContext.Provider value={{ colorScheme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
