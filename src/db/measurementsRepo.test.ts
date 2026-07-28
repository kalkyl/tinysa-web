import { describe, expect, it } from 'vitest'
import { deleteMeasurement, listMeasurements, renameMeasurement, saveMeasurement } from './measurementsRepo'
import type { StoredMeasurement } from '../types/measurement'

function makeMeasurement(overrides: Partial<StoredMeasurement> = {}): StoredMeasurement {
  return {
    id: overrides.id ?? `m-${Math.random()}`,
    schemaVersion: 1,
    name: 'Test measurement',
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deviceModel: 'tinysa-basic',
    sweep: { startHz: 88e6, stopHz: 108e6, points: 10, rbwKHz: 'auto' },
    calibrationOffsetDb: 0,
    averagingWindowSize: null,
    frequenciesHz: Float64Array.from([88e6, 98e6, 108e6]),
    amplitudesDbm: Float64Array.from([-90, -80, -90]),
    peakHoldDbm: null,
    ...overrides,
  }
}

describe('measurementsRepo', () => {
  it('saves and lists a measurement, newest first', async () => {
    const older = makeMeasurement({ id: 'older', createdAt: 1000 })
    const newer = makeMeasurement({ id: 'newer', createdAt: 2000 })
    await saveMeasurement(older)
    await saveMeasurement(newer)

    const all = await listMeasurements()
    const ids = all.map((m) => m.id)
    expect(ids.indexOf('newer')).toBeLessThan(ids.indexOf('older'))
  })

  it('preserves typed arrays through save/list round-trip', async () => {
    const m = makeMeasurement({ id: 'typed-array-check' })
    await saveMeasurement(m)
    const all = await listMeasurements()
    const found = all.find((x) => x.id === 'typed-array-check')
    expect(found?.frequenciesHz).toBeInstanceOf(Float64Array)
    expect(Array.from(found!.amplitudesDbm)).toEqual([-90, -80, -90])
  })

  it('renames and updates the note of an existing measurement', async () => {
    const m = makeMeasurement({ id: 'to-rename', name: 'Old name', note: 'old note' })
    await saveMeasurement(m)
    await renameMeasurement('to-rename', 'New name', 'new note')
    const all = await listMeasurements()
    const found = all.find((x) => x.id === 'to-rename')
    expect(found?.name).toBe('New name')
    expect(found?.note).toBe('new note')
  })

  it('deletes a measurement', async () => {
    const m = makeMeasurement({ id: 'to-delete' })
    await saveMeasurement(m)
    await deleteMeasurement('to-delete')
    const all = await listMeasurements()
    expect(all.some((x) => x.id === 'to-delete')).toBe(false)
  })
})
