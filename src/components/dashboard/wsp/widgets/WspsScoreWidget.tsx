"use client";
// Widget Wall Street Pulse Score (WSPS)
import { useEffect, useState } from 'react';
import { calculateWSPS } from '../utils/scoring';
import { wspI18n } from '../utils/i18n';

type Breakdown = { name: string; value: number; weight: number; contribution: number };

export function WspsScoreWidget() {
  const [score, setScore] = useState<{ score: number; color: string; breakdown: Breakdown[] }>({ score: 0, color: 'red', breakdown: [] });
  useEffect(() => {
    // TODO: fetch real inputs from API
    const mockInputs = {
      ETF_BTC_FLOW_NORM: 0.7,
      ETF_ETH_FLOW_NORM: 0.5,
      VIX_NORM: 0.8,
      DXY_NORM: 0.6,
      SPREAD_2s10s_NORM: 0.4,
      SPX_NDX_MOM_NORM: 0.7,
    };
    setScore(calculateWSPS(mockInputs));
  }, []);

  return (
    <div className={`wsp-widget wsps-score-widget border-2 rounded-lg p-4 ${score.color === 'green' ? 'border-green-500' : score.color === 'yellow' ? 'border-yellow-500' : 'border-red-500'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-bold text-2xl ${score.color === 'green' ? 'text-green-600' : score.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{score.score}</span>
        <span className="uppercase text-xs font-semibold">WSPS</span>
        <span className={`badge badge-xs ${score.color}`}>{wspI18n[`wsp.status.${score.color}`]}</span>
      </div>
      <div className="text-xs text-gray-500 mb-2">{wspI18n['wsp.score.breakdown']}</div>
      <ul className="text-xs">
        {score.breakdown.map((f, i) => (
          <li key={i}>{f.name}: {Math.round(f.value * 100)}% × {f.weight} = <b>{Math.round(f.contribution * 100)}</b></li>
        ))}
      </ul>
    </div>
  );
}
