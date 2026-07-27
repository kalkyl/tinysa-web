import { describe, expect, it } from 'vitest'
import { usePeakHold } from './usePeakHold'

describe('usePeakHold enable/disable', () => {
  it('is enabled by default and accumulates peak values', () => {
    const { enabled, ingest, peakAmplitudesDbm } = usePeakHold()
    expect(enabled.value).toBe(true)
    ingest(Float64Array.from([0, 1]), Float64Array.from([-90, -80]))
    ingest(Float64Array.from([0, 1]), Float64Array.from([-70, -95]))
    expect(Array.from(peakAmplitudesDbm.value!)).toEqual([-70, -80])
  })

  it('ignores ingest() while disabled, leaving the held peak untouched', () => {
    const { setEnabled, ingest, peakAmplitudesDbm } = usePeakHold()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]))
    const before = peakAmplitudesDbm.value
    setEnabled(false)
    ingest(Float64Array.from([0]), Float64Array.from([10])) // would dominate the peak if it were ingested
    expect(peakAmplitudesDbm.value).toBe(before)
  })

  it('reset() clears the accumulated peak', () => {
    const { reset, ingest, peakAmplitudesDbm, setEnabled } = usePeakHold()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]))
    expect(peakAmplitudesDbm.value).not.toBeNull()
    reset()
    expect(peakAmplitudesDbm.value).toBeNull()
  })

  it('disabling then re-enabling resumes accumulating instead of losing the held peak', () => {
    const { setEnabled, ingest, peakAmplitudesDbm, reset } = usePeakHold()
    reset()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-50]))
    setEnabled(false)
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]))
    expect(peakAmplitudesDbm.value![0]).toBe(-50) // higher of -50 and -90 survives
  })
})
