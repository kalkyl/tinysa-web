import { computed, shallowRef } from 'vue'
import { useStreaming } from './useStreaming'
import { useCalibrationOffset } from './useCalibrationOffset'
import { usePeakHold } from './usePeakHold'
import { useAveraging } from './useAveraging'
import { useNoiseFloor } from './useNoiseFloor'
import { useWaterfall } from './useWaterfall'
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
  const waterfall = useWaterfall()

  if (!wired) {
    wired = true
    streaming.onFrame((frame) => {
      const offsetApplied = calibration.applyOffset(frame.amplitudesDbm)
      preSubtractionFrame.value = { frequenciesHz: frame.frequenciesHz, amplitudesDbm: offsetApplied, timestampMs: frame.timestampMs }
      calibratedFrame.value = { frequenciesHz: frame.frequenciesHz, amplitudesDbm: offsetApplied, timestampMs: frame.timestampMs }
      // Peak hold, averaging, and the waterfall all accumulate the raw
      // calibrated signal — noise-floor subtraction is applied to each trace
      // independently, at display time, so live/peak can each have their own
      // baseline.
      peakHold.ingest(frame.frequenciesHz, offsetApplied)
      averaging.ingest(frame.frequenciesHz, offsetApplied)
      waterfall.ingest(frame.frequenciesHz, offsetApplied, frame.timestampMs)
    })
  }

  // What "Live" shows: the averaged curve when averaging is on, else the raw
  // calibrated frame — with the 'live' noise-floor baseline subtracted.
  const displayedFrame = computed<ScanRawFrame | null>(() => {
    const base =
      averaging.enabled.value && averaging.averagedFrequenciesHz.value && averaging.averagedAmplitudesDbm.value
        ? {
            frequenciesHz: averaging.averagedFrequenciesHz.value,
            amplitudesDbm: averaging.averagedAmplitudesDbm.value,
            timestampMs: calibratedFrame.value?.timestampMs ?? Date.now(),
          }
        : calibratedFrame.value
    if (!base) return null
    return { ...base, amplitudesDbm: noiseFloor.applySubtraction('live', base.frequenciesHz, base.amplitudesDbm) }
  })

  // What "Peak hold" shows: the raw running max, with the 'peak' noise-floor
  // baseline subtracted. peakHold.peakAmplitudesDbm itself stays raw/absolute
  // (e.g. for saving a measurement) — this is a display-only view.
  const displayedPeakAmplitudesDbm = computed<Float64Array | null>(() => {
    const frequenciesHz = peakHold.peakFrequenciesHz.value
    const amplitudesDbm = peakHold.peakAmplitudesDbm.value
    if (!frequenciesHz || !amplitudesDbm) return amplitudesDbm
    return noiseFloor.applySubtraction('peak', frequenciesHz, amplitudesDbm)
  })

  // Not spreading averaging/noiseFloor: both have an `enabled` ref, and
  // averaging/peakHold both have `reset()` — would silently clobber each
  // other. Call useAveraging()/useNoiseFloor() directly for those (same
  // singleton state).
  return { ...streaming, ...calibration, ...peakHold, calibratedFrame, preSubtractionFrame, displayedFrame, displayedPeakAmplitudesDbm }
}
