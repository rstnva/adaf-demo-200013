import { create } from 'zustand'

export type Preset = {
  id: string
  name: string
  apy: number
  costos: string
}

export type ExecutionPlan = {
  presets: Array<Preset>
  confirmedAt?: string
}

type PlanState = {
  presets: Preset[]
  executionPlan: ExecutionPlan | null
  addPreset: (p: Preset) => void
  clear: () => void
  confirm: () => void
}

export const usePlan = create<PlanState>((set, get) => ({
  presets: [
    { id: '1', name: 'Conservative', apy: 5.0, costos: '$50' },
    { id: '2', name: 'Balanced', apy: 6.2, costos: '$120' },
    { id: '3', name: 'Aggressive', apy: 7.2, costos: '$250' },
  ],
  executionPlan: null,
  addPreset: (p) => set((s) => ({ presets: [...s.presets, p] })),
  clear: () => set({ executionPlan: null }),
  confirm: () => set({ executionPlan: { presets: get().presets, confirmedAt: new Date().toISOString() } }),
}))