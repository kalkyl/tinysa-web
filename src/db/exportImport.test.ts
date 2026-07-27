import { describe, expect, it } from 'vitest'
import { fromExportFile, toExportFile } from './exportImport'
import type { StoredMeasurement } from '../types/measurement'

function makeMeasurement(id: string): StoredMeasurement {
  return {
    id,
    schemaVersion: 1,
    name: 'Bench test',
    note: 'some note',
    createdAt: 1000,
    updatedAt: 1000,
    deviceModel: 'tinysa-basic',
    sweep: { startHz: 88e6, stopHz: 108e6, points: 3, rbwKHz: 'auto' },
    calibrationOffsetDb: 6,
    frequenciesHz: Float64Array.from([88e6, 98e6, 108e6]),
    amplitudesDbm: Float64Array.from([-90, -80, -90]),
    peakHoldDbm: Float64Array.from([-85, -75, -85]),
  }
}

describe('toExportFile / fromExportFile round trip', () => {
  it('round-trips a measurement, preserving values but assigning a new id', () => {
    const original = makeMeasurement('original-id')
    const exported = toExportFile([original])
    expect(exported.formatVersion).toBe(1)

    const imported = fromExportFile(exported)
    expect(imported).toHaveLength(1)
    expect(imported[0].id).not.toBe('original-id')
    expect(imported[0].name).toBe('Bench test')
    expect(imported[0].note).toBe('some note')
    expect(Array.from(imported[0].frequenciesHz)).toEqual([88e6, 98e6, 108e6])
    expect(Array.from(imported[0].amplitudesDbm)).toEqual([-90, -80, -90])
    expect(imported[0].peakHoldDbm && Array.from(imported[0].peakHoldDbm)).toEqual([-85, -75, -85])
  })

  it('handles a null peakHoldDbm', () => {
    const original = { ...makeMeasurement('id2'), peakHoldDbm: null }
    const imported = fromExportFile(toExportFile([original]))
    expect(imported[0].peakHoldDbm).toBeNull()
  })

  it('rejects a malformed import file rather than silently accepting bad data', () => {
    expect(() => fromExportFile({ formatVersion: 1, exportedAt: 1, measurements: [{ garbage: true }] })).toThrow()
    expect(() => fromExportFile({ not: 'even close' })).toThrow()
    expect(() => fromExportFile(null)).toThrow()
  })

  it('rejects an unsupported formatVersion', () => {
    expect(() => fromExportFile({ formatVersion: 2, exportedAt: 1, measurements: [] })).toThrow()
  })
})
