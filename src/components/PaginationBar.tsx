"use client"
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

type PaginationBarProps = {
  page: number
  pages: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export default function PaginationBar({ 
  page, 
  pages, 
  limit, 
  total, 
  onPageChange, 
  onLimitChange 
}: PaginationBarProps) {
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="text-sm text-muted-foreground">
        Showing {start}-{end} of {total} opportunities
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Per page:</span>
          <Select value={limit.toString()} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger className="w-20">
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
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>
          
          <span className="text-sm">
            Page {page} of {pages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}