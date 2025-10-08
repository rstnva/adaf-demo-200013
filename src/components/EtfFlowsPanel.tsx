"use client";
import { useState } from "react";
import { ADAF_SSV_Block } from "@/components/ssv/ADAF_SSV_Block";
import { EtfFlowsDBWidget } from "@/components/EtfFlowsDBWidget";
import EtfFlowsAuto from "@/components/EtfFlowsAuto";

export default function EtfFlowsPanel() {
  const [asset, setAsset] = useState<"BTC"|"ETH">("BTC");
  const [provider, setProvider] = useState<"any"|"farside"|"sosovalue">("any");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          className="border rounded px-2 py-1 bg-slate-900 text-slate-100"
          value={asset}
          onChange={(e)=>setAsset((e.target.value === 'BTC' ? 'BTC' : 'ETH'))}
        >
          <option>BTC</option><option>ETH</option>
        </select>
        <select
          className="border rounded px-2 py-1 bg-slate-900 text-slate-100"
          value={provider}
          onChange={(e)=>{
            const v = e.target.value
            if (v === 'any' || v === 'farside' || v === 'sosovalue') setProvider(v)
          }}
        >
          <option value="any">Any</option>
          <option value="farside">Farside</option>
          <option value="sosovalue">SoSoValue</option>
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="font-semibold mb-2">ETF Inflows (Autoswitch)</h3>
          <EtfFlowsAuto asset={asset} days={7} />
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="font-semibold mb-2">ETF Inflows (SSV / primaria)</h3>
          <ADAF_SSV_Block />
        </div>
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="font-semibold mb-2">ETF Inflows (DB / {provider})</h3>
          <EtfFlowsDBWidget asset={asset} days={7} provider={provider} />
        </div>
      </div>
    </div>
  );
}
