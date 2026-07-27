import { describe, expect, it } from 'vitest'
import { buildCurvesCsv } from './csv'

describe('buildCurvesCsv', () => {
  it('builds a header row plus one row per frequency', () => {
    const csv = buildCurvesCsv(Float64Array.from([100, 200, 300]), [
      { label: 'Live (dBm)', amplitudes: Float64Array.from([-90, -80, -70]) },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Frequency (Hz),Live (dBm)')
    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe('100,-90')
    expect(lines[3]).toBe('300,-70')
  })

  it('supports multiple curve columns', () => {
    const csv = buildCurvesCsv(Float64Array.from([100, 200]), [
      { label: 'Live (dBm)', amplitudes: Float64Array.from([-90, -80]) },
      { label: 'Peak hold (dBm)', amplitudes: Float64Array.from([-85, -75]) },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Frequency (Hz),Live (dBm),Peak hold (dBm)')
    expect(lines[1]).toBe('100,-90,-85')
    expect(lines[2]).toBe('200,-80,-75')
  })

  it('produces just a header for an empty frequency list', () => {
    const csv = buildCurvesCsv(new Float64Array(0), [{ label: 'Live (dBm)', amplitudes: new Float64Array(0) }])
    expect(csv).toBe('Frequency (Hz),Live (dBm)')
  })
})
