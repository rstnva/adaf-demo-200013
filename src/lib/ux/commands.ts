'use client';

import { 
  Home,
  BarChart3,
  Link,
  FileText,
  TrendingUp,
  Database,
  GitBranch,
  GraduationCap,
  Settings,
  Play,
  PlusCircle,
  Hash,
  Bell,
  Activity,
  DollarSign
} from 'lucide-react';

export interface SpotlightCommand {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  category: 'goto' | 'run' | 'entities' | 'docs' | 'hashes';
  keywords: string[];
  action: string;
  payload?: unknown;
  asOf?: string;
  url?: string;
  priority?: number; // Higher priority = higher in results
}

// Comandos Go To - Navegación principal
export const gotoCommands: SpotlightCommand[] = [
  {
    id: 'goto-home',
    title: 'Dashboard Principal', 
    subtitle: 'Dashboard principal con todas las cards',
    icon: Home,
    category: 'goto',
    keywords: ['inicio', 'dashboard', 'principal', 'home'],
    action: 'navigate',
    payload: '/',
    priority: 100,
  },
  {
    id: 'goto-markets',
    title: 'Mercados',
    subtitle: 'Flujos ETF y datos de funding',
    icon: TrendingUp,
    category: 'goto', 
    keywords: ['mercados', 'markets', 'etf', 'funding', 'trading'],
    action: 'navigate',
    payload: '/markets',
    priority: 90,
  },
  {
    id: 'goto-onchain',
    title: 'Análisis On-Chain',
    subtitle: 'Heatmaps TVL y flujos stablecoin',
    icon: Link,
    category: 'goto',
    keywords: ['onchain', 'tvl', 'stablecoin', 'defi', 'cadena'],
    action: 'navigate', 
    payload: '/onchain',
    priority: 90,
  },
  {
    id: 'goto-derivatives',
    title: 'Derivados',
    subtitle: 'Funding rates y exposición gamma',
    icon: BarChart3,
    category: 'goto',
    keywords: ['derivados', 'derivatives', 'funding', 'gamma', 'opciones'],
    action: 'navigate',
    payload: '/derivatives',
    priority: 90,
  },
  {
    id: 'goto-news',
    title: 'Noticias & Research',
    subtitle: 'Noticias del mercado y actualizaciones regulatorias',
    icon: FileText,
    category: 'goto',
    keywords: ['noticias', 'news', 'research', 'regulacion', 'calendario'],
    action: 'navigate',
    payload: '/news',
    priority: 85,
  },
  {
    id: 'goto-research',
    title: 'Hub de Research',
    subtitle: 'Backtesting y desarrollo de estrategias',
    icon: Activity,
    category: 'goto',
    keywords: ['research', 'backtest', 'estrategia', 'algo'],
    action: 'navigate',
    payload: '/research',
    priority: 95,
  },
  {
    id: 'goto-opx',
    title: 'Oportunidades OP-X',
    subtitle: 'Oportunidades de trading y ejecución',
    icon: DollarSign,
    category: 'goto',
    keywords: ['opx', 'oportunidades', 'trades', 'ejecucion'],
    action: 'navigate',
    payload: '/opx',
    priority: 95,
  },
  {
    id: 'goto-reports',
    title: 'Reportes',
    subtitle: 'Generar reportes institucionales',
    icon: FileText,
    category: 'goto',
    keywords: ['reportes', 'reports', 'pdf', 'institucional', 'compliance'],
    action: 'navigate',
    payload: '/reports',
    priority: 80,
  },
  {
    id: 'goto-dqp',
    title: 'Calidad de Datos (DQP)',
    subtitle: 'Monitorear pipelines y salud de datos',
    icon: Database,
    category: 'goto',
    keywords: ['dqp', 'datos', 'calidad', 'pipeline', 'salud'],
    action: 'navigate',
    payload: '/dqp',
    priority: 75,
  },
  {
    id: 'goto-lineage',
    title: 'Linaje de Datos',
    subtitle: 'Rastrear orígenes y transformaciones de datos',
    icon: GitBranch,
    category: 'goto',
    keywords: ['lineage', 'linaje', 'rastreo', 'datos', 'origenes'],
    action: 'navigate',
    payload: '/lineage',
    priority: 70,
  },
  {
    id: 'goto-academy',
    title: 'Academia',
    subtitle: 'Aprendizaje y certificación',
    icon: GraduationCap,
    category: 'goto',
    keywords: ['academia', 'academy', 'aprendizaje', 'educacion', 'certificacion'],
    action: 'navigate',
    payload: '/academy',
    priority: 60,
  },
  {
    id: 'goto-control',
    title: 'Panel de Control',
    subtitle: 'Configuración del sistema y administración',
    icon: Settings,
    category: 'goto',
    keywords: ['control', 'configuracion', 'admin', 'ajustes'],
    action: 'navigate',
    payload: '/control',
    priority: 50,
  },
];

// Comandos Run - Acciones rápidas
export const runCommands: SpotlightCommand[] = [
  {
    id: 'run-worker',
    title: 'Ejecutar Worker',
    subtitle: 'Ejecutar procesamiento de datos en segundo plano',
    icon: Play,
    category: 'run',
    keywords: ['ejecutar', 'worker', 'procesar', 'segundo plano'],
    action: 'run-worker',
    priority: 90,
  },
  {
    id: 'generate-onepager', 
    title: 'Generar Reporte One-Pager',
    subtitle: 'Crear reporte resumen institucional',
    icon: FileText,
    category: 'run',
    keywords: ['generar', 'reporte', 'onepager', 'pdf'],
    action: 'generate-report',
    payload: 'onepager',
    priority: 85,
  },
  {
    id: 'new-backtest',
    title: 'Nuevo Backtest',
    subtitle: 'Iniciar nuevo backtest de research',
    icon: PlusCircle,
    category: 'run',
    keywords: ['nuevo', 'backtest', 'research', 'estrategia'],
    action: 'new-backtest',
    priority: 80,
  },
  {
    id: 'run-all-alerts',
    title: 'Run All Alert Checks',
    subtitle: 'Execute all monitoring alerts',
    icon: Bell,
    category: 'run', 
    keywords: ['alerts', 'run', 'check', 'monitor'],
    action: 'run-alerts',
    priority: 70,
  },
];

// Docs/Runbooks commands
export const docsCommands: SpotlightCommand[] = [
  {
    id: 'docs-shortcuts',
    title: 'Keyboard Shortcuts',
    subtitle: 'View all available hotkeys',
    icon: Hash,
    category: 'docs',
    keywords: ['shortcuts', 'hotkeys', 'keyboard'],
    action: 'show-shortcuts',
    priority: 70,
  },
  {
    id: 'docs-api',
    title: 'API Documentation',
    subtitle: 'Explore available API endpoints',
    icon: Database,
    category: 'docs',
    keywords: ['api', 'documentation', 'endpoints'],
    action: 'open-url',
    payload: '/api-docs',
    priority: 60,
  },
];

// Entity search functions (async)
export async function searchEntities(query: string, limit: number = 5): Promise<SpotlightCommand[]> {
  const results: SpotlightCommand[] = [];
  
  try {
    // Search alerts
    const alertsResponse = await fetch(`/api/read/alerts?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (alertsResponse.ok) {
      const alerts = await alertsResponse.json();
      alerts.slice(0, 2).forEach((alert: { id: string; title: string; severity: string; status: string; timestamp: string }) => {
        results.push({
          id: `alert-${alert.id}`,
          title: `Alert: ${alert.title}`,
          subtitle: `${alert.severity} - ${alert.status}`,
          icon: Bell,
          category: 'entities',
          keywords: [alert.title, alert.severity, 'alert'],
          action: 'view-alert',
          payload: alert.id,
          asOf: alert.timestamp,
          priority: 60,
        });
      });
    }
    
    // Search reports
    const reportsResponse = await fetch(`/api/read/reports?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (reportsResponse.ok) {
      const reports = await reportsResponse.json();
      reports.slice(0, 2).forEach((report: { id: string; title: string; type: string; status: string; createdAt: string }) => {
        results.push({
          id: `report-${report.id}`,
          title: `Report: ${report.title}`,
          subtitle: `${report.type} - ${report.status}`,
          icon: FileText,
          category: 'entities',
          keywords: [report.title, report.type, 'report'],
          action: 'view-report',
          payload: report.id,
          asOf: report.createdAt,
          priority: 55,
        });
      });
    }
    
    // Search opportunities
    const opxResponse = await fetch(`/api/read/opx/opportunities?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (opxResponse.ok) {
      const opportunities = await opxResponse.json();
      opportunities.slice(0, 1).forEach((opp: { id: string; title: string; score: number; status: string; timestamp: string }) => {
        results.push({
          id: `opx-${opp.id}`,
          title: `Opportunity: ${opp.title}`,
          subtitle: `Score: ${opp.score} - ${opp.status}`,
          icon: DollarSign,
          category: 'entities',
          keywords: [opp.title, 'opportunity', 'trade'],
          action: 'view-opportunity',
          payload: opp.id,
          asOf: opp.timestamp,
          priority: 65,
        });
      });
    }
  } catch (error) {
    // Silently fail entity searches - don't break Spotlight
    console.warn('Entity search failed:', error);
  }
  
  return results;
}

// Hash detection and commands
export function createHashCommands(query: string): SpotlightCommand[] {
  const hashPattern = /^[a-f0-9]{6,}$/i;
  if (!hashPattern.test(query.trim())) {
    return [];
  }
  
  const hash = query.trim();
  return [
    {
      id: `hash-lineage-${hash}`,
      title: `View Lineage for ${hash}`,
      subtitle: 'Open data lineage trace',
      icon: GitBranch,
      category: 'hashes',
      keywords: ['lineage', 'hash', 'trace'],
      action: 'view-lineage',
      payload: hash,
      priority: 80,
    },
    {
      id: `hash-alert-${hash}`,
      title: `View Alert ${hash}`,
      subtitle: 'Open alert details',
      icon: Bell,
      category: 'hashes',
      keywords: ['alert', 'hash'],
      action: 'view-alert',
      payload: hash,
      priority: 75,
    },
  ];
}

// Fuzzy search implementation
export function fuzzyMatch(query: string, text: string): number {
  if (!query) return 1;
  
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  
  // Exact match gets highest score
  if (normalizedText.includes(normalizedQuery)) {
    return normalizedText.indexOf(normalizedQuery) === 0 ? 1.0 : 0.8;
  }
  
  // Character-by-character fuzzy matching
  let queryIndex = 0;
  let textIndex = 0;
  let matches = 0;
  
  while (queryIndex < normalizedQuery.length && textIndex < normalizedText.length) {
    if (normalizedQuery[queryIndex] === normalizedText[textIndex]) {
      matches++;
      queryIndex++;
    }
    textIndex++;
  }
  
  const matchRatio = matches / normalizedQuery.length;
  return matchRatio >= 0.6 ? matchRatio * 0.6 : 0;
}

// Search all commands
export function searchCommands(query: string): SpotlightCommand[] {
  if (!query.trim()) {
    // Return recent/popular commands when no query
    return [...gotoCommands.slice(0, 6), ...runCommands.slice(0, 3)];
  }
  
  const staticCommands = [...gotoCommands, ...runCommands, ...docsCommands];
  const hashCommands = createHashCommands(query);
  
  const allCommands = [...staticCommands, ...hashCommands];
  
  // Score and filter commands
  const scoredCommands = allCommands
    .map(cmd => {
      const titleScore = fuzzyMatch(query, cmd.title);
      const keywordScore = Math.max(...cmd.keywords.map(k => fuzzyMatch(query, k)));
      const subtitleScore = cmd.subtitle ? fuzzyMatch(query, cmd.subtitle) : 0;
      
      const maxScore = Math.max(titleScore, keywordScore, subtitleScore);
      const priority = (cmd.priority || 50) / 100;
      
      return {
        ...cmd,
        score: maxScore * 0.7 + priority * 0.3, // Weighted score
      };
    })
    .filter(cmd => cmd.score > 0.2)
    .sort((a, b) => b.score - a.score);
  
  return scoredCommands.slice(0, 10);
}