import { Badge } from '@/components/ui/badge'

export default function ScoreLegend() {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="font-medium mb-3">Score Legend</h3>
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500 text-white">70-100</Badge>
          <span className="text-muted-foreground">High confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500 text-white">40-69</Badge>
          <span className="text-muted-foreground">Medium confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white">0-39</Badge>
          <span className="text-muted-foreground">Low confidence</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Score = Base (severity) + Consensus bonus - Guardrail penalties - VaR penalties
      </p>
    </div>
  )
}