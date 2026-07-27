import { describe, expect, it } from 'vitest'
import { useMarkers } from './useMarkers'

describe('useMarkers', () => {
  it('placing the active marker enables it and sets its frequency', () => {
    const { placeActiveMarkerAt, marker1, markerPoints } = useMarkers()
    placeActiveMarkerAt(100_000_000)
    expect(marker1.value).toEqual({ enabled: true, freqHz: 100_000_000 })
    expect(markerPoints.value).toEqual([{ id: 'm1', label: 'M1', freqHz: 100_000_000 }])
  })

  it('switching the active marker places subsequent clicks on marker 2', () => {
    const { setActiveMarker, placeActiveMarkerAt, marker2 } = useMarkers()
    setActiveMarker(2)
    placeActiveMarkerAt(200_000_000)
    expect(marker2.value).toEqual({ enabled: true, freqHz: 200_000_000 })
  })

  it('clearing a marker disables it and removes it from markerPoints', () => {
    const { placeActiveMarkerAt, setActiveMarker, clear, markerPoints } = useMarkers()
    setActiveMarker(1)
    placeActiveMarkerAt(50_000_000)
    clear(1)
    expect(markerPoints.value.some((m) => m.id === 'm1')).toBe(false)
  })
})
