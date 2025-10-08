/**
 * Number formatting utilities for financial data
 */

export function formatNumber(
  value: number,
  options: {
    style?: 'decimal' | 'currency' | 'percent';
    currency?: 'USD' | 'MXN';
    compact?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    style = 'decimal',
    currency = 'USD',
    compact = false,
    minimumFractionDigits,
    maximumFractionDigits = 2,
  } = options;

  // Handle compact notation for large numbers
  if (compact && Math.abs(value) >= 1000) {
    const suffixes = ['', 'K', 'M', 'B', 'T'];
    const tier = Math.floor(Math.log10(Math.abs(value)) / 3);
    const suffix = suffixes[tier] || 'T+';
    const scaled = value / Math.pow(10, tier * 3);
    
    return formatNumber(scaled, {
      ...options,
      compact: false,
      maximumFractionDigits: tier > 0 ? 1 : maximumFractionDigits,
    }) + suffix;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style,
    currency: style === 'currency' ? currency : undefined,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return formatter.format(value);
}

export function formatCurrency(
  value: number,
  currency: 'USD' | 'MXN' = 'USD',
  compact = false
): string {
  return formatNumber(value, {
    style: 'currency',
    currency,
    compact,
  });
}

export function formatPercent(
  value: number,
  maximumFractionDigits = 2
): string {
  return formatNumber(value / 100, {
    style: 'percent',
    maximumFractionDigits,
  });
}

export function formatCompact(value: number): string {
  return formatNumber(value, { compact: true });
}

/**
 * Format change with + or - prefix and color indication
 */
export function formatChange(
  value: number,
  options: {
    style?: 'decimal' | 'currency' | 'percent';
    currency?: 'USD' | 'MXN';
    showSign?: boolean;
  } = {}
): { formatted: string; color: string; isPositive: boolean } {
  const { showSign = true, ...formatOptions } = options;
  
  const isPositive = value >= 0;
  const formatted = formatNumber(Math.abs(value), formatOptions);
  const sign = showSign ? (isPositive ? '+' : '-') : '';
  
  return {
    formatted: sign + formatted,
    color: isPositive ? 'text-green-600' : 'text-red-600',
    isPositive,
  };
}

/**
 * Get trend direction and color for KPI changes
 */
export function getTrendInfo(current: number, previous: number) {
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
  
  return {
    change,
    changePercent,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    color: change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600',
    isPositive: change >= 0,
  };
}