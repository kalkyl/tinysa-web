import { computed } from 'vue'
import { persistedRef } from '../utils/persistedRef'
import { useMeasurementStore } from './useMeasurementStore'

export type NoiseFloorTarget = 'live' | 'peak'

export const NOISE_FLOOR_MEASUREMENT_ID = 'noise-floor'

/**
 * There's exactly one subtraction source at a time — a saved measurement
 * (including the ambient "Capture now" snapshot, which is really just
 * another measurement, tagged `isNoiseFloor`, see NoiseFloorControls). Both
 * live and peak hold subtract from the *same* source's matching curve, so
 * they're always on the same scale (a relative dB delta) together, never one
 * relative and the other absolute.
 */
const subtractSourceId = persistedRef<string | null>('noiseFloor.subtractSourceId', null)
const enabled = persistedRef('noiseFloor.enabled', false)

/** Same length + matching endpoints — good enough to catch a baseline from a different sweep range/point count without requiring exact per-bin float equality. */
export function frequenciesMatch(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return false
  return a.length === 0 || (a[0] === b[0] && a[a.length - 1] === b[a.length - 1])
}

// Subtracts in the dB (log) domain, like the trace-math A-B function on a
// real spectrum analyzer — stable sweep-to-sweep, unlike linear-power
// subtraction, which amplifies noise into wild swings whenever live and
// baseline are close (subtracting two nearly-equal, individually-noisy
// numbers). The result is a *relative* dB delta, not an absolute power — see
// the `enabled` flag threaded through display code that skips the
// dBm-to-dBuV absolute-power offset for these values.
export function useNoiseFloor() {
  const { measurements } = useMeasurementStore()

  const sourceMeasurement = computed(() => measurements.value.find((m) => m.id === subtractSourceId.value) ?? null)

  function setSource(id: string | null): void {
    subtractSourceId.value = id
  }

  function setEnabled(value: boolean): void {
    enabled.value = value
  }

  function isBaselineCompatible(frequenciesHz: Float64Array): boolean {
    const source = sourceMeasurement.value
    return !!source && frequenciesMatch(source.frequenciesHz, frequenciesHz)
  }

  /** Whether applySubtraction would actually change these values — i.e. a source is selected, subtraction is on, AND its frequencies match this sweep. Display code uses this to decide whether a value is a relative dB delta (see formatAmplitude). */
  function isSubtractionActive(frequenciesHz: Float64Array): boolean {
    return enabled.value && isBaselineCompatible(frequenciesHz)
  }

  function applySubtraction(target: NoiseFloorTarget, frequenciesHz: Float64Array, amplitudesDbm: Float64Array): Float64Array {
    const source = sourceMeasurement.value
    if (!source || !isSubtractionActive(frequenciesHz)) return amplitudesDbm
    // Peak hold falls back to the source's live curve if it has no peak-hold
    // curve of its own — still coherent (just "how far above this floor"),
    // and keeps peak on the same scale as live rather than hidden/mismatched.
    const baseline = target === 'peak' ? source.peakHoldDbm ?? source.amplitudesDbm : source.amplitudesDbm
    if (baseline.length !== amplitudesDbm.length) return amplitudesDbm
    return Float64Array.from(amplitudesDbm, (v, i) => v - baseline[i])
  }

  return {
    subtractSourceId,
    enabled,
    sourceMeasurement,
    setSource,
    setEnabled,
    isBaselineCompatible,
    isSubtractionActive,
    applySubtraction,
  }
}
