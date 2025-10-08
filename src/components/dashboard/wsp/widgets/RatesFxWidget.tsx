"use client";
// Widget Rates-FX Monitor
import { useEffect, useState } from 'react';
import { wspI18n } from '../utils/i18n';

type RatesFx = { dxy: number; ust2y: number; ust10y: number; spread2s10s: number; ts: number };

export function RatesFxWidget() {
  const [data, setData] = useState<RatesFx | null>(null);
  useEffect(() => {
    // TODO: fetch real data from API
    setData({ dxy: 105.2, ust2y: 4.8, ust10y: 4.3, spread2s10s: -0.5, ts: Date.now() });
  }, []);
  return (
    <div className="wsp-widget rates-fx-widget border rounded-lg p-4">
      <div className="font-semibold mb-2">{wspI18n['wsp.rates.title']}</div>
      {data && (
        <ul className="text-xs space-y-1">
          <li>DXY: <b>{data.dxy}</b></li>
          <li>UST 2y: <b>{data.ust2y}%</b></li>
          <li>UST 10y: <b>{data.ust10y}%</b></li>
          <li>Spread 2s10s: <b className={data.spread2s10s < 0 ? 'text-red-600' : 'text-green-600'}>{data.spread2s10s}%</b></li>
        </ul>
      )}
    </div>
  );
}
