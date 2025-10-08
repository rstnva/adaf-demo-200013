"use client";
// Widget Calendar-Catalyst
import { useEffect, useState } from 'react';
import { wspI18n } from '../utils/i18n';

type Catalyst = { date: string; time?: string; kind: 'FOMC'|'CPI'|'OPEX'|'UNLOCK'|'EARNINGS'; title: string; importance: 'low'|'med'|'high' };

export function CalendarCatalystWidget() {
  const [data, setData] = useState<Catalyst[]>([]);
  useEffect(() => {
    // TODO: fetch real data from API
    setData([
      { date: '2025-10-07', kind: 'FOMC', title: 'FOMC Minutes', importance: 'high' },
      { date: '2025-10-08', kind: 'CPI', title: 'US CPI Release', importance: 'high' },
      { date: '2025-10-09', kind: 'EARNINGS', title: 'TSLA Earnings', importance: 'med' },
    ]);
  }, []);
  return (
    <div className="wsp-widget calendar-catalyst-widget border rounded-lg p-4">
      <div className="font-semibold mb-2">{wspI18n['wsp.calendar.title']}</div>
      <ul className="text-xs">
        {data.map((item, i) => (
          <li key={i} className={item.importance === 'high' ? 'text-red-600' : item.importance === 'med' ? 'text-yellow-600' : 'text-gray-600'}>
            <b>{item.date}</b> - {item.kind}: {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
