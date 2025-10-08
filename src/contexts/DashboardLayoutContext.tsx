"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

type RBACContextValue = {
  hasPermission: (perm: string) => boolean;
  userId?: string;
  permissions: string[];
};

const RBACContext = createContext<RBACContextValue>({
  hasPermission: () => true,
  permissions: [],
});

export function RBACProvider({ children, permissions = [], userId }: { children: React.ReactNode; permissions?: string[]; userId?: string }) {
  const value: RBACContextValue = {
    permissions,
    userId,
    hasPermission: (perm: string) => permissions.includes(perm),
  };
  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  return useContext(RBACContext);
}
import { arrayMove } from '@dnd-kit/sortable';

export interface DashboardItem {
  id: string;
  component: string;
  span: number; // Grid column span (1-12)
  order: number;
}

interface DashboardLayoutContextType {
  items: DashboardItem[];
  moveItem: (activeId: string, overId: string) => void;
  reorderItems: (newItems: DashboardItem[]) => void;
  resetLayout: () => void;
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | undefined>(undefined);

// Default dashboard layout
const DEFAULT_LAYOUT: DashboardItem[] = [
  // Fila 1: KPIs Principales (12 cols)
  { id: 'kpi-strip', component: 'KpiStrip', span: 12, order: 0 },
  
  // Fila 2: Resumen de Mercados - Flujos ETF + Comparativo
  { id: 'etf-autoswitch', component: 'EtfAutoswitchCard', span: 8, order: 1 },
  { id: 'etf-compare-mini', component: 'EtfCompareMini', span: 4, order: 2 },
  
  // Fila 3: On-chain & TVL
  { id: 'funding-snapshot', component: 'FundingSnapshotCard', span: 6, order: 3 },
  { id: 'tvl-heatmap', component: 'TvlHeatmapCard', span: 6, order: 4 },
  
  // Fila 4: Noticias & Regulatorio + Salud DQP
  { id: 'news-reg-panel', component: 'NewsRegPanel', span: 8, order: 5 },
  { id: 'dqp-health', component: 'DqpHealthCard', span: 4, order: 6 },
  
  // Fila 5: Alertas + OP-X + Guardrails
  { id: 'alerts-live', component: 'AlertsLiveCard', span: 4, order: 7 },
  { id: 'opx-top-scores', component: 'OpxTopScores', span: 4, order: 8 },
  { id: 'guardrails', component: 'GuardrailsCard', span: 4, order: 9 },
  
  // Research Panel (span completo)  
  { id: 'research-panel', component: 'ResearchPanel', span: 12, order: 10 },
];

export function DashboardLayoutProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<DashboardItem[]>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-layout');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_LAYOUT;
        }
      }
    }
    return DEFAULT_LAYOUT;
  });
  
  const [isEditMode, setIsEditMode] = useState(false);

  const saveLayout = useCallback((newItems: DashboardItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-layout', JSON.stringify(newItems));
    }
  }, []);

  const moveItem = useCallback((activeId: string, overId: string) => {
    setItems((items) => {
      const oldIndex = items.findIndex(item => item.id === activeId);
      const newIndex = items.findIndex(item => item.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index
        }));
        saveLayout(reorderedItems);
        return reorderedItems;
      }
      
      return items;
    });
  }, [saveLayout]);

  const reorderItems = useCallback((newItems: DashboardItem[]) => {
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }));
    setItems(reorderedItems);
    saveLayout(reorderedItems);
  }, [saveLayout]);

  const resetLayout = useCallback(() => {
    setItems(DEFAULT_LAYOUT);
    saveLayout(DEFAULT_LAYOUT);
  }, [saveLayout]);

  const setEditMode = useCallback((enabled: boolean) => {
    setIsEditMode(enabled);
  }, []);

  return (
    <DashboardLayoutContext.Provider
      value={{
        items,
        moveItem,
        reorderItems,
        resetLayout,
        isEditMode,
        setEditMode,
      }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (context === undefined) {
    throw new Error('useDashboardLayout must be used within a DashboardLayoutProvider');
  }
  return context;
}