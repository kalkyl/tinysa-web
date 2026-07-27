import { ref, shallowRef } from 'vue'
import { updatePeak } from '../utils/peakHold'

const enabled = ref(true)
const peakAmplitudesDbm = shallowRef<Float64Array | null>(null)
const peakFrequenciesHz = shallowRef<Float64Array | null>(null)
const wasResetByBinCountChange = ref(false)

export function usePeakHold() {
  function ingest(frequenciesHz: Float64Array, amplitudesDbm: Float64Array): void {
    if (!enabled.value) return
    const previous = peakAmplitudesDbm.value
    wasResetByBinCountChange.value = previous !== null && previous.length !== amplitudesDbm.length
    peakAmplitudesDbm.value = updatePeak(previous, amplitudesDbm)
    peakFrequenciesHz.value = frequenciesHz
  }

  function reset(): void {
    peakAmplitudesDbm.value = null
    peakFrequenciesHz.value = null
    wasResetByBinCountChange.value = false
  }

  function setEnabled(value: boolean): void {
    enabled.value = value
  }

  return { enabled, peakAmplitudesDbm, peakFrequenciesHz, wasResetByBinCountChange, ingest, reset, setEnabled }
}
