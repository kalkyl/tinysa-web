import { shallowRef } from 'vue'
import { persistedRef } from '../utils/persistedRef'
import type { PlotRange } from '../plot/PlotRenderer'

const auto = persistedRef('yAxis.auto', true)
const manualMinDbm = persistedRef('yAxis.manualMinDbm', -110)
const manualMaxDbm = persistedRef('yAxis.manualMaxDbm', 0)

// Only recomputes when data breaches the current bounds (not every sweep) to avoid axis jitter.
const committedAutoRange = shallowRef<PlotRange | null>(null)
const MIN_PADDING_DB = 5
const PADDING_FRACTION = 0.15

export function useYAxisRange() {
  /** Accepts every curve currently on the plot (live, peak hold, ...) so none of them can sit outside the auto-fitted range. */
  function computeRange(...amplitudeArrays: (Float64Array | null)[]): PlotRange {
    if (!auto.value) {
      return { min: manualMinDbm.value, max: manualMaxDbm.value }
    }

    let dataMin = Infinity
    let dataMax = -Infinity
    for (const amplitudesDbm of amplitudeArrays) {
      if (!amplitudesDbm) continue
      for (const v of amplitudesDbm) {
        if (v < dataMin) dataMin = v
        if (v > dataMax) dataMax = v
      }
    }
    if (dataMin === Infinity) {
      return committedAutoRange.value ?? { min: manualMinDbm.value, max: manualMaxDbm.value }
    }

    const current = committedAutoRange.value
    const needsRescale = !current || dataMin < current.min || dataMax > current.max
    if (needsRescale) {
      const padding = Math.max(MIN_PADDING_DB, (dataMax - dataMin) * PADDING_FRACTION)
      const next = { min: Math.floor(dataMin - padding), max: Math.ceil(dataMax + padding) }
      committedAutoRange.value = next
      return next
    }
    return current
  }

  /** Forces the next computeRange() call to re-fit from scratch (e.g. after a big sweep-config change). */
  function resetAutoRange(): void {
    committedAutoRange.value = null
  }

  return { auto, manualMinDbm, manualMaxDbm, computeRange, resetAutoRange }
}
