/**
 * Unified card header with consistent as-of timestamp formatting
 */

import { formatTimestamp } from '@/lib/utils/timeFormat';
import { useUIStore } from '@/store/ui';

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  asOf?: string | Date;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  asOf,
  icon,
  badge,
  actions,
}: CardHeaderProps) {
  const { timezone } = useUIStore();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {asOf && (
          <span className="text-xs text-muted-foreground">
            As of: {formatTimestamp(asOf, timezone, { style: 'relative' })}
          </span>
        )}
      </div>
    </div>
  );
}