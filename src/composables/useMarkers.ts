import { computed, ref } from 'vue'

export type MarkerId = 1 | 2

interface MarkerState {
  enabled: boolean
  freqHz: number
}

export interface MarkerPoint {
  id: string
  label: string
  freqHz: number
}

const marker1 = ref<MarkerState>({ enabled: false, freqHz: 0 })
const marker2 = ref<MarkerState>({ enabled: false, freqHz: 0 })
const activeMarker = ref<MarkerId>(1)

function stateFor(id: MarkerId) {
  return id === 1 ? marker1 : marker2
}

export function useMarkers() {
  function setMarkerFreq(id: MarkerId, freqHz: number): void {
    stateFor(id).value = { enabled: true, freqHz }
  }

  function placeActiveMarkerAt(freqHz: number): void {
    setMarkerFreq(activeMarker.value, freqHz)
  }

  function setActiveMarker(id: MarkerId): void {
    activeMarker.value = id
  }

  function setEnabled(id: MarkerId, enabled: boolean): void {
    const state = stateFor(id)
    state.value = { ...state.value, enabled }
  }

  function clear(id: MarkerId): void {
    stateFor(id).value = { enabled: false, freqHz: 0 }
  }

  const markerPoints = computed<MarkerPoint[]>(() => {
    const points: MarkerPoint[] = []
    if (marker1.value.enabled) points.push({ id: 'm1', label: 'M1', freqHz: marker1.value.freqHz })
    if (marker2.value.enabled) points.push({ id: 'm2', label: 'M2', freqHz: marker2.value.freqHz })
    return points
  })

  return { marker1, marker2, activeMarker, placeActiveMarkerAt, setMarkerFreq, setActiveMarker, setEnabled, clear, markerPoints }
}
