'use client';

import { postUiEvent } from '@/lib/ux/shortcuts';

export interface SnapshotConfig {
  agents: string[];
  rules: Array<{
    id: string;
    expression: string;
    weight: number;
    enabled: boolean;
  }>;
  tradingParams: {
    maxPositionSize: number;
    slippageBps: number;
    feesBps: number;
    timeframe: string;
    lookback: string;
  };
  riskParams: {
    maxDrawdown: number;
    stopLoss: number;
    positionSizing: string;
  };
}

export interface SnapshotResults {
  pnlPercent: number;
  sharpe: number;
  maxDrawdown: number;
  hitRate: number;
  volatility: number;
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  calmarRatio: number;
  sortinoRatio: number;
}

export interface ResearchSnapshot {
  id: string;
  name: string;
  createdAt: string;
  config: SnapshotConfig;
  results: SnapshotResults;
  tags: string[];
  isPinned?: boolean;
  runId?: string; // Reference to original backtest run
}

const SNAPSHOTS_STORAGE_KEY = 'adaf-research-snapshots';
const MAX_SNAPSHOTS = 50;

// Local storage utilities with error handling
function getStoredSnapshots(): ResearchSnapshot[] {
  try {
    const stored = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load snapshots from localStorage:', error);
    return [];
  }
}

function saveStoredSnapshots(snapshots: ResearchSnapshot[]): void {
  try {
    // Keep only the most recent snapshots
    const trimmed = snapshots
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_SNAPSHOTS);
    
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Failed to save snapshots to localStorage:', error);
  }
}

// Generate unique snapshot ID
function generateSnapshotId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new snapshot
export function createSnapshot(
  name: string,
  config: SnapshotConfig,
  results: SnapshotResults,
  tags: string[] = []
): ResearchSnapshot {
  const snapshot: ResearchSnapshot = {
    id: generateSnapshotId(),
    name: name.trim() || `Snapshot ${new Date().toLocaleDateString()}`,
    createdAt: new Date().toISOString(),
    config,
    results,
    tags: tags.map(tag => tag.trim()).filter(Boolean),
  };

  // Add to storage
  const existing = getStoredSnapshots();
  const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
  saveStoredSnapshots(updated);

  // Track telemetry
  postUiEvent('Research', 'SnapshotCreate', {
    snapshotId: snapshot.id,
    tags: snapshot.tags,
    pnl: results.pnlPercent,
  });

  return snapshot;
}

// Get all snapshots
export function getAllSnapshots(): ResearchSnapshot[] {
  return getStoredSnapshots();
}

// Get snapshot by ID
export function getSnapshotById(id: string): ResearchSnapshot | null {
  const snapshots = getStoredSnapshots();
  return snapshots.find(snap => snap.id === id) || null;
}

// Update snapshot (e.g., toggle pin, update name/tags)
export function updateSnapshot(id: string, updates: Partial<Pick<ResearchSnapshot, 'name' | 'tags' | 'isPinned'>>): boolean {
  const snapshots = getStoredSnapshots();
  const index = snapshots.findIndex(snap => snap.id === id);
  
  if (index === -1) return false;

  // Apply updates
  snapshots[index] = {
    ...snapshots[index],
    ...updates,
    // Sanitize inputs
    name: updates.name?.trim() || snapshots[index].name,
    tags: updates.tags?.map(tag => tag.trim()).filter(Boolean) || snapshots[index].tags,
  };

  saveStoredSnapshots(snapshots);
  
  postUiEvent('Research', 'SnapshotUpdate', {
    snapshotId: id,
    updates: Object.keys(updates),
  });

  return true;
}

// Delete snapshot
export function deleteSnapshot(id: string): boolean {
  const snapshots = getStoredSnapshots();
  const filtered = snapshots.filter(snap => snap.id !== id);
  
  if (filtered.length === snapshots.length) {
    return false; // Snapshot not found
  }

  saveStoredSnapshots(filtered);
  
  postUiEvent('Research', 'SnapshotDelete', { snapshotId: id });
  
  return true;
}

// Get snapshots with filtering and sorting
export interface SnapshotFilters {
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  minPnl?: number;
  maxPnl?: number;
  sortBy?: 'date' | 'pnl' | 'sharpe' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export function getFilteredSnapshots(filters: SnapshotFilters = {}): ResearchSnapshot[] {
  let snapshots = getStoredSnapshots();

  // Apply filters
  if (filters.tags?.length) {
    snapshots = snapshots.filter(snap =>
      filters.tags!.some(tag => snap.tags.includes(tag))
    );
  }

  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    snapshots = snapshots.filter(snap => new Date(snap.createdAt) >= fromDate);
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    snapshots = snapshots.filter(snap => new Date(snap.createdAt) <= toDate);
  }

  if (filters.minPnl !== undefined) {
    snapshots = snapshots.filter(snap => snap.results.pnlPercent >= filters.minPnl!);
  }

  if (filters.maxPnl !== undefined) {
    snapshots = snapshots.filter(snap => snap.results.pnlPercent <= filters.maxPnl!);
  }

  // Apply sorting
  const sortBy = filters.sortBy || 'date';
  const sortOrder = filters.sortOrder || 'desc';

  snapshots.sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortBy) {
      case 'date':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'pnl':
        aValue = a.results.pnlPercent;
        bValue = b.results.pnlPercent;
        break;
      case 'sharpe':
        aValue = a.results.sharpe;
        bValue = b.results.sharpe;
        break;
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    }

    return 0;
  });

  return snapshots;
}

// Export snapshots as JSON
export function exportSnapshots(snapshotIds?: string[]): string {
  let snapshots = getStoredSnapshots();
  
  if (snapshotIds?.length) {
    snapshots = snapshots.filter(snap => snapshotIds.includes(snap.id));
  }

  return JSON.stringify(snapshots, null, 2);
}

// Import snapshots from JSON
export function importSnapshots(jsonData: string): { success: number; errors: string[] } {
  const result = { success: 0, errors: [] as string[] };

  try {
    const imported = JSON.parse(jsonData);
    if (!Array.isArray(imported)) {
      result.errors.push('Invalid format: expected array of snapshots');
      return result;
    }

    const existing = getStoredSnapshots();

    imported.forEach((item, index) => {
      try {
        // Validate required fields
        if (!item.id || !item.name || !item.config || !item.results) {
          result.errors.push(`Snapshot ${index}: missing required fields`);
          return;
        }

        // Generate new ID to avoid conflicts
        const snapshot: ResearchSnapshot = {
          ...item,
          id: generateSnapshotId(),
          createdAt: item.createdAt || new Date().toISOString(),
          tags: Array.isArray(item.tags) ? item.tags : [],
        };

        existing.unshift(snapshot);
        result.success++;
      } catch (error) {
        result.errors.push(`Snapshot ${index}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    });

    if (result.success > 0) {
      saveStoredSnapshots(existing);
      postUiEvent('Research', 'SnapshotImport', {
        count: result.success,
        errors: result.errors.length,
      });
    }
  } catch (error) {
    result.errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  return result;
}

// Get all unique tags from snapshots
export function getAllTags(): string[] {
  const snapshots = getStoredSnapshots();
  const allTags = snapshots.flatMap(snap => snap.tags);
  return Array.from(new Set(allTags)).sort();
}

// Compare snapshots utility
export interface SnapshotComparison {
  snapshots: ResearchSnapshot[];
  metrics: {
    metric: keyof SnapshotResults;
    label: string;
    format: 'percent' | 'number' | 'ratio';
  }[];
}

export function createComparison(snapshotIds: string[]): SnapshotComparison | null {
  const snapshots = snapshotIds
    .map(id => getSnapshotById(id))
    .filter((snap): snap is ResearchSnapshot => snap !== null);

  if (snapshots.length === 0) return null;

  return {
    snapshots,
    metrics: [
      { metric: 'pnlPercent', label: 'Total Return', format: 'percent' },
      { metric: 'sharpe', label: 'Sharpe Ratio', format: 'ratio' },
      { metric: 'maxDrawdown', label: 'Max Drawdown', format: 'percent' },
      { metric: 'hitRate', label: 'Hit Rate', format: 'percent' },
      { metric: 'volatility', label: 'Volatility', format: 'percent' },
      { metric: 'totalTrades', label: 'Total Trades', format: 'number' },
      { metric: 'winRate', label: 'Win Rate', format: 'percent' },
      { metric: 'profitFactor', label: 'Profit Factor', format: 'ratio' },
      { metric: 'calmarRatio', label: 'Calmar Ratio', format: 'ratio' },
      { metric: 'sortinoRatio', label: 'Sortino Ratio', format: 'ratio' },
    ],
  };
}