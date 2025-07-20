'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const setLightTheme = () => {
    setTheme('light');
  };

  const setDarkTheme = () => {
    setTheme('dark');
  };

  const setSystemTheme = () => {
    setTheme('system');
  };

  return {
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    mounted,
    isDark: mounted ? resolvedTheme === 'dark' : false,
    isLight: mounted ? resolvedTheme === 'light' : false,
    isSystem: theme === 'system',
  };
}