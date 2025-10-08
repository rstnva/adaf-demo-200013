'use client';

import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { copyToClipboard, truncateHash } from '@/components/JSONPretty';

interface HashBadgeProps {
  hash?: string;
  onClick?: () => void;
  title?: string;
  variant?: 'default' | 'compact';
  showCopyButton?: boolean;
}

/**
 * Badge pequeño para mostrar hashes de lineage con funcionalidad de copia
 * Diseñado para integrarse en tablas, cards y otros componentes
 */
export function HashBadge({ 
  hash, 
  onClick, 
  title = 'Hash de integridad', 
  variant = 'default',
  showCopyButton = true
}: HashBadgeProps) {
  if (!hash) {
    return null;
  }

  const truncated = truncateHash(hash, 6, 4);
  const isCompact = variant === 'compact';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(hash, 'Hash copiado');
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            {/* Hash Display */}
            <div
              className={`
                inline-flex items-center gap-1 rounded-md border transition-colors
                ${isCompact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
                ${onClick 
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer text-blue-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
                }
              `}
              onClick={handleClick}
              role={onClick ? 'button' : undefined}
              tabIndex={onClick ? 0 : undefined}
              onKeyDown={onClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              } : undefined}
            >
              {!isCompact && (
                <span className="font-medium text-xs uppercase tracking-wide">
                  hash:
                </span>
              )}
              <span className="font-mono">
                {truncated}
              </span>
            </div>
            
            {/* Copy Button */}
            {showCopyButton && (
              <Button
                variant="ghost"
                size="sm"
                className={`
                  p-1 h-auto hover:bg-slate-100
                  ${isCompact ? 'w-5 h-5' : 'w-6 h-6'}
                `}
                onClick={handleCopy}
                title="Copiar hash completo"
              >
                <Copy className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">{title}</div>
            <div className="text-xs font-mono bg-slate-100 p-1 rounded">
              {hash}
            </div>
            {onClick && (
              <div className="text-xs text-slate-500">
                Click para ver lineage completo
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Badge más simple para uso en espacios muy limitados
 */
export function CompactHashBadge({ hash, onClick, title }: Omit<HashBadgeProps, 'variant'>) {
  return (
    <HashBadge 
      hash={hash} 
      onClick={onClick} 
      title={title} 
      variant="compact"
      showCopyButton={false}
    />
  );
}