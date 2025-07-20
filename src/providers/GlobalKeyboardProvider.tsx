'use client';

import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboard';

export function GlobalKeyboardProvider({ children }: { children: React.ReactNode }) {
  useGlobalKeyboardShortcuts();
  return <>{children}</>;
}