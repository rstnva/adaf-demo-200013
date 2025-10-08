/**
 * Prueba básica para verificar que la configuración funciona
 */
import { describe, it, expect } from 'vitest'

describe('Basic Test', () => {
  it('should verify that testing is working', () => {
    expect(1 + 1).toBe(2)
  })

  it('should verify that environment variables are accessible', () => {
    expect(process.env.NODE_ENV).toBeDefined()
  })
})