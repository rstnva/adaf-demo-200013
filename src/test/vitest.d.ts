/// <reference types="vitest" />

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeOneOf(expected: readonly T[]): void
  }
}

export {}