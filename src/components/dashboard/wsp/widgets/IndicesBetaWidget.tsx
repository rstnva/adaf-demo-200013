"use client";
// Widget Equities-Tech-Beta
import { useEffect, useState } from 'react';
import { wspI18n } from '../utils/i18n';

type Indices = { spx: number; ndx: number; vix: number; ts: number; dChange?: { spx: number; ndx: number; vix: number } };

export function IndicesBetaWidget() {
  const [data, setData] = useState<Indices | null>(null);
  useEffect(() => {
    // TODO: fetch real data from API
    setData({ spx: 5200, ndx: 18000, vix: 14.2, ts: Date.now(), dChange: { spx: 0.5, ndx: 0.7, vix: -0.3 } });
  }, []);
  return (
    <div className="wsp-widget indices-beta-widget border rounded-lg p-4">
      <div className="font-semibold mb-2">{wspI18n['wsp.indices.title']}</div>
      {data && (
        <ul className="text-xs space-y-1">
          <li>
            SPX: <b>{data.spx}</b>
            {typeof data.dChange?.spx === 'number' && (
              <span className={data.dChange.spx >= 0 ? 'text-green-600' : 'text-red-600'}>
                ({data.dChange.spx >= 0 ? '+' : ''}{data.dChange.spx}%)
              </span>
            )}
          </li>
          <li>
            NDX: <b>{data.ndx}</b>
            {typeof data.dChange?.ndx === 'number' && (
              <span className={data.dChange.ndx >= 0 ? 'text-green-600' : 'text-red-600'}>
                ({data.dChange.ndx >= 0 ? '+' : ''}{data.dChange.ndx}%)
              </span>
            )}
          </li>
          <li>
            VIX: <b>{data.vix}</b>
            {typeof data.dChange?.vix === 'number' && (
              <span className={data.dChange.vix >= 0 ? 'text-green-600' : 'text-red-600'}>
                ({data.dChange.vix >= 0 ? '+' : ''}{data.dChange.vix}%)
              </span>
            )}
          </li>
        </ul>
      )}
    </div>
  );
}
