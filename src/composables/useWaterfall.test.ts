import { describe, expect, it } from 'vitest'
import { useWaterfall } from './useWaterfall'

describe('useWaterfall', () => {
  it('is disabled by default and ignores ingest() while disabled', () => {
    const { enabled, ingest, rows } = useWaterfall()
    expect(enabled.value).toBe(false)
    ingest(Float64Array.from([0, 1]), Float64Array.from([-90, -80]), 1000)
    expect(rows.value.length).toBe(0)
  })

  it('accumulates rows once enabled', () => {
    const { setEnabled, ingest, rows, clear } = useWaterfall()
    clear()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]), 1000)
    ingest(Float64Array.from([0]), Float64Array.from([-80]), 2000)
    expect(rows.value.length).toBe(2)
  })

  it('trims rows older than the current window relative to the latest ingested timestamp', () => {
    const { setEnabled, windowSeconds, ingest, rows, clear } = useWaterfall()
    clear()
    setEnabled(true)
    windowSeconds.value = 10
    ingest(Float64Array.from([0]), Float64Array.from([-90]), 0)
    ingest(Float64Array.from([0]), Float64Array.from([-90]), 5000)
    ingest(Float64Array.from([0]), Float64Array.from([-90]), 15_000) // now 15s in; cutoff is 5s
    expect(rows.value.map((r) => r.timestampMs)).toEqual([5000, 15_000])
  })

  it('clear() empties the buffer', () => {
    const { setEnabled, ingest, rows, clear } = useWaterfall()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]), 1000)
    expect(rows.value.length).toBeGreaterThan(0)
    clear()
    expect(rows.value.length).toBe(0)
  })

  it('setEnabled(false) clears the buffer', () => {
    const { setEnabled, ingest, rows } = useWaterfall()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]), 1000)
    expect(rows.value.length).toBeGreaterThan(0)
    setEnabled(false)
    expect(rows.value.length).toBe(0)
  })

  it('displayRows passes amplitudes through unchanged when no noise-floor subtraction is active', () => {
    const { setEnabled, ingest, displayRows, clear } = useWaterfall()
    clear()
    setEnabled(true)
    ingest(Float64Array.from([0, 1]), Float64Array.from([-90, -80]), 1000)
    expect(Array.from(displayRows.value[0].amplitudesDbm)).toEqual([-90, -80])
  })

  describe('colorRangeDbm (sensitivity)', () => {
    it('auto-fits to the buffered data with padding', () => {
      const { setEnabled, ingest, colorRangeDbm, clear } = useWaterfall()
      clear()
      setEnabled(true)
      ingest(Float64Array.from([0, 1]), Float64Array.from([-90, -30]), 1000)
      expect(colorRangeDbm.value.min).toBeLessThan(-90)
      expect(colorRangeDbm.value.max).toBeGreaterThan(-30)
    })

    it('falls back to the manual range when there is no data yet', () => {
      const { setEnabled, colorMinDbm, colorMaxDbm, colorRangeDbm, clear } = useWaterfall()
      clear()
      setEnabled(true)
      colorMinDbm.value = -100
      colorMaxDbm.value = -40
      expect(colorRangeDbm.value).toEqual({ min: -100, max: -40 })
    })

    it('uses the fixed manual range once colorAuto is disabled, ignoring buffered data', () => {
      const { setEnabled, ingest, colorAuto, colorMinDbm, colorMaxDbm, colorRangeDbm, clear } = useWaterfall()
      clear()
      setEnabled(true)
      ingest(Float64Array.from([0]), Float64Array.from([-30]), 1000)
      colorAuto.value = false
      colorMinDbm.value = -80
      colorMaxDbm.value = -20
      expect(colorRangeDbm.value).toEqual({ min: -80, max: -20 })
    })
  })
})
