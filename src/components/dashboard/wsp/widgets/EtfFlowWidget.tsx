"use client";
// Widget ETF-Flow Scout (BTC/ETH)
import { useEffect, useState } from 'react';
import { wspI18n } from '../utils/i18n';

type EtfFlow = { date: string; asset: 'BTC'|'ETH'; issuer?: string; netFlowUSD: number; cumFlowUSD?: number };

export function EtfFlowWidget() {
  const [data, setData] = useState<EtfFlow[]>([]);
  useEffect(() => {
    // TODO: fetch real data from API
    setData([
      { date: '2025-10-06', asset: 'BTC', netFlowUSD: 12000000, issuer: 'BlackRock' },
      { date: '2025-10-06', asset: 'ETH', netFlowUSD: 4000000, issuer: 'Fidelity' },
    ]);
  }, []);
  return (
    <div className="wsp-widget etf-flow-widget border rounded-lg p-4">
      <div className="font-semibold mb-2">{wspI18n['wsp.etf.title']}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th>Asset</th><th>Issuer</th><th>Net Flow (USD)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="text-center">
              <td>{row.asset}</td>
              <td>{row.issuer}</td>
              <td className={row.netFlowUSD >= 0 ? 'text-green-600' : 'text-red-600'}>
                {row.netFlowUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
