import { shallowRef } from 'vue'
import { computeAverage } from '../utils/averaging'
import { persistedRef } from '../utils/persistedRef'

const enabled = persistedRef('averaging.enabled', false)
const windowSize = persistedRef('averaging.windowSize', 10)
const buffer = shallowRef<Float64Array[]>([])
const averagedFrequenciesHz = shallowRef<Float64Array | null>(null)
const averagedAmplitudesDbm = shallowRef<Float64Array | null>(null)

export function useAveraging() {
  function ingest(frequenciesHz: Float64Array, amplitudesDbm: Float64Array): void {
    if (!enabled.value) return
    let buf = buffer.value
    if (buf.length > 0 && buf[0].length !== amplitudesDbm.length) {
      buf = [] // bin count changed — old sweeps are no longer comparable
    }
    buf = [...buf, amplitudesDbm]
    if (buf.length > windowSize.value) {
      buf = buf.slice(buf.length - windowSize.value)
    }
    buffer.value = buf
    averagedFrequenciesHz.value = frequenciesHz
    averagedAmplitudesDbm.value = computeAverage(buf)
  }

  function reset(): void {
    buffer.value = []
    averagedFrequenciesHz.value = null
    averagedAmplitudesDbm.value = null
  }

  function setEnabled(value: boolean): void {
    enabled.value = value
  }

  return { enabled, windowSize, averagedFrequenciesHz, averagedAmplitudesDbm, ingest, reset, setEnabled }
}
