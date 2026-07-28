import { persistedRef } from '../utils/persistedRef'

export interface HorizontalMarker {
  id: string
  /** Absolute dBm normally, or a plain relative delta if placed while subtracting — see PlotCanvas. */
  valueDbm: number
}

const markers = persistedRef<HorizontalMarker[]>('plot.horizontalMarkers', [])

export function useHorizontalMarkers() {
  function add(valueDbm: number): string {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())
    markers.value = [...markers.value, { id, valueDbm }]
    return id
  }

  function setValue(id: string, valueDbm: number): void {
    markers.value = markers.value.map((m) => (m.id === id ? { ...m, valueDbm } : m))
  }

  function remove(id: string): void {
    markers.value = markers.value.filter((m) => m.id !== id)
  }

  function clear(): void {
    markers.value = []
  }

  return { markers, add, setValue, remove, clear }
}
