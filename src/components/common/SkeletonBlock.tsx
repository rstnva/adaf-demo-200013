/**
 * Reusable skeleton loading component
 */

import { cn } from '@/lib/utils';

interface SkeletonBlockProps {
  height?: string | number;
  width?: string | number;
  className?: string;
  rows?: number;
  animated?: boolean;
}

export function SkeletonBlock({
  height = 'auto',
  width = '100%',
  className,
  rows = 1,
  animated = true,
}: SkeletonBlockProps) {
  const heightClass = typeof height === 'number' ? `h-${height}` : height;
  const widthClass = typeof width === 'number' ? `w-${width}` : width;

  if (rows > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonLine key={i} animated={animated} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'adaf-skeleton',
        heightClass,
        widthClass,
        animated && 'animate-pulse',
        className
      )}
      style={
        typeof height === 'string' && height !== 'auto'
          ? { height }
          : undefined
      }
    />
  );
}

function SkeletonLine({ animated }: { animated: boolean }) {
  return (
    <div
      className={cn(
        'adaf-skeleton h-4 rounded',
        animated && 'animate-pulse'
      )}
      style={{ width: `${60 + Math.random() * 40}%` }}
    />
  );
}

/**
 * Predefined skeleton patterns for common use cases
 */
export const SkeletonPatterns = {
  CardTitle: () => <SkeletonBlock height="h-6" width="w-32" />,
  
  MetricValue: () => (
    <div className="space-y-2">
      <SkeletonBlock height="h-4" width="w-16" />
      <SkeletonBlock height="h-8" width="w-24" />
      <SkeletonBlock height="h-3" width="w-20" />
    </div>
  ),
  
  ListItem: () => (
    <div className="flex items-center justify-between p-3 border rounded">
      <div className="space-y-2 flex-1">
        <SkeletonBlock height="h-4" width="w-32" />
        <SkeletonBlock height="h-3" width="w-48" />
      </div>
      <SkeletonBlock height="h-6" width="w-16" />
    </div>
  ),
  
  Table: ({ rows = 3 }: { rows?: number }) => (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-2">
          <SkeletonBlock height="h-4" />
          <SkeletonBlock height="h-4" />
          <SkeletonBlock height="h-4" />
          <SkeletonBlock height="h-4" />
        </div>
      ))}
    </div>
  ),
};