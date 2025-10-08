'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { modifierKey } from '@/lib/ux/shortcuts';

interface HotkeyHintProps {
  keys: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'accent';
}

export const HotkeyHint = forwardRef<HTMLSpanElement, HotkeyHintProps>(
  ({ keys, className, size = 'sm', variant = 'default' }, ref) => {
    const sizeClasses = {
      sm: 'text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5',
      md: 'text-sm px-2 py-1 min-w-[1.5rem] h-6',
      lg: 'text-base px-2.5 py-1.5 min-w-[2rem] h-8',
    };

    const variantClasses = {
      default: 'bg-muted text-muted-foreground border-border',
      muted: 'bg-muted/50 text-muted-foreground/70 border-muted-foreground/20',
      accent: 'bg-accent/10 text-accent-foreground border-accent/30',
    };

    return (
      <span 
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1',
          className
        )}
        role="presentation"
        aria-label={`Keyboard shortcut: ${keys.join(' ')}`}
      >
        {keys.map((key, index) => (
          <kbd
            key={index}
            className={cn(
              'inline-flex items-center justify-center rounded border font-mono font-medium',
              sizeClasses[size],
              variantClasses[variant]
            )}
            aria-hidden="true"
          >
            {key === 'Cmd' ? modifierKey : key}
          </kbd>
        ))}
      </span>
    );
  }
);

HotkeyHint.displayName = 'HotkeyHint';

// Helper component for common patterns
interface QuickHintProps {
  shortcut: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'accent';
}

export function QuickHint({ shortcut, className, size, variant }: QuickHintProps) {
  // Parse common shortcut patterns
  const keys = shortcut
    .replace('Cmd', modifierKey)
    .replace('Ctrl', modifierKey)
    .split('+')
    .map(k => k.trim());
  
  return <HotkeyHint keys={keys} className={className} size={size} variant={variant} />;
}

// Common hotkey combinations as constants
export const HOTKEY_HINTS = {
  spotlight: ['Cmd', 'K'],
  theme: ['Cmd', 'J'], 
  runWorker: ['Cmd', 'R'],
  help: ['?'],
  backtest: ['Cmd', 'Enter'],
  save: ['Cmd', 'S'],
  snapshot: ['Shift', 'C'],
  goto: ['g', '...'],
} as const;