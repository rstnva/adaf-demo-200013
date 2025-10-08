"use client";
import { useState } from "react";
import EtfFlowsCompareChart from "./EtfFlowsCompareChart";

export default function EtfComparePanel() {
  const [provider, setProvider] = useState<"any" | "farside" | "sosovalue">("any");
  const [mode, setMode] = useState<"daily" | "cum">("daily");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm">Proveedor</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={provider}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setProvider(e.target.value as "any" | "farside" | "sosovalue")
          }
        >
          <option value="any">Any</option>
          <option value="farside">Farside</option>
          <option value="sosovalue">SoSoValue</option>
        </select>
        <label className="text-sm ml-2">Vista</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={mode}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setMode(e.target.value as "daily" | "cum")
          }
        >
          <option value="daily">Daily</option>
          <option value="cum">Cumulative</option>
        </select>
      </div>
      <EtfFlowsCompareChart provider={provider} days={7} mode={mode} />
    </div>
  );
}
