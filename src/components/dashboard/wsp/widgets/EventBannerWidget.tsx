"use client";
// Widget Event Banner (Auto-React Engine)
import { useState, useCallback } from 'react';
import { wspI18n } from '../utils/i18n';

// Simulación de integración con ResearchPanel
import type { WspEvent } from '../../../../types/wsp';
function useResearchPanelSnapshot() {
  return useCallback((payload: WspEvent) => {
    // TODO: Integrar con ResearchPanel real
    alert('Snapshot guardado: ' + JSON.stringify(payload));
  }, []);
}

function PlanSimuladoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="font-bold mb-2">{wspI18n['wsp.checklist.title']}</h2>
        <ul className="text-sm mb-4">
          <li>✔ {wspI18n['wsp.checklist.slippage']}</li>
          <li>✔ {wspI18n['wsp.checklist.ltv']}</li>
          <li>✔ {wspI18n['wsp.checklist.hf']}</li>
          <li>✔ {wspI18n['wsp.checklist.realYield']}</li>
          <li>✔ {wspI18n['wsp.checklist.semaforo']}</li>
          <li>✔ {wspI18n['wsp.checklist.limites']}</li>
        </ul>
        <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={onClose}>{wspI18n['wsp.actions.close']}</button>
      </div>
    </div>
  );
}


export function EventBannerWidget() {
  // TODO: fetch real event from Auto-React Engine
  const [event] = useState<WspEvent | null>({
    id: 'mock1',
    kind: 'FLUSH_REBOUND',
    rationale: [
      'VIX spike > 20',
      'ETF outflows → inflow reversal',
      'Semáforo LAV: Amarillo (sizing limitado)'
    ],
    sizingNote: 'Sugerencia: sizing máximo 20% portfolio',
    guardrails: ['slippage ≤ 0.5%', 'LTV ≤ 35%', 'HF ≥ 1.7'],
    ts: Date.now(),
  });
  const [planOpen, setPlanOpen] = useState(false);
  const snapshot = useResearchPanelSnapshot();

  if (!event) return null;

  return (
    <>
      <div className="wsp-widget event-banner-widget sticky top-0 z-20 bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded shadow flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="font-bold text-yellow-800 mb-1">
            {(() => {
              const keyMap: Record<WspEvent['kind'], string> = {
                FLUSH_REBOUND: 'wsp.event.flushRebound',
                BASIS_CLEAN: 'wsp.event.basisClean',
                REDUCE_LEVERAGE: 'wsp.event.reduceLeverage',
                ROTATE_RWA: 'wsp.event.rotateRwa',
              };
              return wspI18n[keyMap[event.kind]] || event.kind;
            })()}
          </div>
          <ul className="text-xs text-yellow-900 mb-1">
            {event.rationale.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
          <div className="text-xs text-yellow-700 mb-1">{event.sizingNote}</div>
          <div className="text-xs text-yellow-700">{wspI18n['wsp.guardrails.active']}: {event.guardrails.join(', ')}</div>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-700" onClick={() => snapshot(event)}>{wspI18n['wsp.actions.snapshot']}</button>
          <button className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs font-semibold hover:bg-gray-300" onClick={() => setPlanOpen(true)}>{wspI18n['wsp.actions.plan']}</button>
        </div>
      </div>
  <PlanSimuladoModal open={planOpen} onClose={() => setPlanOpen(false)} />
    </>
  );
}
