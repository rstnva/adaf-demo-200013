'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  LineageTraceResponse, 
  LineageSearchResponse,
  isValidLineageEntity,
  isValidLineageStage
} from '@/types/lineage';

type LineageEntity = 'signal' | 'metric' | 'report';
type LineageStage = 'ingest' | 'transform' | 'aggregate' | 'export';

interface UseLineageTraceParams {
  entity: LineageEntity;
  refId: string;
  enabled?: boolean;
}

interface UseLineageSearchParams {
  q: string;
  entity?: LineageEntity;
  stage?: LineageStage;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

/**
 * Hook para obtener la traza completa de lineage de una entidad
 */
export function useLineageTrace({ entity, refId, enabled = true }: UseLineageTraceParams) {
  return useQuery({
    queryKey: ['lineage', 'trace', entity, refId],
    queryFn: async (): Promise<LineageTraceResponse> => {
      // Validar parámetros localmente
      if (!isValidLineageEntity(entity)) {
        throw new Error(`Invalid entity: ${entity}. Must be signal, metric, or report`);
      }
      
      if (!refId || refId.trim().length === 0) {
        throw new Error('refId is required and cannot be empty');
      }
      
      const params = new URLSearchParams({
        entity,
        refId: refId.trim()
      });
      
      const response = await fetch(`/api/read/lineage/trace?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch lineage trace`);
      }
      
      const data = await response.json() as LineageTraceResponse;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch lineage trace');
      }
      
      return data;
    },
    enabled: enabled && !!entity && !!refId,
    staleTime: 30 * 1000, // 30 seconds - datos relativamente estáticos
    retry: (failureCount, error) => {
      // No reintentar errores de validación (4xx)
      if (error.message.includes('Invalid entity') || error.message.includes('HTTP 4')) {
        return false;
      }
      return failureCount < 2; // Máximo 2 reintentos para errores de servidor
    }
  });
}

/**
 * Hook para buscar eventos de lineage con filtros avanzados
 */
export function useLineageSearch({ 
  q, 
  entity, 
  stage, 
  source, 
  dateFrom, 
  dateTo, 
  limit = 100, 
  offset = 0,
  enabled = true 
}: UseLineageSearchParams) {
  return useQuery({
    queryKey: ['lineage', 'search', q, entity, stage, source, dateFrom, dateTo, limit, offset],
    queryFn: async (): Promise<LineageSearchResponse> => {
      // Validar parámetros localmente
      if (!q || q.trim().length === 0) {
        throw new Error('Search query (q) is required and cannot be empty');
      }
      
      if (entity && !isValidLineageEntity(entity)) {
        throw new Error(`Invalid entity: ${entity}. Must be signal, metric, or report`);
      }
      
      if (stage && !isValidLineageStage(stage)) {
        throw new Error(`Invalid stage: ${stage}. Must be ingest, transform, aggregate, or export`);
      }
      
      if (limit <= 0 || limit > 1000) {
        throw new Error('Limit must be between 1 and 1000');
      }
      
      if (offset < 0) {
        throw new Error('Offset must be >= 0');
      }
      
      // Validar fechas si se proporcionan
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (isNaN(fromDate.getTime())) {
          throw new Error('Invalid dateFrom format. Use ISO date string');
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (isNaN(toDate.getTime())) {
          throw new Error('Invalid dateTo format. Use ISO date string');
        }
      }
      
      // Construir parámetros de búsqueda
      const params = new URLSearchParams({
        q: q.trim(),
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (entity) params.append('entity', entity);
      if (stage) params.append('stage', stage);
      if (source) params.append('source', source.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      const response = await fetch(`/api/read/lineage/search?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to search lineage events`);
      }
      
      const data = await response.json() as LineageSearchResponse;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to search lineage events');
      }
      
      return data;
    },
    enabled: enabled && !!q && q.trim().length > 0,
    staleTime: 15 * 1000, // 15 seconds - datos de búsqueda más volátiles
    retry: (failureCount, error) => {
      // No reintentar errores de validación (4xx)
      if (error.message.includes('Invalid') || error.message.includes('HTTP 4')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

/**
 * Hook para obtener lineage por signal ID específico
 */
export function useLineageBySignal(signalId: string, includeDownstream = false, enabled = true) {
  return useQuery({
    queryKey: ['lineage', 'by-signal', signalId, includeDownstream],
    queryFn: async (): Promise<LineageTraceResponse> => {
      if (!signalId || signalId.trim().length === 0) {
        throw new Error('signalId is required and cannot be empty');
      }
      
      const params = new URLSearchParams({
        id: signalId.trim(),
        ...(includeDownstream && { includeDownstream: 'true' })
      });
      
      const response = await fetch(`/api/read/lineage/by-signal?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch signal lineage`);
      }
      
      const data = await response.json() as LineageTraceResponse;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch signal lineage');
      }
      
      return data;
    },
    enabled: enabled && !!signalId,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error) => {
      if (error.message.includes('HTTP 4')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}