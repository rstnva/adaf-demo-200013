'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Utility to detect OS for correct modifier key display
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
export const modifierKey = isMac ? '⌘' : 'Ctrl';
export const modifierKeyCode = isMac ? 'metaKey' : 'ctrlKey';

// Hotkey definitions
export interface Hotkey {
  key: string;
  modifiers: string[];
  description: string;
  action: string;
  context?: string;
  preventDefault?: boolean;
}

export const globalHotkeys: Hotkey[] = [
  // Navigation shortcuts
  { key: 'k', modifiers: [modifierKeyCode], description: 'Open Spotlight Search', action: 'spotlight:open', preventDefault: true },
  { key: 'j', modifiers: [modifierKeyCode], description: 'Toggle Theme', action: 'theme:toggle', preventDefault: true },
  { key: 'r', modifiers: [modifierKeyCode], description: 'Run Worker (with confirmation)', action: 'worker:run', preventDefault: true },
  { key: '?', modifiers: [], description: 'Show Keyboard Shortcuts Help', action: 'help:shortcuts', preventDefault: true },

  // Go-to shortcuts (g + letter)
  { key: 'g', modifiers: [], description: 'Go to... (press g then:', action: 'goto:prepare', context: 'global' },
  
  // Dashboard card focus (accessibility)
  { key: '1', modifiers: [modifierKeyCode], description: 'Focus Top Strip (KPIs)', action: 'focus:kpi-strip', preventDefault: true },
  { key: '2', modifiers: [modifierKeyCode], description: 'Focus ETF Autoswitch Card', action: 'focus:etf-card', preventDefault: true },
  { key: '3', modifiers: [modifierKeyCode], description: 'Focus Research Card', action: 'focus:research-card', preventDefault: true },
  { key: '4', modifiers: [modifierKeyCode], description: 'Focus OP-X Card', action: 'focus:opx-card', preventDefault: true },
  { key: '5', modifiers: [modifierKeyCode], description: 'Focus Reports Card', action: 'focus:reports-card', preventDefault: true },
  { key: '6', modifiers: [modifierKeyCode], description: 'Focus Risk Card', action: 'focus:risk-card', preventDefault: true },
  { key: '7', modifiers: [modifierKeyCode], description: 'Focus DQP Card', action: 'focus:dqp-card', preventDefault: true },
];

// Context-specific hotkeys (Research)
export const researchHotkeys: Hotkey[] = [
  { key: 'Enter', modifiers: [modifierKeyCode], description: 'Run Backtest', action: 'research:run', context: 'research', preventDefault: true },
  { key: 's', modifiers: [modifierKeyCode], description: 'Save Config Preset', action: 'research:save', context: 'research', preventDefault: true },
  { key: 'c', modifiers: ['shiftKey'], description: 'Create Snapshot', action: 'research:snapshot', context: 'research', preventDefault: true },
];

// Go-to navigation map
export const gotoMap: Record<string, { route: string; description: string }> = {
  'm': { route: '/markets', description: 'Markets' },
  'o': { route: '/onchain', description: 'On-Chain Analytics' },
  'd': { route: '/derivatives', description: 'Derivatives' },
  'n': { route: '/news', description: 'News & Research' },
  'r': { route: '/research', description: 'Research Hub' },
  'a': { route: '/academy', description: 'Academy' },
  'x': { route: '/opx', description: 'OP-X Opportunities' },
  'p': { route: '/reports', description: 'Reports' },
  'q': { route: '/dqp', description: 'Data Quality' },
  'l': { route: '/lineage', description: 'Data Lineage' },
  'c': { route: '/control', description: 'Control Panel' },
  'h': { route: '/', description: 'Home Dashboard' },
};

// Telemetry function (to be implemented)
export const postUiEvent = (category: string, action: string, context?: Record<string, unknown>) => {
  try {
    fetch('/api/metrics/ui/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        action,
        context,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail for telemetry - don't break UX
    });
  } catch {
    // Silently fail for telemetry
  }
};

// Main hotkey hook
export function useHotkeys(context: string = 'global', onAction?: (action: string, data?: unknown) => void) {
  const router = useRouter();
  const gotoModeRef = useRef(false);
  const gotoTimeoutRef = useRef<number | null>(null);

  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isEditable = activeElement.getAttribute('contenteditable') === 'true';
    const isInput = ['input', 'textarea', 'select'].includes(tagName);
    
    return isInput || isEditable;
  }, []);

  const executeAction = useCallback((action: string, data?: unknown) => {
    // Post telemetry
    postUiEvent('Hotkey', action, { context, data });

    // Handle built-in actions
    switch (action) {
      case 'spotlight:open':
        // This will be handled by the spotlight component
        window.dispatchEvent(new CustomEvent('spotlight:open'));
        break;

      case 'theme:toggle':
        // Toggle theme by dispatching custom event that the theme provider can listen to
        window.dispatchEvent(new CustomEvent('theme:toggle'));
        break;

      case 'worker:run':
        // Show confirmation modal
        if (window.confirm('Run background worker once? This may affect system performance briefly.')) {
          fetch('/api/ops/worker/run', { method: 'POST' })
            .then(() => {
              // Could show a toast here
            })
            .catch(() => {
              alert('Failed to run worker. Check console for details.');
            });
        }
        break;

      case 'help:shortcuts':
        // This will be handled by a help modal
        window.dispatchEvent(new CustomEvent('help:show', { detail: 'shortcuts' }));
        break;

      case 'goto:prepare':
        gotoModeRef.current = true;
        // Clear any existing timeout
        if (gotoTimeoutRef.current) {
          clearTimeout(gotoTimeoutRef.current);
        }
        // Exit goto mode after 2 seconds
        gotoTimeoutRef.current = window.setTimeout(() => {
          gotoModeRef.current = false;
        }, 2000);
        break;

      // Focus actions (accessibility)
      case 'focus:kpi-strip':
        document.getElementById('kpi-strip')?.focus();
        break;
      case 'focus:etf-card':
        document.getElementById('etf-autoswitch-card')?.focus();
        break;
      case 'focus:research-card':
        document.getElementById('research-card')?.focus();
        break;
      case 'focus:opx-card':
        document.getElementById('opx-card')?.focus();
        break;
      case 'focus:reports-card':
        document.getElementById('reports-card')?.focus();
        break;
      case 'focus:risk-card':
        document.getElementById('risk-card')?.focus();
        break;
      case 'focus:dqp-card':
        document.getElementById('dqp-card')?.focus();
        break;

      default:
        // Pass to custom handler if provided
        onAction?.(action, data);
        break;
    }
  }, [onAction, context]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if input is focused
    if (isInputFocused()) {
      return;
    }

    const key = event.key.toLowerCase();

    // Handle goto mode
    if (gotoModeRef.current) {
      const gotoTarget = gotoMap[key];
      if (gotoTarget) {
        event.preventDefault();
        gotoModeRef.current = false;
        if (gotoTimeoutRef.current) {
          clearTimeout(gotoTimeoutRef.current);
        }
        postUiEvent('Navigation', 'Goto', { route: gotoTarget.route, key });
        router.push(gotoTarget.route);
        return;
      }
      // Invalid goto key, exit goto mode
      gotoModeRef.current = false;
      return;
    }

    // Check global hotkeys
    const allHotkeys = [...globalHotkeys, ...(context === 'research' ? researchHotkeys : [])];
    
    for (const hotkey of allHotkeys) {
      if (hotkey.key.toLowerCase() === key) {
        // Check modifiers
        const hasRequiredModifiers = hotkey.modifiers.every(modifier => {
          switch (modifier) {
            case 'ctrlKey':
              return event.ctrlKey;
            case 'metaKey':
              return event.metaKey;
            case 'altKey':
              return event.altKey;
            case 'shiftKey':
              return event.shiftKey;
            default:
              return false;
          }
        });

        // Check that no extra modifiers are pressed (except for single key shortcuts)
        const extraModifiers = (
          (hotkey.modifiers.includes('ctrlKey') ? 0 : (event.ctrlKey ? 1 : 0)) +
          (hotkey.modifiers.includes('metaKey') ? 0 : (event.metaKey ? 1 : 0)) +
          (hotkey.modifiers.includes('altKey') ? 0 : (event.altKey ? 1 : 0)) +
          (hotkey.modifiers.includes('shiftKey') ? 0 : (event.shiftKey ? 1 : 0))
        );

        if (hasRequiredModifiers && extraModifiers === 0) {
          if (hotkey.preventDefault) {
            event.preventDefault();
          }
          executeAction(hotkey.action);
          break;
        }
      }
    }
  }, [isInputFocused, executeAction, router, context]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (gotoTimeoutRef.current) {
        clearTimeout(gotoTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gotoTimeoutRef.current) {
        clearTimeout(gotoTimeoutRef.current);
      }
    };
  }, []);

  return {
    executeAction,
    modifierKey,
    isGotoMode: gotoModeRef.current,
  };
}

// Helper function to format hotkey display
export function formatHotkey(hotkey: Hotkey): string {
  const modifiers = hotkey.modifiers.map(mod => {
    switch (mod) {
      case 'ctrlKey':
        return isMac ? '⌘' : 'Ctrl';
      case 'metaKey':
        return '⌘';
      case 'altKey':
        return isMac ? '⌥' : 'Alt';
      case 'shiftKey':
        return 'Shift';
      default:
        return mod;
    }
  });

  return [...modifiers, hotkey.key.toUpperCase()].join(isMac ? '' : '+');
}