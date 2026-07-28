import { computed, ref } from 'vue'
import * as repo from '../db/measurementsRepo'
import { fromExportFile, toExportFile } from '../db/exportImport'
import type { StoredMeasurement } from '../types/measurement'

export interface OverlaySeries {
  id: string
  label: string
  frequenciesHz: Float64Array
  /** Always dBm — already calibration-applied at save time. */
  amplitudesDbm: Float64Array
}

const measurements = ref<StoredMeasurement[]>([])
const loaded = ref(false)
const visibleLiveOverlayIds = ref<Set<string>>(new Set())
const visiblePeakOverlayIds = ref<Set<string>>(new Set())

async function refresh(): Promise<void> {
  measurements.value = await repo.listMeasurements()
  loaded.value = true
}

export function useMeasurementStore() {
  if (!loaded.value) {
    void refresh()
  }

  async function save(measurement: StoredMeasurement): Promise<void> {
    await repo.saveMeasurement(measurement)
    await refresh()
  }

  async function remove(id: string): Promise<void> {
    await repo.deleteMeasurement(id)
    for (const set of [visibleLiveOverlayIds, visiblePeakOverlayIds]) {
      const next = new Set(set.value)
      next.delete(id)
      set.value = next
    }
    await refresh()
  }

  async function rename(id: string, name: string, note: string): Promise<void> {
    await repo.renameMeasurement(id, name, note)
    await refresh()
  }

  function toggleOverlay(id: string, visible: boolean): void {
    const next = new Set(visibleLiveOverlayIds.value)
    if (visible) next.add(id)
    else next.delete(id)
    visibleLiveOverlayIds.value = next
  }

  function togglePeakOverlay(id: string, visible: boolean): void {
    const next = new Set(visiblePeakOverlayIds.value)
    if (visible) next.add(id)
    else next.delete(id)
    visiblePeakOverlayIds.value = next
  }

  function isOverlayVisible(id: string): boolean {
    return visibleLiveOverlayIds.value.has(id)
  }

  function isPeakOverlayVisible(id: string): boolean {
    return visiblePeakOverlayIds.value.has(id)
  }

  // The noise-floor ambient capture (see useNoiseFloor) is a measurement
  // behind the scenes, but not one the user consciously saved — keep it out
  // of the visible list and bulk exports.
  const visibleMeasurements = computed(() => measurements.value.filter((m) => !m.isNoiseFloor))

  function exportAllJson(): string {
    return JSON.stringify(toExportFile(visibleMeasurements.value), null, 2)
  }

  function exportOneJson(id: string): string | null {
    const m = measurements.value.find((x) => x.id === id)
    return m ? JSON.stringify(toExportFile([m]), null, 2) : null
  }

  /** Returns how many measurements were imported; throws if the file is malformed. */
  async function importJson(text: string): Promise<number> {
    const imported = fromExportFile(JSON.parse(text))
    for (const m of imported) {
      await repo.saveMeasurement(m)
    }
    await refresh()
    return imported.length
  }

  const overlaySeries = computed<OverlaySeries[]>(() => {
    const series: OverlaySeries[] = []
    for (const m of measurements.value) {
      if (visibleLiveOverlayIds.value.has(m.id)) {
        series.push({ id: `${m.id}-live`, label: m.name, frequenciesHz: m.frequenciesHz, amplitudesDbm: m.amplitudesDbm })
      }
      if (visiblePeakOverlayIds.value.has(m.id) && m.peakHoldDbm) {
        series.push({
          id: `${m.id}-peak`,
          label: `${m.name} (peak hold)`,
          frequenciesHz: m.frequenciesHz,
          amplitudesDbm: m.peakHoldDbm,
        })
      }
    }
    return series
  })

  return {
    measurements,
    visibleMeasurements,
    refresh,
    save,
    remove,
    rename,
    toggleOverlay,
    togglePeakOverlay,
    isOverlayVisible,
    isPeakOverlayVisible,
    overlaySeries,
    exportAllJson,
    exportOneJson,
    importJson,
  }
}
