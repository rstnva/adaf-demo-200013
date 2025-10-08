"use client";
import { useState } from "react";
import TvlHeatmap from "./TvlHeatmap";

export default function OnchainPanel() {
  const [days, setDays] = useState<number>(14);
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="font-semibold">On-chain TVL</div>
        <label className="text-sm ml-auto">Días</label>
        <select className="border rounded px-2 py-1 text-sm" value={days} onChange={e=>setDays(Number(e.target.value))}>
          <option value={7}>7</option>
          <option value={14}>14</option>
          <option value={30}>30</option>
        </select>
      </div>
      <TvlHeatmap days={days} />
    </div>
  )
}
