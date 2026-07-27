import { describe, expect, it } from 'vitest'
import { interpolateLine } from './interpolate'

describe('interpolateLine', () => {
  it('linearly interpolates between two breakpoints', () => {
    const result = interpolateLine(
      [
        { freqHz: 0, dB: 0 },
        { freqHz: 100, dB: 10 },
      ],
      Float64Array.from([0, 25, 50, 75, 100]),
    )
    expect(Array.from(result)).toEqual([0, 2.5, 5, 7.5, 10])
  })

  it('holds the endpoint value flat outside the breakpoints range', () => {
    const result = interpolateLine(
      [
        { freqHz: 100, dB: 40 },
        { freqHz: 200, dB: 46 },
      ],
      Float64Array.from([0, 100, 200, 500]),
    )
    expect(Array.from(result)).toEqual([40, 40, 46, 46])
  })

  it('sorts unsorted breakpoints before interpolating', () => {
    const result = interpolateLine(
      [
        { freqHz: 100, dB: 10 },
        { freqHz: 0, dB: 0 },
      ],
      Float64Array.from([50]),
    )
    expect(result[0]).toBeCloseTo(5)
  })

  it('approximates a step edge via two closely-spaced breakpoints', () => {
    const result = interpolateLine(
      [
        { freqHz: 88_000_000 - 1, dB: 40 },
        { freqHz: 88_000_000, dB: 43.5 },
      ],
      Float64Array.from([87_000_000, 89_000_000]),
    )
    expect(result[0]).toBe(40)
    expect(result[1]).toBe(43.5)
  })

  it('returns zeros for an empty breakpoint list', () => {
    const result = interpolateLine([], Float64Array.from([1, 2, 3]))
    expect(Array.from(result)).toEqual([0, 0, 0])
  })
})
