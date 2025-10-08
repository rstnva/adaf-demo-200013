/**
 * Timestamp formatting utilities
 */

export function formatTimestamp(
  timestamp: string | Date,
  timezone: string = 'America/Mexico_City',
  options: {
    style?: 'full' | 'short' | 'relative';
    includeSeconds?: boolean;
  } = {}
): string {
  const { style = 'full', includeSeconds = false } = options;
  const date = new Date(timestamp);

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  if (style === 'relative') {
    return formatRelativeTime(date);
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: style === 'full' ? 'numeric' : undefined,
    month: style === 'full' ? 'short' : 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
  };

  return new Intl.DateTimeFormat('en-US', timeOptions).format(date);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return formatTimestamp(date, undefined, { style: 'short' });
  }
}

export function formatAsOf(
  timestamp: string | Date,
  timezone: string = 'America/Mexico_City'
): string {
  return `as of ${formatTimestamp(timestamp, timezone, { style: 'short', includeSeconds: true })}`;
}

/**
 * Get timezone abbreviation for display
 */
export function getTimezoneAbbr(timezone: string): string {
  const abbrs: Record<string, string> = {
    'America/Mexico_City': 'CST',
    'America/New_York': 'EST',
    'Europe/London': 'GMT',
    'Asia/Tokyo': 'JST',
  };
  return abbrs[timezone] || timezone;
}