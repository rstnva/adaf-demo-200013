import { processNewSignals } from '@/lib/agents/worker'
import { mSignalsProcessed, mAlertsCreated, mOppsCreated, gLastTickTs } from '@/lib/metrics'

// Lightweight wrapper to expose the worker loop as a function usable by HTTP and CLI
export async function tick(): Promise<{ processed: number; alerts: number; opportunities: number; skipped: number }> {
  const res = await processNewSignals()
  try {
    mSignalsProcessed.inc(res.processed)
    mAlertsCreated.inc(res.alerts)
    mOppsCreated.inc(res.opportunities)
    gLastTickTs.set(Date.now() / 1000)
  } catch {
    // metrics optional
  }
  return res
}
