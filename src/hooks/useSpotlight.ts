'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { searchCommands, searchEntities, SpotlightCommand } from '@/lib/ux/commands';
import { postUiEvent } from '@/lib/ux/shortcuts';

const RECENT_COMMANDS_KEY = 'adaf-spotlight-recent';
const MAX_RECENT_COMMANDS = 5;

interface UseSpotlightOptions {
  onClose?: () => void;
}

export function useSpotlight(options?: UseSpotlightOptions) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [entityResults, setEntityResults] = useState<SpotlightCommand[]>([]);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Load recent commands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      if (stored) {
        setRecentCommands(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save recent commands to localStorage
  const saveRecentCommand = useCallback((commandId: string) => {
    setRecentCommands(prev => {
      const newRecent = [commandId, ...prev.filter(id => id !== commandId)].slice(0, MAX_RECENT_COMMANDS);
      try {
        localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(newRecent));
      } catch {
        // Ignore localStorage errors
      }
      return newRecent;
    });
  }, []);

  // Open spotlight
  const openSpotlight = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    setEntityResults([]);
    postUiEvent('Spotlight', 'Open');
  }, []);

  // Close spotlight
  const closeSpotlight = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
    setEntityResults([]);
    options?.onClose?.();
  }, [options]);

  // Search entities with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setEntityResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const entities = await searchEntities(query.trim());
        setEntityResults(entities);
      } catch (error) {
        console.warn('Entity search failed:', error);
        setEntityResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Get all commands (static + entity results)
  const allCommands = useMemo(() => {
    const staticCommands = searchCommands(query);
    
    // If no query, prioritize recent commands
    if (!query.trim()) {
      const recentStaticCommands = staticCommands.filter(cmd => 
        recentCommands.includes(cmd.id)
      ).sort((a, b) => {
        const aIndex = recentCommands.indexOf(a.id);
        const bIndex = recentCommands.indexOf(b.id);
        return aIndex - bIndex;
      });
      
      const otherCommands = staticCommands.filter(cmd => 
        !recentCommands.includes(cmd.id)
      );
      
      return [...recentStaticCommands, ...otherCommands];
    }
    
    // Merge static and entity results, sort by score
    return [...staticCommands, ...entityResults]
      .sort((a, b) => {
        const aScore = (('score' in a ? a.score : undefined) as number) || (a.priority || 50) / 100;
        const bScore = (('score' in b ? b.score : undefined) as number) || (b.priority || 50) / 100;
        return bScore - aScore;
      })
      .slice(0, 10);
  }, [query, entityResults, recentCommands]);

  // Execute command
  const executeCommand = useCallback(async (command: SpotlightCommand) => {
    postUiEvent('Spotlight', 'Execute', { cmdId: command.id, action: command.action });
    saveRecentCommand(command.id);
    closeSpotlight();

    try {
      switch (command.action) {
        case 'navigate':
          router.push(command.payload as string);
          break;

        case 'run-worker':
          if (window.confirm('Run background worker once? This may affect system performance briefly.')) {
            await fetch('/api/ops/worker/run', { method: 'POST' });
          }
          break;

        case 'generate-report':
          const reportType = command.payload as string;
          await fetch(`/api/generate/report/${reportType}`, { method: 'POST' });
          break;

        case 'new-backtest':
          router.push('/research?new=true');
          break;

        case 'run-alerts':
          await fetch('/api/ops/alerts/run-all', { method: 'POST' });
          break;

        case 'show-shortcuts':
          window.dispatchEvent(new CustomEvent('help:show', { detail: 'shortcuts' }));
          break;

        case 'open-url':
          if (command.payload) {
            if (command.url) {
              window.open(command.url, '_blank');
            } else {
              router.push(command.payload as string);
            }
          }
          break;

        case 'view-alert':
          router.push(`/alerts/${command.payload}`);
          break;

        case 'view-report':
          router.push(`/reports/${command.payload}`);
          break;

        case 'view-opportunity':
          router.push(`/opx/${command.payload}`);
          break;

        case 'view-lineage':
          router.push(`/lineage?hash=${command.payload}`);
          break;

        default:
          console.warn('Unknown command action:', command.action);
          break;
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
      // Could show a toast notification here
    }
  }, [router, saveRecentCommand, closeSpotlight]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeSpotlight();
        break;

      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < allCommands.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;

      case 'Enter':
        event.preventDefault();
        if (allCommands[selectedIndex]) {
          executeCommand(allCommands[selectedIndex]);
        }
        break;

      case 'Tab':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < allCommands.length - 1 ? prev + 1 : 0
        );
        break;
    }
  }, [isOpen, allCommands, selectedIndex, executeCommand, closeSpotlight]);

  // Listen for global events
  useEffect(() => {
    const handleSpotlightOpen = () => openSpotlight();
    
    window.addEventListener('spotlight:open', handleSpotlightOpen);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('spotlight:open', handleSpotlightOpen);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openSpotlight, handleKeyDown]);

  // Reset selected index when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allCommands]);

  return {
    isOpen,
    query,
    selectedIndex,
    isLoading,
    commands: allCommands,
    openSpotlight,
    closeSpotlight,
    setQuery,
    setSelectedIndex,
    executeCommand,
  };
}