'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function useGlobalKeyboardShortcuts() {
  const { toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Theme toggle: Ctrl/Cmd + Shift + T
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        toggleTheme();
        return;
      }

      // Add more global shortcuts here as needed
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleTheme]);
}