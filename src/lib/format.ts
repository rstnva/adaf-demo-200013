// Format utilities for currency and percentage display

export function currency(value: number, unit = 'USD', compact = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  const absValue = Math.abs(value);
  
  if (compact && absValue >= 1e12) {
    return `${(value / 1e12).toFixed(1)}T ${unit}`;
  } else if (compact && absValue >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B ${unit}`;
  } else if (compact && absValue >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M ${unit}`;
  } else if (compact && absValue >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K ${unit}`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: unit === 'USD' ? 'USD' : undefined,
    minimumFractionDigits: absValue < 1 ? 4 : 2,
    maximumFractionDigits: absValue < 1 ? 4 : 2,
  }).format(value).replace('USD', unit);
}

export function percent(value: number, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  
  return `${value.toFixed(decimals)}%`;
}

export function number(value: number, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1e12) {
    return `${(value / 1e12).toFixed(1)}T`;
  } else if (absValue >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  } else if (absValue >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  } else if (absValue >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  
  return value.toFixed(decimals);
}

export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}