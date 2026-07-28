import { describe, expect, it } from 'vitest'
import { useNoiseFloor } from './useNoiseFloor'
import { useMeasurementStore } from './useMeasurementStore'
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
    sweep: { startHz: 0, stopHz: 1, points: 2, rbwKHz: 'auto' },
    calibrationOffsetDb: 0,
    averagingWindowSize: null,
    frequenciesHz: Float64Array.from([0, 1]),
    amplitudesDbm: Float64Array.from([-90, -85]),
    peakHoldDbm: null,
    ...overrides,
  }
}

describe('useNoiseFloor', () => {
  it('passes amplitudes through unchanged when disabled or no source selected', () => {
    const { applySubtraction, setSource, setEnabled } = useNoiseFloor()
    setSource(null)
    setEnabled(false)
    const freqs = Float64Array.from([0, 1])
    const amplitudes = Float64Array.from([-90, -80])
    expect(applySubtraction('live', freqs, amplitudes)).toBe(amplitudes)
    setEnabled(true)
    expect(applySubtraction('live', freqs, amplitudes)).toBe(amplitudes) // still no source
  })

  it('subtracts the source measurement once selected and enabled', async () => {
    const { save } = useMeasurementStore()
    const { setSource, setEnabled, applySubtraction } = useNoiseFloor()
    const freqs = Float64Array.from([0, 1])
    const m = makeMeasurement({ id: 'src-1', frequenciesHz: freqs, amplitudesDbm: Float64Array.from([-90, -85]) })
    await save(m)
    setSource('src-1')
    setEnabled(true)
    const result = applySubtraction('live', freqs, Float64Array.from([-70, -60]))
    expect(Array.from(result)).toEqual([20, 25])
  })

  it('falls back to the live curve for peak hold when the source has no peak-hold curve of its own', async () => {
    const { save } = useMeasurementStore()
    const { setSource, setEnabled, applySubtraction } = useNoiseFloor()
    const freqs = Float64Array.from([0, 1])
    const m = makeMeasurement({ id: 'src-2', frequenciesHz: freqs, amplitudesDbm: Float64Array.from([-90, -85]), peakHoldDbm: null })
    await save(m)
    setSource('src-2')
    setEnabled(true)
    // Same baseline values used for both, since there's no dedicated peak-hold curve.
    expect(Array.from(applySubtraction('live', freqs, Float64Array.from([-70, -60])))).toEqual([20, 25])
    expect(Array.from(applySubtraction('peak', freqs, Float64Array.from([-70, -60])))).toEqual([20, 25])
  })

  it('uses a dedicated peak-hold curve for the peak target when the source has one', async () => {
    const { save } = useMeasurementStore()
    const { setSource, setEnabled, applySubtraction } = useNoiseFloor()
    const freqs = Float64Array.from([0, 1])
    const m = makeMeasurement({
      id: 'src-3',
      frequenciesHz: freqs,
      amplitudesDbm: Float64Array.from([-90, -85]),
      peakHoldDbm: Float64Array.from([-95, -80]),
    })
    await save(m)
    setSource('src-3')
    setEnabled(true)
    expect(Array.from(applySubtraction('live', freqs, Float64Array.from([-70, -60])))).toEqual([20, 25])
    expect(Array.from(applySubtraction('peak', freqs, Float64Array.from([-70, -60])))).toEqual([25, 20])
  })

  it('skips subtraction if the frequency range no longer matches the source', async () => {
    const { save } = useMeasurementStore()
    const { setSource, setEnabled, applySubtraction } = useNoiseFloor()
    const m = makeMeasurement({ id: 'src-4', frequenciesHz: Float64Array.from([0, 100]) })
    await save(m)
    setSource('src-4')
    setEnabled(true)
    const differentRange = Float64Array.from([0, 200])
    const amplitudes = Float64Array.from([-70, -60])
    expect(applySubtraction('live', differentRange, amplitudes)).toBe(amplitudes)
  })

  it('is mutually exclusive across sources — selecting a new one replaces the old', async () => {
    const { save } = useMeasurementStore()
    const { setSource, setEnabled, applySubtraction, subtractSourceId } = useNoiseFloor()
    const freqs = Float64Array.from([0, 1])
    await save(makeMeasurement({ id: 'src-a', frequenciesHz: freqs, amplitudesDbm: Float64Array.from([-90, -85]) }))
    await save(makeMeasurement({ id: 'src-b', frequenciesHz: freqs, amplitudesDbm: Float64Array.from([-50, -50]) }))

    setSource('src-a')
    setEnabled(true)
    expect(Array.from(applySubtraction('live', freqs, Float64Array.from([-70, -60])))).toEqual([20, 25])

    setSource('src-b')
    expect(subtractSourceId.value).toBe('src-b')
    expect(Array.from(applySubtraction('live', freqs, Float64Array.from([-70, -60])))).toEqual([-20, -10])
  })

  it('setSource(null) + setEnabled(false) clears subtraction without touching the underlying measurement', async () => {
    const { save, measurements } = useMeasurementStore()
    const { setSource, setEnabled, applySubtraction } = useNoiseFloor()
    const freqs = Float64Array.from([0, 1])
    await save(makeMeasurement({ id: 'src-5', frequenciesHz: freqs, amplitudesDbm: Float64Array.from([-90, -85]) }))
    setSource('src-5')
    setEnabled(true)
    setSource(null)
    setEnabled(false)
    const amplitudes = Float64Array.from([-70, -60])
    expect(applySubtraction('live', freqs, amplitudes)).toBe(amplitudes)
    // The measurement itself is untouched — re-selecting it needs no re-capture.
    expect(measurements.value.find((m) => m.id === 'src-5')).toBeDefined()
  })
})
