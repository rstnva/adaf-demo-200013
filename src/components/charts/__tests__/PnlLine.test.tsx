import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PnlLine } from '../PnlLine'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Sanity render test

describe('PnlLine', () => {
  it('renders loading state first', () => {
    const client = new QueryClient()
    const { container } = render(
      <QueryClientProvider client={client}>
        <PnlLine />
      </QueryClientProvider>
    )
    expect(container.firstChild).toBeTruthy()
  })
})
