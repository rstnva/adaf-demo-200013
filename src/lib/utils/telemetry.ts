/**
 * UI Event Telemetry utilities
 */

interface UiEvent {
  component: string;
  action: string;
  meta?: Record<string, unknown>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Post UI event to telemetry endpoint
 */
export async function postUiEvent(
  component: string,
  action: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    const event: UiEvent = {
      component,
      action,
      meta,
      timestamp: new Date().toISOString(),
      // TODO: Get from auth context when available
      userId: 'anonymous',
      sessionId: getSessionId(),
    };

    // Fire and forget - don't block UI for telemetry
    fetch('/api/metrics/ui/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch(error => {
      // Silently log telemetry errors to avoid noise
      console.debug('Telemetry error:', error);
    });
  } catch (error) {
    // Silently handle telemetry errors
    console.debug('Failed to post UI event:', error);
  }
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  const sessionKey = 'adaf_session_id';
  let sessionId = sessionStorage.getItem(sessionKey);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(sessionKey, sessionId);
  }
  
  return sessionId;
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Common UI event tracking functions
 */
export const trackUiEvent = {
  // TopBar actions
  runWorkerOnce: () => postUiEvent('TopBar', 'run_worker_once'),
  generateOnePager: () => postUiEvent('TopBar', 'generate_onepager'),
  newBacktest: () => postUiEvent('TopBar', 'new_backtest'),
  searchSubmit: (query: string) => postUiEvent('TopBar', 'search_submit', { query: query.slice(0, 50) }),
  assetChange: (assets: string[]) => postUiEvent('TopBar', 'asset_change', { assets }),
  rangeChange: (range: string) => postUiEvent('TopBar', 'range_change', { range }),
  currencyChange: (currency: string) => postUiEvent('TopBar', 'currency_change', { currency }),
  
  // Card interactions
  cardViewMore: (cardName: string) => postUiEvent('DashboardCard', 'view_more', { card: cardName }),
  cardRetry: (cardName: string) => postUiEvent('DashboardCard', 'retry', { card: cardName }),
  cardToggle: (cardName: string, toggle: string) => postUiEvent('DashboardCard', 'toggle', { card: cardName, toggle }),
  
  // Navigation
  navSection: (section: string) => postUiEvent('NavLeft', 'navigate', { section }),
  
  // ETF specific
  etfToggleDailyCum: (mode: 'daily' | 'cumulative') => postUiEvent('EtfCompareMini', 'toggle_daily_cum', { mode }),
  
  // Alerts
  alertAcknowledge: (alertId: string, severity: string) => postUiEvent('AlertsLiveCard', 'acknowledge', { alertId, severity }),
  
  // OP-X
  opxViewOpportunity: (oppId: string, score: number) => postUiEvent('OpxTopScores', 'view_opportunity', { oppId, score }),
  
  // Research
  researchRunPreset: (presetId: string) => postUiEvent('ResearchQuickActions', 'run_preset', { presetId }),
};