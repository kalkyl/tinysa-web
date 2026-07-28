import { computed } from 'vue'
import { useSweepConfig } from './useSweepConfig'
import { useNoiseFloor } from './useNoiseFloor'
import { computeFrequencyList } from '../utils/frequencyList'

/**
 * Whether the live trace is currently a relative dB delta rather than an
 * absolute dBm/dBuV reading (see useNoiseFloor). Based on the configured
 * sweep rather than an actual live frame, so it's correct even before
 * streaming starts. Anything drawn in absolute units — reference lines,
 * measurement overlays, the dBm/dBuV selector — is on the wrong scale
 * while this is true.
 */
export function useSubtractModeActive() {
  const { sweepConfig } = useSweepConfig()
  const noiseFloor = useNoiseFloor()

  return computed(() => {
    const cfg = sweepConfig.value
    const frequenciesHz = computeFrequencyList(cfg.startHz, cfg.stopHz, cfg.points)
    return noiseFloor.isSubtractionActive(frequenciesHz)
  })
}
