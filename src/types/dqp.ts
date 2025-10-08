/**
 * DQP (Data Quality & Pipeline Health) Type Definitions
 * No 'any' types allowed - strict typing for all data structures
 */

export interface DqpRow {
  source: string;           // 'defillama' | 'farside' | 'sosovalue' | 'deribit' ...
  agentCode: string;        // 'NM-1'...'OP-X'
  type: string;             // 'news.headline' | 'onchain.tvl.point' | 'offchain' | 'derivs.funding.point' ...
  lastTs: string | null;    // ISO timestamp
  freshnessMin: number | null;   // minutos desde lastTs
  lastCount24h: number;     // señales últimas 24h
  dupes24h: number;         // duplicados por fingerprint últimas 24h
  schemaErrors24h: number;  // violaciones de esquema últimas 24h
  status: 'ok' | 'warn' | 'fail';
  notes?: string;           // breve resumen (ej. "No data 72m", "Dupes 15")
}

export interface DqpIncident {
  id: number | string;
  ts: string;               // ISO timestamp
  source: string;
  agentCode: string;
  type: string;
  kind: 'freshness' | 'duplicate' | 'schema' | 'backfill' | 'rate_limit' | 'provider_down';
  message: string;          // detalle conciso
  payload?: Record<string, unknown>; // contexto (sizes, hashes, response codes)
  acknowledged: boolean;    // default false
}

// API Response DTOs
export interface DqpOverviewResponse {
  rows: DqpRow[];
  generatedAt: string;
}

export interface DqpIncidentsResponse {
  items: DqpIncident[];
  generatedAt: string;
}

export interface DqpRetryResponse {
  ok: boolean;
  queued: boolean; // false si no hay backend
}

export interface DqpAckResponse {
  ok: boolean;
}

// Request DTOs
export interface DqpRetryRequest {
  source: string;
  agentCode: string;
  type?: string;
  actor: string;
}

export interface DqpAckRequest {
  id: string | number;
  actor: string;
}

// Query Parameters
export interface DqpOverviewQuery {
  status?: 'ok' | 'warn' | 'fail' | 'any';
  agent?: 'NM' | 'OC' | 'OF' | 'DV' | 'MX' | 'OP' | 'any';
  source?: string;
  type?: string;
  limit?: number;
}

export interface DqpIncidentsQuery {
  kind?: 'freshness' | 'duplicate' | 'schema' | 'backfill' | 'rate_limit' | 'provider_down';
  source?: string;
  agentCode?: string;
  ack?: '0' | '1' | 'any';
  limit?: number;
}

// Configuration & Thresholds
export interface DqpThresholds {
  freshness: {
    ok: number;    // < 15 min
    warn: number;  // < 60 min
    fail: number;  // >= 60 min
  };
  duplicates: {
    warn: number;  // > 0
    fail: number;  // > 10
  };
  schema: {
    warn: number;  // > 0
    fail: number;  // > 3
  };
}

// Schema Validation Requirements by Type
export interface SchemaRequirement {
  type: string;
  required: string[];
  optional?: string[];
  validator?: (metadata: Record<string, unknown>) => { valid: boolean; errors: string[] };
}

// Status calculation helpers
export type DqpStatus = 'ok' | 'warn' | 'fail';

export interface DqpStatusCalculation {
  status: DqpStatus;
  reasons: string[];
}

// Agent Code mapping
export const AGENT_CODES = ['NM', 'OC', 'OF', 'DV', 'MX', 'OP'] as const;
export type AgentCode = typeof AGENT_CODES[number];

// Source types (extensible)
export const KNOWN_SOURCES = [
  'defillama', 'farside', 'sosovalue', 'deribit', 'coinmarketcap', 
  'coingecko', 'twitter', 'reddit', 'rss', 'telegram'
] as const;
export type KnownSource = typeof KNOWN_SOURCES[number];

// Signal types (extensible)
export const SIGNAL_TYPES = [
  'news.headline', 'onchain.tvl.point', 'offchain.etf.flow', 'derivs.funding.point',
  'derivs.gamma.surface', 'price.spot', 'social.sentiment', 'regulatory.alert'
] as const;
export type SignalType = typeof SIGNAL_TYPES[number];

// Incident kinds
export const INCIDENT_KINDS = [
  'freshness', 'duplicate', 'schema', 'backfill', 'rate_limit', 'provider_down'
] as const;
export type IncidentKind = typeof INCIDENT_KINDS[number];

// Default thresholds
export const DEFAULT_DQP_THRESHOLDS: DqpThresholds = {
  freshness: {
    ok: 15,   // < 15 min
    warn: 60, // < 60 min  
    fail: 60  // >= 60 min
  },
  duplicates: {
    warn: 0,  // > 0
    fail: 10  // > 10
  },
  schema: {
    warn: 0,  // > 0
    fail: 3   // > 3
  }
};