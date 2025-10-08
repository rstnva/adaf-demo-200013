export type PnlPoint = { date: string; pnl: number }

export async function getPNLSeries(): Promise<PnlPoint[]> {
  await new Promise((r) => setTimeout(r, 500))
  return [
    { date: '2024-01-01', pnl: 1000 },
    { date: '2024-01-02', pnl: 1250 },
    { date: '2024-01-03', pnl: 1100 },
    { date: '2024-01-04', pnl: 1400 },
    { date: '2024-01-05', pnl: 1350 },
    { date: '2024-01-06', pnl: 1600 },
    { date: '2024-01-07', pnl: 1500 },
  ]
}
