import { describe, expect, it } from 'vitest'
import { computeAverage } from './averaging'

describe('computeAverage', () => {
  it('returns an empty array for no sweeps', () => {
    expect(Array.from(computeAverage([]))).toEqual([])
  })

  it('returns the sweep itself when there is only one', () => {
    const result = computeAverage([Float64Array.from([-90, -80])])
    expect(Array.from(result)).toEqual([-90, -80])
  })

  it('averages per-bin across multiple sweeps', () => {
    const result = computeAverage([Float64Array.from([-90, -80]), Float64Array.from([-70, -60]), Float64Array.from([-80, -70])])
    expect(Array.from(result)).toEqual([-80, -70])
  })
})
