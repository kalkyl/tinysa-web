import { describe, expect, it } from 'vitest'
import { computeScanTimeoutMs } from './timeouts'

describe('computeScanTimeoutMs', () => {
  it('grows with wider spans', () => {
    // rbw/points chosen so neither value hits the ceiling — otherwise both
    // clamp to the same number and the "grows" comparison is meaningless.
    const narrow = computeScanTimeoutMs(100_000_000, 200_000_000, 50, 50)
    const wide = computeScanTimeoutMs(100_000_000, 500_000_000, 50, 50)
    expect(wide).toBeGreaterThan(narrow)
    expect(wide).toBeLessThan(30_000)
  })

  it('grows as rbw narrows (smaller rbw = slower sweep)', () => {
    const coarse = computeScanTimeoutMs(100_000_000, 200_000_000, 30, 450)
    const fine = computeScanTimeoutMs(100_000_000, 200_000_000, 0.3, 450)
    expect(fine).toBeGreaterThan(coarse)
  })

  it('never goes below the floor for tiny spans', () => {
    const timeout = computeScanTimeoutMs(100_000_000, 100_001_000, 300, 10)
    expect(timeout).toBeGreaterThanOrEqual(1000)
  })

  it('never exceeds the ceiling even for a wide span with the narrowest possible rbw', () => {
    // Regression: this combination once produced ~2.3e9 ms, which overflows
    // setTimeout's 32-bit int and fires almost instantly instead of waiting.
    const timeout = computeScanTimeoutMs(30_000_000, 960_000_000, 0.2, 450)
    expect(timeout).toBeLessThanOrEqual(30_000)
  })
})
