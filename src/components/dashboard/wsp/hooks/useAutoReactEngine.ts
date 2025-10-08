"use client";
// Motor de reglas y señales para Auto-React Engine (poll 60s, cooldown 30m, stale-aware)
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WspEvent } from '../../../../types/wsp';

type Feeds = {
  etf?: { data: Array<{ netFlowUSD: number }>; stale?: boolean };
  rates?: { data: { dxy: number; ust2y: number; ust10y: number; spread2s10s: number }; stale?: boolean };
  indices?: { data: { vix: number; dChange?: { spx: number; ndx: number } }; stale?: boolean };
  wsps?: { score: number; color: string; stale?: boolean };
  calendar?: { data: Array<{ kind: string; importance: 'low'|'med'|'high' }>; stale?: boolean };
};

const COOLDOWN_SEC = 1800; // 30 min

export function useAutoReactEngine() {
  const [event, setEvent] = useState<WspEvent | null>(null);
  const [stale, setStale] = useState(false);
  const timer = useRef<number | null>(null);

  // Simple cooldown in-memory (UI safety). Server-side cooldown is via Redis keys in rules API if implemented server-side.
  const lastKindTs = useRef<Record<string, number>>({});

  const guardrails = useMemo(() => [
    'slippage ≤ 0.5%', 'LTV ≤ 35%', 'HF ≥ 1.6–1.8', 'Real-Yield ≥ 60–70%', 'Semáforo LAV vigente'
  ], []);

  useEffect(() => {
    async function fetchFeed(url: string) {
      const res = await fetch(url, { cache: 'no-store' });
      const stale = res.headers.get('X-WSP-Data') === 'stale';
      const data = await res.json();
      return { data, stale };
    }

    async function getCooldown(kind: string): Promise<{ active: boolean }> {
      try {
        const res = await fetch(`/api/wsp/events/cooldown?kind=${encodeURIComponent(kind)}`, { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          return { active: Boolean(j.active) };
        }
      } catch {}
      // Fallback localStorage
      try {
        const item = localStorage.getItem(`wsp:cooldown:${kind}`);
        if (item) {
          const exp = Number(item);
          if (Date.now() < exp) return { active: true };
        }
      } catch {}
      return { active: false };
    }

    async function setCooldown(kind: string) {
      // Try server first
      try {
        await fetch('/api/wsp/events/cooldown', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) });
      } catch {}
      // Always set local fallback
      try {
        localStorage.setItem(`wsp:cooldown:${kind}`, String(Date.now() + COOLDOWN_SEC * 1000));
      } catch {}
    }

    async function poll() {
      try {
        const [etfRes, ratesRes, indicesRes, wspsRes, calRes] = await Promise.all([
          fetchFeed('/api/wsp/etf?asset=BTC&window=1d'),
          fetchFeed('/api/wsp/ratesfx'),
          fetchFeed('/api/wsp/indices'),
          fetchFeed('/api/wsp/wsps'),
          fetchFeed('/api/wsp/calendar?window=7d'),
        ]);

        const anyStale = etfRes.stale || ratesRes.stale || indicesRes.stale || wspsRes.stale || calRes.stale;
        setStale(Boolean(anyStale));
        if (anyStale) return; // stale-aware: do not generate new signals

        const feeds: Feeds = {
          etf: etfRes as any,
          rates: ratesRes as any,
          indices: indicesRes as any,
          wsps: wspsRes.data ? (wspsRes as any) : { ...wspsRes, score: wspsRes.data?.score },
          calendar: calRes as any,
        };

        // Rules
        const vix = feeds.indices?.data?.vix ?? 0;
        const vixSpike = vix > 0 && vix >= 20; // simplified spike; real: compare to MA3d
        const etfBtcFlow = feeds.etf?.data?.[0]?.netFlowUSD ?? 0;
        const wspsScore = feeds.wsps?.score ?? 0;
        const dxy = feeds.rates?.data?.dxy ?? 0;
        const spread = feeds.rates?.data?.spread2s10s ?? 0;
        const highHawkish = Boolean(feeds.calendar?.data?.some(c => (c.kind === 'FOMC' || c.kind === 'CPI') && c.importance === 'high'));

        const now = Date.now();
        const withinCooldown = async (kind: WspEvent['kind']) => {
          const local = (now - (lastKindTs.current[kind] || 0)) < COOLDOWN_SEC * 1000;
          if (local) return true;
          const server = await getCooldown(kind);
          return server.active;
        };

        let nextEvent: WspEvent | null = null;

        // FLUSH_REBOUND
  if (!nextEvent && !(await withinCooldown('FLUSH_REBOUND')) && vixSpike && etfBtcFlow > 10_000_000 && wspsScore >= 5) {
          nextEvent = {
            id: `ev-${now}`,
            kind: 'FLUSH_REBOUND',
            rationale: [
              'VIX spike sobre media reciente',
              'ETF BTC revierte a inflows',
              'WSPS mejora (EMA) señal táctica'
            ],
            sizingNote: 'Sizing sugerido: máximo 20% del portfolio; si Semáforo ≠ verde, reducir',
            guardrails,
            ts: now,
          };
        }

        // BASIS_CLEAN
  if (!nextEvent && !(await withinCooldown('BASIS_CLEAN')) && wspsScore < 33 && vix > 18 && dxy > 105) {
          nextEvent = {
            id: `ev-${now}`,
            kind: 'BASIS_CLEAN',
            rationale: [
              'WSPS por debajo de 33 (debilidad)',
              'VIX y DXY al alza',
              'Cerrar basis / reducir exposición'
            ],
            sizingNote: 'Reducir exposición direccional; mantener HF objetivo ≥1.9',
            guardrails,
            ts: now,
          };
        }

        // REDUCE_LEVERAGE
  if (!nextEvent && !(await withinCooldown('REDUCE_LEVERAGE')) && (spread < -0.3 || etfBtcFlow < 0)) {
          nextEvent = {
            id: `ev-${now}`,
            kind: 'REDUCE_LEVERAGE',
            rationale: [
              'Curva 2s10s se empina a la baja (spread ↘)',
              'Flujos ETF negativos ≥1d',
              'Reducir LTV Growth; HF target 1.90'
            ],
            sizingNote: 'Ajustar LTV hacia límites conservadores; priorizar estabilidad',
            guardrails,
            ts: now,
          };
        }

        // ROTATE_RWA
  if (!nextEvent && !(await withinCooldown('ROTATE_RWA')) && wspsScore < 40 && highHawkish) {
          nextEvent = {
            id: `ev-${now}`,
            kind: 'ROTATE_RWA',
            rationale: [
              'WSPS por debajo de 40',
              'Evento macro de alto impacto (FOMC/CPI) con sesgo hawkish',
              'Rotación temporal a RWA/DSR'
            ],
            sizingNote: 'Tras el evento, re-evaluar y deshacer rotación si el riesgo disminuye',
            guardrails,
            ts: now,
          };
        }

        if (nextEvent) {
          lastKindTs.current[nextEvent.kind] = now;
          setEvent(nextEvent);
          // Set cross-instance cooldown
          await setCooldown(nextEvent.kind);
        }
      } catch (e) {
        // silent fail, keep prior event
      }
    }

    poll();
    timer.current = window.setInterval(poll, 60000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, []);

  return { event, stale };
}
