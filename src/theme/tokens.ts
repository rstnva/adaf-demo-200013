/**
 * Design tokens for consistent theming across the dashboard
 */

/**
 * Severity color tokens with consistent mapping
 */
export const SEVERITY_TOKENS = {
  // Primary severity levels
  ok: {
    text: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'text-green-700 bg-green-100 border-green-300',
    hover: 'hover:bg-green-100',
  },
  
  warning: {
    text: 'text-yellow-700',
    bg: 'bg-yellow-50', 
    border: 'border-yellow-200',
    badge: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    hover: 'hover:bg-yellow-100',
  },
  
  amber: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200', 
    badge: 'text-amber-700 bg-amber-100 border-amber-300',
    hover: 'hover:bg-amber-100',
  },
  
  critical: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'text-red-700 bg-red-100 border-red-300',
    hover: 'hover:bg-red-100',
  },
  
  red: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'text-red-700 bg-red-100 border-red-300',
    hover: 'hover:bg-red-100',
  },
} as const;

/**
 * Informational and neutral tokens
 */
export const INFO_TOKENS = {
  info: {
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'text-blue-700 bg-blue-100 border-blue-300',
    hover: 'hover:bg-blue-100',
  },
  
  neutral: {
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'text-gray-700 bg-gray-100 border-gray-300',
    hover: 'hover:bg-gray-100',
  },
  
  primary: {
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'text-blue-700 bg-blue-100 border-blue-300',
    hover: 'hover:bg-blue-100',
  },
} as const;

/**
 * Status-specific tokens
 */
export const STATUS_TOKENS = {
  active: SEVERITY_TOKENS.ok,
  inactive: INFO_TOKENS.neutral,
  pending: SEVERITY_TOKENS.warning,
  error: SEVERITY_TOKENS.critical,
  loading: INFO_TOKENS.info,
  
  // API/Connection status
  connected: SEVERITY_TOKENS.ok,
  disconnected: SEVERITY_TOKENS.critical,
  
  // Data freshness
  fresh: SEVERITY_TOKENS.ok,
  stale: SEVERITY_TOKENS.warning,
  expired: SEVERITY_TOKENS.critical,
} as const;

/**
 * All tokens combined for easy access
 */
export const TOKENS = {
  ...SEVERITY_TOKENS,
  ...INFO_TOKENS,
  ...STATUS_TOKENS,
} as const;

/**
 * Utility function to get severity token by string
 */
export function getSeverityToken(
  severity: string,
  variant: keyof typeof SEVERITY_TOKENS.ok = 'badge'
) {
  const normalizedSeverity = severity.toLowerCase();
  
  // Handle different severity naming conventions
  if (normalizedSeverity.includes('sev1') || normalizedSeverity === 'critical') {
    return SEVERITY_TOKENS.critical[variant];
  }
  if (normalizedSeverity.includes('sev2') || normalizedSeverity === 'high') {
    return SEVERITY_TOKENS.red[variant];
  }
  if (normalizedSeverity.includes('sev3') || normalizedSeverity === 'medium' || normalizedSeverity === 'warning') {
    return SEVERITY_TOKENS.warning[variant];
  }
  if (normalizedSeverity.includes('sev4') || normalizedSeverity === 'low' || normalizedSeverity === 'info') {
    return INFO_TOKENS.info[variant];
  }
  if (normalizedSeverity === 'ok' || normalizedSeverity === 'healthy' || normalizedSeverity === 'good') {
    return SEVERITY_TOKENS.ok[variant];
  }
  
  // Default to neutral
  return INFO_TOKENS.neutral[variant];
}

/**
 * Get status token for connection/data states
 */
export function getStatusToken(
  status: string,
  variant: keyof typeof STATUS_TOKENS.active = 'badge'
) {
  const normalizedStatus = status.toLowerCase();
  
  if (STATUS_TOKENS[normalizedStatus as keyof typeof STATUS_TOKENS]) {
    return STATUS_TOKENS[normalizedStatus as keyof typeof STATUS_TOKENS][variant];
  }
  
  return INFO_TOKENS.neutral[variant];
}

/**
 * Trend/direction tokens
 */
export const TREND_TOKENS = {
  up: {
    text: 'text-green-600',
    bg: 'bg-green-50',
    icon: 'text-green-600',
  },
  down: {
    text: 'text-red-600', 
    bg: 'bg-red-50',
    icon: 'text-red-600',
  },
  flat: {
    text: 'text-gray-600',
    bg: 'bg-gray-50', 
    icon: 'text-gray-600',
  },
} as const;