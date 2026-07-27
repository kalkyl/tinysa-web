import { describe, expect, it } from 'vitest'
import { useNoiseFloor } from './useNoiseFloor'

describe('useNoiseFloor', () => {
  it('passes amplitudes through unchanged when disabled or no baseline captured', () => {
    const { applySubtraction, enabled, clear } = useNoiseFloor()
    clear()
    const amplitudes = Float64Array.from([-90, -80])
    expect(applySubtraction(amplitudes)).toBe(amplitudes)
    enabled.value = true
    expect(applySubtraction(amplitudes)).toBe(amplitudes) // still no baseline captured
  })

  it('subtracts the captured baseline once enabled', () => {
    const { capture, applySubtraction, enabled } = useNoiseFloor()
    capture(Float64Array.from([0, 1]), Float64Array.from([-90, -85]))
    enabled.value = true
    const result = applySubtraction(Float64Array.from([-70, -60]))
    expect(Array.from(result)).toEqual([20, 25])
  })

  it('skips subtraction if the bin count no longer matches the baseline', () => {
    const { capture, applySubtraction, enabled } = useNoiseFloor()
    capture(Float64Array.from([0, 1]), Float64Array.from([-90, -85]))
    enabled.value = true
    const mismatched = Float64Array.from([-70, -60, -50])
    expect(applySubtraction(mismatched)).toBe(mismatched)
  })

  it('clear() resets the baseline and disables subtraction', () => {
    const { capture, clear, applySubtraction, enabled, baselineAmplitudesDbm } = useNoiseFloor()
    capture(Float64Array.from([0]), Float64Array.from([-90]))
    enabled.value = true
    clear()
    expect(baselineAmplitudesDbm.value).toBeNull()
    expect(enabled.value).toBe(false)
    const amplitudes = Float64Array.from([-70])
    expect(applySubtraction(amplitudes)).toBe(amplitudes)
  })
})
