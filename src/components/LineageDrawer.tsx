'use client';

import React, { useEffect } from 'react';
import { X, Clock, Database, ArrowRight, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLineageTrace } from '@/hooks/useLineageTrace';
import { JSONPretty, copyToClipboard, truncateHash } from '@/components/JSONPretty';
import { LineageEvent } from '@/types/lineage';

type LineageEntity = 'signal' | 'metric' | 'report';

interface LineageDrawerProps {
  open: boolean;
  onClose: () => void;
  entity: LineageEntity;
  refId: string;
}

// Configuración de colores por stage
const STAGE_CONFIG = {
  ingest: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: '📥',
    label: 'Ingesta' 
  },
  transform: { 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    icon: '🔄',
    label: 'Transformación' 
  },
  aggregate: { 
    color: 'bg-teal-100 text-teal-800 border-teal-200', 
    icon: '📊',
    label: 'Agregación' 
  },
  export: { 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: '📤',
    label: 'Exportación' 
  }
} as const;

/**
 * Drawer para visualizar el lineage completo de una entidad con timeline interactivo
 */
export function LineageDrawer({ open, onClose, entity, refId }: LineageDrawerProps) {
  const { data, isLoading, isError, error, refetch } = useLineageTrace({
    entity,
    refId,
    enabled: open // Solo cargar cuando el drawer está abierto
  });

  // Manejar cierre con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  // Registrar vista para métricas (fire-and-forget)
  useEffect(() => {
    if (open && data?.success) {
      // POST para métricas - sin bloquear UI
      fetch('/api/metrics/lineage/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, refId })
      }).catch(() => {
        // Ignorar errores de métricas - no crítico para UX
      });
    }
  }, [open, data?.success, entity, refId]);

  const handleCopyHash = async (hash: string) => {
    await copyToClipboard(hash, 'Hash copiado al portapapeles');
  };

  const handleCopyRefId = async () => {
    await copyToClipboard(refId, 'ID de referencia copiado');
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'medium'
      });
    } catch {
      return ts;
    }
  };

  const truncatedRefId = truncateHash(refId, 8, 6);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        className="w-full sm:w-[540px] md:w-[640px] lg:w-[720px] max-w-none overflow-y-auto"
        aria-describedby="lineage-drawer-description"
      >
        <SheetHeader className="space-y-3 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-slate-600" />
              Lineage
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Badge variant="outline" className="capitalize">
              {entity}
            </Badge>
            <ArrowRight className="w-3 h-3" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyRefId}
              className="h-auto p-1 font-mono text-xs hover:bg-slate-100"
            >
              {truncatedRefId}
              <Copy className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </SheetHeader>

        <div id="lineage-drawer-description" className="sr-only">
          Visualización del lineage completo para {entity} con ID {refId}. 
          Use las teclas de navegación para explorar los eventos y ESC para cerrar.
        </div>

        <div className="py-4">
          {/* Estados de carga y error */}
          {isLoading && <LoadingSkeleton />}
          
          {isError && (
            <Alert className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Error al cargar lineage: {error?.message || 'Error desconocido'}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                >
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Timeline de eventos */}
          {data?.success && data.trace && (
            <LineageTimeline 
              events={data.trace.events} 
              onCopyHash={handleCopyHash}
            />
          )}

          {/* Estado vacío */}
          {data?.success && (!data.trace || data.trace.events.length === 0) && (
            <div className="text-center py-8 text-slate-500">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron eventos de lineage para esta entidad.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {data?.success && data.trace && (
                <>
                  {data.trace.events.length} eventos • 
                  Última actualización: {formatTimestamp(data.trace.lastEventAt)}
                </>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Componente del timeline vertical con eventos de lineage
 */
function LineageTimeline({ 
  events, 
  onCopyHash 
}: { 
  events: LineageEvent[]; 
  onCopyHash: (hash: string) => void;
}) {
  // Ordenar eventos por timestamp ASC
  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }, [events]);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Timeline de procesamiento ({sortedEvents.length} eventos)
      </h3>
      
      <ul className="space-y-4 relative">
        {/* Línea de conexión vertical */}
        <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-200" />
        
        {sortedEvents.map((event) => (
          <LineageEventItem
            key={`${event.id}-${event.ts}`}
            event={event}
            onCopyHash={onCopyHash}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Item individual del evento en el timeline
 */
function LineageEventItem({ 
  event, 
  onCopyHash 
}: { 
  event: LineageEvent; 
  onCopyHash: (hash: string) => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const stageConfig = STAGE_CONFIG[event.stage];
  
  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'medium'
      });
    } catch {
      return ts;
    }
  };

  const hasData = (event.inputs && Object.keys(event.inputs).length > 0) || 
                  (event.outputs && Object.keys(event.outputs).length > 0);

  return (
    <li className="relative pl-12">
      {/* Círculo del timeline */}
      <div className={`
        absolute left-4 w-4 h-4 rounded-full border-2 bg-white
        ${stageConfig.color.includes('blue') ? 'border-blue-400' : ''}
        ${stageConfig.color.includes('purple') ? 'border-purple-400' : ''}
        ${stageConfig.color.includes('teal') ? 'border-teal-400' : ''}
        ${stageConfig.color.includes('gray') ? 'border-gray-400' : ''}
      `} />
      
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        {/* Header del evento */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${stageConfig.color} text-xs`}>
                {stageConfig.icon} {stageConfig.label}
              </Badge>
              <span className="text-xs text-slate-500">
                {formatTimestamp(event.ts)}
              </span>
            </div>
            
            <div className="text-sm">
              <span className="font-medium text-slate-700">Fuente:</span>
              <span className="ml-2 font-mono text-xs bg-slate-50 px-2 py-1 rounded">
                {event.source}
              </span>
            </div>
          </div>
        </div>

        {/* Hash e información adicional */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-slate-500">Hash:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopyHash(event.hash)}
            className="h-auto p-1 font-mono text-xs hover:bg-slate-100"
          >
            {truncateHash(event.hash)}
            <Copy className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Notas si existen */}
        {event.notes && (
          <div className="text-xs text-slate-600 mb-3 p-2 bg-slate-50 rounded">
            <strong>Notas:</strong> {event.notes}
          </div>
        )}

        {/* Datos de entrada/salida */}
        {hasData && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-2 text-xs w-full justify-between hover:bg-slate-50 flex items-center rounded border bg-white"
            >
              <span>Ver inputs/outputs</span>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3 space-y-3">
              {event.inputs && Object.keys(event.inputs).length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-2">Inputs:</h5>
                  <JSONPretty data={event.inputs} maxHeight="200px" />
                </div>
              )}
              
              {event.outputs && Object.keys(event.outputs).length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-slate-700 mb-2">Outputs:</h5>
                  <JSONPretty data={event.outputs} maxHeight="200px" />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </li>
  );
}

/**
 * Skeleton de carga para el drawer
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-slate-400" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="relative pl-12">
          <div className="absolute left-4 w-4 h-4 rounded-full bg-slate-200" />
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}