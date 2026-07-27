import { computed, shallowRef } from 'vue'
import { useStreaming } from './useStreaming'
import { useCalibrationOffset } from './useCalibrationOffset'
import { usePeakHold } from './usePeakHold'
import { useAveraging } from './useAveraging'
import { useNoiseFloor } from './useNoiseFloor'
import type { ScanRawFrame } from '../types/protocol'

const calibratedFrame = shallowRef<ScanRawFrame | null>(null)
/** Post-calibration, pre-noise-floor-subtraction — what "capture noise floor" snapshots. */
const preSubtractionFrame = shallowRef<ScanRawFrame | null>(null)

let wired = false

export function useLiveMeasurement() {
  const streaming = useStreaming()
  const calibration = useCalibrationOffset()
  const peakHold = usePeakHold()
  const averaging = useAveraging()
  const noiseFloor = useNoiseFloor()

  if (!wired) {
    wired = true
    streaming.onFrame((frame) => {
      const offsetApplied = calibration.applyOffset(frame.amplitudesDbm)
      preSubtractionFrame.value = { frequenciesHz: frame.frequenciesHz, amplitudesDbm: offsetApplied, timestampMs: frame.timestampMs }

      const amplitudesDbm = noiseFloor.applySubtraction(offsetApplied)
      calibratedFrame.value = { frequenciesHz: frame.frequenciesHz, amplitudesDbm, timestampMs: frame.timestampMs }
      peakHold.ingest(frame.frequenciesHz, amplitudesDbm)
      averaging.ingest(frame.frequenciesHz, amplitudesDbm)
    })
  }

  // What "Live" shows: the averaged curve when averaging is on, else the raw calibrated frame.
  const displayedFrame = computed<ScanRawFrame | null>(() => {
    if (averaging.enabled.value && averaging.averagedFrequenciesHz.value && averaging.averagedAmplitudesDbm.value) {
      return {
        frequenciesHz: averaging.averagedFrequenciesHz.value,
        amplitudesDbm: averaging.averagedAmplitudesDbm.value,
        timestampMs: calibratedFrame.value?.timestampMs ?? Date.now(),
      }
    }
    return calibratedFrame.value
  })

  // Not spreading averaging/noiseFloor: both have an `enabled` ref, and
  // averaging/peakHold both have `reset()` — would silently clobber each
  // other. Call useAveraging()/useNoiseFloor() directly for those (same
  // singleton state).
  return { ...streaming, ...calibration, ...peakHold, calibratedFrame, preSubtractionFrame, displayedFrame }
}
