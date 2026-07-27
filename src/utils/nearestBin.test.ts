import { describe, expect, it } from 'vitest'
import { nearestBinIndex } from './nearestBin'

describe('nearestBinIndex', () => {
  it('finds the exact match', () => {
    const freqs = Float64Array.from([0, 10, 20, 30])
    expect(nearestBinIndex(freqs, 20)).toBe(2)
  })

  it('finds the closest bin when there is no exact match', () => {
    const freqs = Float64Array.from([0, 10, 20, 30])
    expect(nearestBinIndex(freqs, 24)).toBe(2)
    expect(nearestBinIndex(freqs, 26)).toBe(3)
  })

  it('returns 0 for an empty array', () => {
    expect(nearestBinIndex(new Float64Array(0), 100)).toBe(0)
  })
})
