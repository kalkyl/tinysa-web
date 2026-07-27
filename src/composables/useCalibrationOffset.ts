import { ref } from 'vue'

/** dB offset (e.g. antenna factor + cable loss) applied to every amplitude before display/peak-hold/save. */
const calibrationOffsetDb = ref(0)

export function useCalibrationOffset() {
  function applyOffset(amplitudesDbm: Float64Array): Float64Array {
    const offset = calibrationOffsetDb.value
    if (offset === 0) return amplitudesDbm
    return Float64Array.from(amplitudesDbm, (v) => v + offset)
  }

  return { calibrationOffsetDb, applyOffset }
}
