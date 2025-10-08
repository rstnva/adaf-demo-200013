import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UIState {
  // Global selectors
  selectedAssets: string[];
  range: '1D' | '7D' | '30D' | '90D' | '1Y';
  currency: 'USD' | 'MXN';
  timezone: 'America/Mexico_City' | 'America/New_York' | 'Europe/London' | 'Asia/Tokyo';
  asOf: Date | 'now';
  
  // UI State
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  
  // Actions
  setSelectedAssets: (assets: string[]) => void;
  setRange: (range: UIState['range']) => void;
  setCurrency: (currency: UIState['currency']) => void;
  setTimezone: (timezone: UIState['timezone']) => void;
  setAsOf: (asOf: Date | 'now') => void;
  toggleSidebar: () => void;
  toggleSearch: () => void;
  
  // Helpers
  getFormattedAsOf: () => string;
  getAssetParams: () => string;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedAssets: ['BTC', 'ETH'],
      range: '7D',
      currency: 'USD',
      timezone: 'America/Mexico_City',
      asOf: 'now',
      sidebarCollapsed: false,
      searchOpen: false,
      
      // Actions
      setSelectedAssets: (assets) => set({ selectedAssets: assets }),
      setRange: (range) => set({ range }),
      setCurrency: (currency) => set({ currency }),
      setTimezone: (timezone) => set({ timezone }),
      setAsOf: (asOf) => set({ asOf }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
      
      // Helpers
      getFormattedAsOf: () => {
        const state = get();
        const date = state.asOf === 'now' ? new Date() : state.asOf;
        return new Intl.DateTimeFormat('en-US', {
          timeZone: state.timezone,
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }).format(date);
      },
      
      getAssetParams: () => {
        const state = get();
        return state.selectedAssets.join(',');
      }
    }),
    {
      name: 'adaf-ui-state',
      // Only persist user preferences, not transient state
      partialize: (state) => ({
        selectedAssets: state.selectedAssets,
        range: state.range,
        currency: state.currency,
        timezone: state.timezone,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
);

// Hook for asset-aware data fetching
export const useAssetAwareParams = () => {
  const { selectedAssets, range, currency, timezone } = useUIStore();
  
  return {
    assets: selectedAssets.join(','),
    range,
    currency,
    timezone,
    // Helper for query keys
    getQueryKey: (baseKey: string) => [baseKey, { assets: selectedAssets, range, currency }]
  };
};