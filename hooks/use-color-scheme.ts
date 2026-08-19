import { useContext } from 'react';
import { ThemeContext } from './useTheme';

export function useColorScheme() {
  const { colorScheme } = useContext(ThemeContext);
  return colorScheme;
}
