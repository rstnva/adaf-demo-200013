/**
 * TanStack Query Data Hooks
 * 
 * All hooks are asset-aware and respect global UI store state:
 * - selectedAssets, range, currency, timezone
 * - Proper cache strategies for different data types
 * - TypeScript safety with no any types
 */

export { useKpis } from './useKpis';
export { useEtfFlows } from './useEtfFlows';
export { useFundingGamma } from './useFundingGamma';
export { useOnchain } from './useOnchain';
export { useNewsReg } from './useNewsReg';
export { useDqp } from './useDqp';
export { useOpx } from './useOpx';
export { useAlertsSSE } from './useAlertsSSE';
export { useToast } from './use-toast';

// Re-export common types
export type { 
  KpiData,
  AlertItem 
} from './useKpis';

export type { 
  EtfFlowData,
  EtfCompareData,
  EtfAutoswitchData 
} from './useEtfFlows';

export type { 
  FundingData,
  GammaData 
} from './useFundingGamma';

export type { 
  TvlHeatmapData 
} from './useOnchain';

export type { 
  NewsItem,
  RegulationItem 
} from './useNewsReg';

export type { 
  DqpOverviewData 
} from './useDqp';

export type { 
  OpxOpportunity 
} from './useOpx';