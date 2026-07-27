import { describe, expect, it } from 'vitest'
import { useAveraging } from './useAveraging'

describe('useAveraging', () => {
  it('does nothing while disabled', () => {
    const { ingest, averagedAmplitudesDbm, setEnabled } = useAveraging()
    setEnabled(false)
    ingest(Float64Array.from([0, 1]), Float64Array.from([-90, -80]))
    expect(averagedAmplitudesDbm.value).toBeNull()
  })

  it('averages across ingested sweeps once enabled', () => {
    const { ingest, averagedAmplitudesDbm, setEnabled, windowSize } = useAveraging()
    setEnabled(true)
    windowSize.value = 10
    ingest(Float64Array.from([0, 1]), Float64Array.from([-90, -80]))
    ingest(Float64Array.from([0, 1]), Float64Array.from([-70, -60]))
    expect(Array.from(averagedAmplitudesDbm.value!)).toEqual([-80, -70])
  })

  it('resets the buffer when the bin count changes', () => {
    const { ingest, averagedAmplitudesDbm, setEnabled } = useAveraging()
    setEnabled(true)
    ingest(Float64Array.from([0, 1]), Float64Array.from([-90, -80]))
    ingest(Float64Array.from([0, 1, 2]), Float64Array.from([-60, -60, -60]))
    expect(Array.from(averagedAmplitudesDbm.value!)).toEqual([-60, -60, -60])
  })

  it('disabling then re-enabling resumes averaging instead of losing the buffer', () => {
    const { ingest, averagedAmplitudesDbm, setEnabled, reset } = useAveraging()
    reset()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]))
    setEnabled(false)
    ingest(Float64Array.from([0]), Float64Array.from([10])) // ignored while disabled
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-70]))
    expect(averagedAmplitudesDbm.value![0]).toBeCloseTo(-80) // mean of -90 and -70, not influenced by the ignored 10
  })

  it('reset() clears the buffer', () => {
    const { ingest, averagedAmplitudesDbm, setEnabled, reset } = useAveraging()
    setEnabled(true)
    ingest(Float64Array.from([0]), Float64Array.from([-90]))
    reset()
    expect(averagedAmplitudesDbm.value).toBeNull()
  })
})
