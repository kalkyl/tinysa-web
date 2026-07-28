import { computed, shallowRef, watch } from 'vue'
import { persistedRef } from '../utils/persistedRef'
import { useNoiseFloor } from './useNoiseFloor'

export interface WaterfallRow {
  frequenciesHz: Float64Array
  amplitudesDbm: Float64Array
  timestampMs: number
}

const enabled = persistedRef('waterfall.enabled', false)
const windowSeconds = persistedRef('waterfall.windowSeconds', 20)
const rows = shallowRef<WaterfallRow[]>([])

// "Sensitivity": the dB range the color ramp is normalized against — independent of the
// main plot's Y-axis, so it can be zoomed to whatever level range is of interest.
const colorAuto = persistedRef('waterfall.colorAuto', true)
const colorMinDbm = persistedRef('waterfall.colorMinDbm', -100)
const colorMaxDbm = persistedRef('waterfall.colorMaxDbm', -40)

const MIN_PADDING_DB = 5
const PADDING_FRACTION = 0.15

let wired = false

export function useWaterfall() {
  const noiseFloor = useNoiseFloor()

  function trimToNow(): void {
    const cutoffMs = Date.now() - windowSeconds.value * 1000
    rows.value = rows.value.filter((r) => r.timestampMs >= cutoffMs)
  }

  if (!wired) {
    wired = true
    // Shrinking the window should drop stale rows immediately, not wait for the next sweep.
    watch(windowSeconds, trimToNow)
  }

  /** Stores the raw calibrated (absolute) curve — noise-floor subtraction is re-applied at display time, same as the live trace. */
  function ingest(frequenciesHz: Float64Array, amplitudesDbm: Float64Array, timestampMs: number): void {
    if (!enabled.value) return
    const cutoffMs = timestampMs - windowSeconds.value * 1000
    rows.value = [...rows.value, { frequenciesHz, amplitudesDbm, timestampMs }].filter((r) => r.timestampMs >= cutoffMs)
  }

  function clear(): void {
    rows.value = []
  }

  // Disabling just pauses ingestion (see ingest()) — the buffer survives a temporary
  // toggle, and just ages out naturally against the window once re-enabled.
  function setEnabled(value: boolean): void {
    enabled.value = value
  }

  // Re-evaluated against the *current* baseline/toggle state on every read, same as the
  // live trace — not frozen at capture time. A row whose own sweep no longer matches the
  // active baseline just falls back to its raw value (see useNoiseFloor.applySubtraction).
  const displayRows = computed<WaterfallRow[]>(() =>
    rows.value.map((row) => ({
      ...row,
      amplitudesDbm: noiseFloor.applySubtraction('live', row.frequenciesHz, row.amplitudesDbm),
    })),
  )

  const colorRangeDbm = computed<{ min: number; max: number }>(() => {
    if (!colorAuto.value) return { min: colorMinDbm.value, max: colorMaxDbm.value }
    let min = Infinity
    let max = -Infinity
    for (const row of displayRows.value) {
      for (const v of row.amplitudesDbm) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    if (min === Infinity) return { min: colorMinDbm.value, max: colorMaxDbm.value }
    const padding = Math.max(MIN_PADDING_DB, (max - min) * PADDING_FRACTION)
    return { min: min - padding, max: max + padding }
  })

  return {
    enabled,
    windowSeconds,
    rows,
    displayRows,
    colorAuto,
    colorMinDbm,
    colorMaxDbm,
    colorRangeDbm,
    ingest,
    clear,
    setEnabled,
  }
}
