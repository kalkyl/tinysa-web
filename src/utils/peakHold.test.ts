import { describe, expect, it } from 'vitest'
import { updatePeak } from './peakHold'

describe('updatePeak', () => {
  it('starts from the first incoming sweep when there is no existing peak', () => {
    const result = updatePeak(null, Float64Array.from([-90, -80, -70]))
    expect(Array.from(result)).toEqual([-90, -80, -70])
  })

  it('takes the per-bin max across sweeps', () => {
    const first = updatePeak(null, Float64Array.from([-90, -50, -70]))
    const second = updatePeak(first, Float64Array.from([-60, -80, -65]))
    expect(Array.from(second)).toEqual([-60, -50, -65])
  })

  it('resets instead of crashing when the bin count changes', () => {
    const first = updatePeak(null, Float64Array.from([-90, -80, -70]))
    const resized = updatePeak(first, Float64Array.from([-95, -85]))
    expect(Array.from(resized)).toEqual([-95, -85])
  })
})
