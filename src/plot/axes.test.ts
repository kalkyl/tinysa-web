import { describe, expect, it } from 'vitest'
import { computeLogTicks, computeTicks, formatFrequencyHz, niceStep } from './axes'

describe('niceStep', () => {
  it('rounds up to a 1/2/5 x 10^n step', () => {
    expect(niceStep(100, 5)).toBe(20)
    expect(niceStep(10, 5)).toBe(2)
  })
})

describe('computeTicks', () => {
  it('produces evenly spaced clean ticks within range', () => {
    const ticks = computeTicks(0, 100, 5)
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i] - ticks[i - 1]).toBeCloseTo(ticks[1] - ticks[0])
    }
    expect(ticks[0]).toBeGreaterThanOrEqual(0)
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(100)
  })
})

describe('formatFrequencyHz', () => {
  it('formats sub-MHz as kHz', () => {
    expect(formatFrequencyHz(500_000)).toBe('500.0 kHz')
  })
  it('formats MHz range with adaptive precision', () => {
    expect(formatFrequencyHz(88_500_000)).toBe('88.50 MHz')
    expect(formatFrequencyHz(915_000_000)).toBe('915.0 MHz')
  })
  it('formats GHz range', () => {
    expect(formatFrequencyHz(2_450_000_000)).toBe('2.45 GHz')
  })
})

describe('computeLogTicks', () => {
  it('places ticks at 1/2/5 x 10^n within range', () => {
    const ticks = computeLogTicks(100_000, 1_000_000_000)
    expect(ticks[0]).toBeCloseTo(100_000)
    expect(ticks).toContain(1_000_000)
    expect(ticks).toContain(500_000_000)
    expect(ticks[ticks.length - 1]).toBeCloseTo(1_000_000_000)
  })

  it('stays monotonically increasing', () => {
    const ticks = computeLogTicks(1000, 1_000_000)
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1])
    }
  })

  it('does not stretch a legitimately narrow (sub-decade) range out to a full decade', () => {
    // Regression: an earlier version forced max = min * 10 whenever max < min * 10,
    // which silently expanded a normal 88-108MHz sweep's ticks out to 500MHz+.
    const ticks = computeLogTicks(88_000_000, 108_000_000)
    for (const tick of ticks) {
      expect(tick).toBeGreaterThanOrEqual(88_000_000)
      expect(tick).toBeLessThanOrEqual(108_000_000)
    }
  })
})
