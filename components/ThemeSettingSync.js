import { useSetting } from '@/hooks/use-settings';
import { ThemeContext } from '@/hooks/useTheme';
import { useContext, useEffect, useRef } from 'react';

export const THEME_SETTING_KEY = 'app_theme_preference';

/**
 * Rendered inside DB/Query providers. Loads the saved theme preference from
 * SQLite on startup and writes changes back when the user updates the setting.
 * Renders nothing — purely a side-effect component.
 */
export default function ThemeSettingSync() {
  const { setThemePreference } = useContext(ThemeContext);
  const { value: savedTheme } = useSetting(THEME_SETTING_KEY);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    if (savedTheme === undefined || savedTheme === null) return;

    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      hasLoaded.current = true;
      setThemePreference(savedTheme);
    }
  }, [savedTheme, setThemePreference]);

  return null;
}
