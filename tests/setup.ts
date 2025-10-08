import '@testing-library/jest-dom'
import { beforeAll } from 'vitest'

// Setup para pruebas
beforeAll(() => {
  // Mock de console.log para pruebas más limpias
  if (process.env.NODE_ENV === 'test') {
    console.log = () => {}
  }
})