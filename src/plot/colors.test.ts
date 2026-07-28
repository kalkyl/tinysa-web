import { describe, expect, it } from 'vitest'
import { waterfallColor } from './colors'

describe('waterfallColor', () => {
  it('maps 0 to the darkest step and 1 to the brightest step', () => {
    expect(waterfallColor(0)).toBe('rgb(13, 54, 107)') // #0d366b
    expect(waterfallColor(1)).toBe('rgb(205, 226, 251)') // #cde2fb
  })

  it('clamps out-of-range input instead of extrapolating', () => {
    expect(waterfallColor(-5)).toBe(waterfallColor(0))
    expect(waterfallColor(5)).toBe(waterfallColor(1))
  })

  it('interpolates smoothly between steps rather than jumping in bands', () => {
    const a = waterfallColor(0.5)
    const b = waterfallColor(0.51)
    const parse = (rgb: string) => rgb.match(/\d+/g)!.map(Number)
    const [ra, ga, ba] = parse(a)
    const [rb, gb, bb] = parse(b)
    expect(Math.abs(ra - rb)).toBeLessThan(5)
    expect(Math.abs(ga - gb)).toBeLessThan(5)
    expect(Math.abs(ba - bb)).toBeLessThan(5)
  })
})
