import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PresetsDrawer } from '../PresetsDrawer'

// Basic render test (drawer interactions are limited in jsdom without portals)

describe('PresetsDrawer', () => {
  it('renders trigger button', () => {
    render(<PresetsDrawer />)
    expect(screen.getByText('Ver Presets de Ejecución')).toBeInTheDocument()
  })
})
