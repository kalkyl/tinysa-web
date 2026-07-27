import { describe, expect, it } from 'vitest'
import { useYAxisRange } from './useYAxisRange'

describe('useYAxisRange auto-fit hysteresis', () => {
  it('fits the range to the first sweep', () => {
    const { computeRange, resetAutoRange } = useYAxisRange()
    resetAutoRange()
    const range = computeRange(Float64Array.from([-90, -30]))
    expect(range.min).toBeLessThanOrEqual(-90)
    expect(range.max).toBeGreaterThanOrEqual(-30)
  })

  it('does not change the range for small in-bounds noise on later sweeps', () => {
    const { computeRange, resetAutoRange } = useYAxisRange()
    resetAutoRange()
    const first = computeRange(Float64Array.from([-90, -30]))
    const second = computeRange(Float64Array.from([-89, -31])) // still well within first's padded bounds
    expect(second).toEqual(first)
  })

  it('rescales once data breaches the current bounds', () => {
    const { computeRange, resetAutoRange } = useYAxisRange()
    resetAutoRange()
    const first = computeRange(Float64Array.from([-90, -30]))
    const breach = computeRange(Float64Array.from([-90, 10])) // well above the old max
    expect(breach.max).toBeGreaterThanOrEqual(10)
    expect(breach).not.toEqual(first)
  })

  it('resetAutoRange() forces the next call to refit from scratch', () => {
    const { computeRange, resetAutoRange } = useYAxisRange()
    resetAutoRange()
    computeRange(Float64Array.from([-90, -30]))
    resetAutoRange()
    const refit = computeRange(Float64Array.from([-50, -40]))
    expect(refit.max).toBeLessThan(-30) // tightly refit around the new, narrower data
  })
})
