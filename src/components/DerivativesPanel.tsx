"use client"
import { useState } from 'react'
import FundingPanel from '@/components/FundingPanel'
import GammaPanel from '@/components/GammaPanel'

export default function DerivativesPanel() {
  const [error, setError] = useState('')

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(''), 4000)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
          ⚠️ {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FundingPanel onError={showError} />
        <GammaPanel onError={showError} />
      </div>
      
      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded border-l-4 border-blue-500">
        <strong>Derivatives Module (DV):</strong> Monitors funding rates across exchanges and gamma exposure from options markets. 
        Negative funding periods (48h+) trigger basis trade opportunities automatically.
      </div>
    </div>
  )
}