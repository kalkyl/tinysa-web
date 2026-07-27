import { describe, expect, it } from 'vitest'
import { findHarmonicBases } from './harmonicFinder'

describe('findHarmonicBases', () => {
  it('finds an exact base frequency from two of its harmonics', () => {
    const candidates = findHarmonicBases(30_000_000, 40_000_000)
    const best = candidates[0]
    expect(best.baseHz).toBeCloseTo(10_000_000)
    expect(best.nLow).toBe(3)
    expect(best.nHigh).toBe(4)
    expect(best.errorFraction).toBeCloseTo(0, 5)
  })

  it('finds the base for adjacent harmonics (base = spacing)', () => {
    const candidates = findHarmonicBases(100_000_000, 110_000_000)
    const exact = candidates.find((c) => Math.abs(c.baseHz - 10_000_000) < 1)
    expect(exact).toBeDefined()
    expect(exact!.nLow).toBe(10)
    expect(exact!.nHigh).toBe(11)
  })

  it('tolerates small measurement error within the tolerance fraction', () => {
    // 40.05MHz is ~0.125% off from the true 4th harmonic of 10MHz
    const candidates = findHarmonicBases(30_000_000, 40_050_000, 20, 0.02)
    expect(candidates.some((c) => c.nLow === 3 && c.nHigh === 4)).toBe(true)
  })

  it('returns an empty list for non-positive or identical inputs', () => {
    expect(findHarmonicBases(0, 100)).toEqual([])
    expect(findHarmonicBases(-10, 100)).toEqual([])
    expect(findHarmonicBases(50, 50)).toEqual([])
  })

  it('sorts candidates by best fit first', () => {
    const candidates = findHarmonicBases(30_000_000, 40_000_000)
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i].errorFraction).toBeGreaterThanOrEqual(candidates[i - 1].errorFraction)
    }
  })
})
