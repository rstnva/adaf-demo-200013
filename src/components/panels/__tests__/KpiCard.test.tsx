import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from '../KpiCard'

describe('KpiCard', () => {
  it('renders title and value', () => {
    render(<KpiCard title="TVL" value="$100" subtitle="sub" />)
    expect(screen.getByText('TVL')).toBeInTheDocument()
    expect(screen.getByText('$100')).toBeInTheDocument()
  })
})
