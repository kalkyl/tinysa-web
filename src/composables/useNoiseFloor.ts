import { ref, shallowRef } from 'vue'

const baselineFrequenciesHz = shallowRef<Float64Array | null>(null)
const baselineAmplitudesDbm = shallowRef<Float64Array | null>(null)
const capturedAtMs = ref<number | null>(null)
const enabled = ref(false)

// Subtracts in the dB domain (not linear power) — a simplification, but matches
// what most hobbyist spectrum tools do and is fine for pre-compliance triage.
export function useNoiseFloor() {
  function capture(frequenciesHz: Float64Array, amplitudesDbm: Float64Array): void {
    baselineFrequenciesHz.value = frequenciesHz
    baselineAmplitudesDbm.value = Float64Array.from(amplitudesDbm)
    capturedAtMs.value = Date.now()
  }

  function clear(): void {
    baselineFrequenciesHz.value = null
    baselineAmplitudesDbm.value = null
    capturedAtMs.value = null
    enabled.value = false
  }

  function applySubtraction(amplitudesDbm: Float64Array): Float64Array {
    const baseline = baselineAmplitudesDbm.value
    if (!enabled.value || !baseline || baseline.length !== amplitudesDbm.length) {
      return amplitudesDbm
    }
    return Float64Array.from(amplitudesDbm, (v, i) => v - baseline[i])
  }

  return { baselineFrequenciesHz, baselineAmplitudesDbm, capturedAtMs, enabled, capture, clear, applySubtraction }
}
