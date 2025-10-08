import { Info } from 'lucide-react';
import { DASHBOARD_CONCEPTS } from '@/lib/conceptExplanations';
import * as React from 'react';
import { useState } from 'react';


interface ConceptInfoProps {
  concept: string;
  className?: string;
}


export function ConceptInfo({ concept, className }: ConceptInfoProps) {
  const info = DASHBOARD_CONCEPTS[concept];
    const [open, setOpen] = useState(false); // State for managing the visibility of the help panel
  if (!info) return null;
  return (
    <div className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <button
        type="button"
        aria-label={`Mostrar ayuda sobre ${info.title}`}
        className="ml-1 align-middle cursor-pointer focus:outline-none"
        onClick={() => setOpen((v) => !v)}
      >
        <Info className={`h-4 w-4 text-blue-500 transition-transform duration-200 inline ${open ? 'rotate-90' : ''}`} />
      </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'} w-full`}
          aria-hidden={!open}
          style={{
            borderRadius: open ? '0.5rem' : '0.5rem',
            border: open ? '1px solid #bfdbfe' : 'none',
            background: open ? '#eff6ff' : 'transparent',
            boxShadow: open ? '0 1px 4px 0 rgba(59,130,246,0.08)' : 'none',
            marginTop: open ? 8 : 0,
          }}
        >
          <div className="flex items-center gap-2 px-4 pt-3 text-blue-700 font-semibold">
            <Info className="h-5 w-5 text-blue-500" />
            <span>{info.title}</span>
          </div>
          <div className="px-4 pb-3 pt-1 text-base text-gray-700">{info.description}</div>
        </div>
    </div>
  );
}
