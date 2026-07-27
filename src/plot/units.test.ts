import { describe, expect, it } from 'vitest'
import {
  convertArrayFromDbm,
  convertArrayUnit,
  convertFromDbm,
  convertToDbm,
  convertUnit,
  dbmToDbuV,
  dbuVToDbm,
  formatAmplitude,
} from './units'

describe('dBm <-> dBuV conversion', () => {
  it('round-trips', () => {
    expect(dbuVToDbm(dbmToDbuV(-73.5))).toBeCloseTo(-73.5)
  })

  it('applies the 50 ohm offset', () => {
    expect(dbmToDbuV(0)).toBeCloseTo(107)
    expect(dbuVToDbm(107)).toBeCloseTo(0)
  })
})

describe('convertFromDbm / convertToDbm', () => {
  it('passes dBm through unchanged', () => {
    expect(convertFromDbm(-90, 'dBm')).toBe(-90)
    expect(convertToDbm(-90, 'dBm')).toBe(-90)
  })

  it('converts to/from dBuV', () => {
    expect(convertFromDbm(-90, 'dBuV')).toBeCloseTo(17)
    expect(convertToDbm(17, 'dBuV')).toBeCloseTo(-90)
  })
})

describe('convertArrayFromDbm', () => {
  it('returns the same array reference for dBm (no-op)', () => {
    const values = Float64Array.from([-90, -80])
    expect(convertArrayFromDbm(values, 'dBm')).toBe(values)
  })

  it('converts every element for dBuV', () => {
    const values = Float64Array.from([-90, -80])
    const result = convertArrayFromDbm(values, 'dBuV')
    expect(Array.from(result).map((v) => Math.round(v))).toEqual([17, 27])
  })
})

describe('convertUnit / convertArrayUnit', () => {
  it('is a no-op when units match', () => {
    expect(convertUnit(-90, 'dBm', 'dBm')).toBe(-90)
  })

  it('converts between arbitrary from/to units via the shared dBm bridge', () => {
    expect(convertUnit(-90, 'dBm', 'dBuV')).toBeCloseTo(17)
    expect(convertUnit(17, 'dBuV', 'dBm')).toBeCloseTo(-90)
  })

  it('converts every element of an array', () => {
    const values = Float64Array.from([-90, -80])
    const result = convertArrayUnit(values, 'dBm', 'dBuV')
    expect(Array.from(result).map((v) => Math.round(v))).toEqual([17, 27])
  })
})

describe('formatAmplitude', () => {
  it('formats dBm', () => {
    expect(formatAmplitude(-73.6875, 'dBm')).toBe('-74 dBm')
  })
  it('formats dBuV with the mu sign', () => {
    expect(formatAmplitude(33.3, 'dBuV')).toBe('33 dBµV')
  })
})
