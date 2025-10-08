"use client"
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
type OpxFiltersProps = {
  onFiltersChange: (filters: {
    status: string
    type: string
    q: string
    order: string
    dir: string
    limit: number
    page: number
  }) => void
  onToast: (message: string, isError?: boolean) => void
}

export default function OpxFilters({ onFiltersChange, onToast }: OpxFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [status, setStatus] = useState(searchParams.get('status') || 'proposed')
  const [type, setType] = useState(searchParams.get('type') || 'any')
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [order, setOrder] = useState(searchParams.get('order') || 'score')
  const [dir, setDir] = useState(searchParams.get('dir') || 'desc')
  const [limit, setLimit] = useState(Number(searchParams.get('limit') || '50'))
  const [recalcLoading, setRecalcLoading] = useState(false)

  const updateUrl = useCallback((newParams: Record<string, string>) => {
    const params = new URLSearchParams()
    Object.entries(newParams).forEach(([k, v]) => {
      if (v && v !== 'any' && v !== '') params.set(k, v)
    })
    const url = `/opx?${params.toString()}`
    router.push(url, { scroll: false })
  }, [router])

  const handleFilterChange = useCallback(() => {
    const filters = { status, type, q, order, dir, limit, page: 1 }
    onFiltersChange(filters)
    updateUrl({ status, type, q, order, dir, limit: limit.toString() })
  }, [status, type, q, order, dir, limit, onFiltersChange, updateUrl])

  useEffect(() => {
    handleFilterChange()
  }, [handleFilterChange])

  const handleRecalcScores = async () => {
    setRecalcLoading(true)
    try {
      const res = await fetch('/api/control/opx/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'ui' })
      })
      const data = await res.json()
      if (res.ok) {
        onToast(`Updated ${data.updated} opportunities in ${data.ms}ms`)
        // trigger refresh
        handleFilterChange()
      } else {
        onToast(`Recalc failed: ${data.error || 'Unknown error'}`, true)
      }
    } catch (e) {
      onToast(`Recalc error: ${e instanceof Error ? e.message : 'Network error'}`, true)
    } finally {
      setRecalcLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFilterChange()
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proposed">Proposed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="any">Any</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="basis">Basis</SelectItem>
              <SelectItem value="realYield">Real Yield</SelectItem>
              <SelectItem value="arb">Arbitrage</SelectItem>
              <SelectItem value="any">Any</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Order</label>
          <Select value={order} onValueChange={setOrder}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="var">VaR</SelectItem>
              <SelectItem value="createdAt">Created</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Direction</label>
          <Select value={dir} onValueChange={setDir}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Desc ↓</SelectItem>
              <SelectItem value="asc">Asc ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Limit</label>
          <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Search</label>
          <Input
            placeholder="Search idea/thesis..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleFilterChange} variant="outline" size="sm">
          Apply Filters
        </Button>
        <Button 
          onClick={handleRecalcScores} 
          variant="outline" 
          size="sm"
          disabled={recalcLoading}
        >
          {recalcLoading ? 'Recalculating...' : 'Recalc Scores'}
        </Button>
      </div>
    </div>
  )
}