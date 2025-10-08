'use client';

import { ReactNode } from 'react';
import { useHotkeys } from '@/lib/ux/shortcuts';

interface HotkeyProviderProps {
  children: ReactNode;
  context?: string;
}

export function HotkeyProvider({ children, context = 'global' }: HotkeyProviderProps) {
  // Initialize global hotkeys
  useHotkeys(context);
  
  return <>{children}</>;
}