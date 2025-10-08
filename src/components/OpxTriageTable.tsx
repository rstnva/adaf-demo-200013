"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
// textarea component inline since not found in ui
import { CheckIcon, XIcon } from 'lucide-react'

type OpxItem = {
  id: string
  createdAt: string
  agentCode: string
  idea: string
  thesis: string
  risks: string[]
  sizing: { notionalPctNAV: number; maxDDbps?: number }
  var: number
  type: "beta"|"basis"|"realYield"|"arb"
  status: "proposed"|"approved"|"rejected"
  score: number
  consensus: number
  blocking: string[]
}

type OpxTriageTableProps = {
  data: OpxItem[]
  loading: boolean
  onAction: (id: string, action: 'approve'|'reject', note: string) => Promise<boolean>
  onToast: (message: string, isError?: boolean) => void
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <Badge className={`${color} text-white`}>
      {score}
    </Badge>
  )
}

function BlockingChips({ blocking }: { blocking: string[] }) {
  if (blocking.length === 0) return <span className="text-muted-foreground text-sm">None</span>
  
  return (
    <div className="flex flex-wrap gap-1">
      {blocking.map(b => (
        <Badge key={b} variant="destructive" className="text-xs">
          {b}
        </Badge>
      ))}
    </div>
  )
}

function ActionModal({ 
  action, 
  id, 
  onConfirm, 
  children 
}: { 
  action: 'approve'|'reject'
  id: string
  onConfirm: (note: string) => void
  children: React.ReactNode 
}) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  
  const handleConfirm = () => {
    onConfirm(note.slice(0, 500))
    setNote('')
    setOpen(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Approve' : 'Reject'} Opportunity
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ID: {id}
          </p>
          <div>
            <label className="text-sm font-medium">Note (optional, max 500 chars)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Reason for ${action}...`}
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              {action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function OpxTriageTable({ data, loading, onAction, onToast }: OpxTriageTableProps) {
  const [actioning, setActioning] = useState<Set<string>>(new Set())
  
  const handleAction = async (id: string, action: 'approve'|'reject', note: string) => {
    if (actioning.has(id)) return
    
    setActioning(prev => new Set(prev).add(id))
    try {
      const success = await onAction(id, action, note)
      if (success) {
        onToast(`Successfully ${action}ed opportunity ${id}`)
      }
    } catch (e) {
      onToast(`Failed to ${action}: ${e instanceof Error ? e.message : 'Unknown error'}`, true)
    } finally {
      setActioning(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }
  
  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }
  
  if (data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No opportunities found</div>
  }
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Score</th>
              <th className="text-left p-3 font-medium">Consensus</th>
              <th className="text-left p-3 font-medium">Blocking</th>
              <th className="text-left p-3 font-medium">VaR</th>
              <th className="text-left p-3 font-medium">Notional%</th>
              <th className="text-left p-3 font-medium">Idea</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-t hover:bg-muted/50">
                <td className="p-3">
                  <div className="text-sm">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.agentCode}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline">
                    {item.type}
                  </Badge>
                </td>
                <td className="p-3">
                  <ScoreBadge score={item.score} />
                </td>
                <td className="p-3">
                  {Math.round(item.consensus * 100)}%
                </td>
                <td className="p-3">
                  <BlockingChips blocking={item.blocking} />
                </td>
                <td className="p-3">
                  ${item.var.toLocaleString()}
                </td>
                <td className="p-3">
                  {item.sizing.notionalPctNAV.toFixed(1)}%
                </td>
                <td className="p-3 max-w-xs">
                  <div className="truncate font-medium" title={item.idea}>
                    {item.idea}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={item.thesis}>
                    {item.thesis}
                  </div>
                  {item.risks.length > 0 && (
                    <div className="text-xs text-orange-600 truncate">
                      Risks: {item.risks.join(', ')}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {item.status === 'proposed' ? (
                    <div className="flex gap-1">
                      <ActionModal
                        action="approve"
                        id={item.id}
                        onConfirm={(note) => handleAction(item.id, 'approve', note)}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actioning.has(item.id)}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <CheckIcon className="h-3 w-3" />
                        </Button>
                      </ActionModal>
                      <ActionModal
                        action="reject"
                        id={item.id}
                        onConfirm={(note) => handleAction(item.id, 'reject', note)}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actioning.has(item.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </ActionModal>
                    </div>
                  ) : (
                    <Badge variant={item.status === 'approved' ? 'default' : 'destructive'}>
                      {item.status}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}