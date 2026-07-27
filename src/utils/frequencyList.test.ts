import { describe, expect, it } from 'vitest'
import { computeFrequencyList } from './frequencyList'

describe('computeFrequencyList', () => {
  it('spaces points evenly between start and stop inclusive', () => {
    const result = computeFrequencyList(0, 100, 5)
    expect(Array.from(result)).toEqual([0, 25, 50, 75, 100])
  })

  it('handles a single point', () => {
    const result = computeFrequencyList(1000, 2000, 1)
    expect(Array.from(result)).toEqual([1000])
  })
})
