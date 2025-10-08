"use client"
import { useCallback, useEffect, useState } from 'react'
import OpxFilters from '@/components/OpxFilters'
import OpxTriageTable from '@/components/OpxTriageTable'
import PaginationBar from '@/components/PaginationBar'
import ScoreLegend from '@/components/ScoreLegend'
import { NavigationGuard } from '@/components/NavigationGuard'
import { Toaster } from '@/components/ui/toaster'

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

type OpxListResponse = {
  page: number
  pages: number
  limit: number
  total: number
  data: OpxItem[]
}

export default function OpxTriagePage() {
  const [data, setData] = useState<OpxItem[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [filters, setFilters] = useState({
    status: 'proposed',
    type: 'any',
    q: '',
    order: 'score',
    dir: 'desc',
    limit: 50,
    page: 1
  })

  const showToast = useCallback((message: string, isError = false) => {
    setToast(isError ? `❌ ${message}` : `✅ ${message}`)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const loadData = useCallback(async (newFilters: typeof filters) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v && v !== 'any' && v !== '') params.set(k, v.toString())
      })
      
      const res = await fetch(`/api/read/opx/list?${params.toString()}`, {
        cache: 'no-store'
      })
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const json: OpxListResponse = await res.json()
      setData(json.data)
      setPage(json.page)
      setPages(json.pages)
      setLimit(json.limit)
      setTotal(json.total)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load opportunities'
      setError(msg)
      showToast(msg, true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters)
    loadData(newFilters)
  }, [loadData])

  const handlePageChange = useCallback((newPage: number) => {
    const newFilters = { ...filters, page: newPage }
    setFilters(newFilters)
    loadData(newFilters)
  }, [filters, loadData])

  const handleLimitChange = useCallback((newLimit: number) => {
    const newFilters = { ...filters, limit: newLimit, page: 1 }
    setFilters(newFilters)
    loadData(newFilters)
  }, [filters, loadData])

  const handleAction = useCallback(async (id: string, action: 'approve' | 'reject', note: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/actions/opx/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, actor: 'ui', note })
      })
      
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.error || `HTTP ${res.status}`)
      }
      
      // optimistic update: remove from current view if status filter doesn't match new status
      if (filters.status === 'proposed' || filters.status === 'any') {
        setData(prev => prev.map(item => 
          item.id === id 
            ? { ...item, status: action === 'approve' ? 'approved' as const : 'rejected' as const }
            : item
        ))
        
        // if filtering by proposed, remove the item from view
        if (filters.status === 'proposed') {
          setData(prev => prev.filter(item => item.id !== id))
          setTotal(prev => prev - 1)
        }
      }
      
      return true
    } catch (e) {
      throw e // re-throw for component to handle
    }
  }, [filters.status])

  // load initial data
  useEffect(() => {
    loadData(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error && data.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">OP-X Triage</h1>
        <div className="p-8 text-center border rounded-lg bg-destructive/10 text-destructive">
          <p className="mb-2">Failed to load opportunities</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => loadData(filters)}
            className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <NavigationGuard 
        showBackButton={true}
        backUrl="/"
        storageKey="opx-triage"
        data={filters}
      >
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">OP-X Triage</h1>
            {toast && (
              <div className="px-4 py-2 rounded bg-muted text-sm">
                {toast}
              </div>
            )}
          </div>
          
          <ScoreLegend />
          
          <OpxFilters 
            onFiltersChange={handleFiltersChange}
            onToast={showToast}
          />
          
          <OpxTriageTable
            data={data}
            loading={loading}
            onAction={handleAction}
            onToast={showToast}
          />
          
          {total > 0 && (
            <PaginationBar
              page={page}
              pages={pages}
              limit={limit}
              total={total}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          )}
        </div>
      </NavigationGuard>
      <Toaster />
    </>
  )
}