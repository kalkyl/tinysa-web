import type { DeviceProfile } from './types'
import { tinySABasicProfile } from './basic'
import { tinySAUltraProfile } from './ultra'

export interface ModelDetectionResult {
  profile: DeviceProfile
  /** False when we had to guess (fell back to Basic) rather than positively identify the model. */
  recognized: boolean
}

/** Detects device model from a `version`/`info` response's text. */
export function detectModel(infoText: string): ModelDetectionResult {
  if (/tinysa\s*4/i.test(infoText) || /ultra/i.test(infoText)) {
    return { profile: tinySAUltraProfile, recognized: true }
  }
  if (/tinysa/i.test(infoText)) {
    return { profile: tinySABasicProfile, recognized: true }
  }
  return { profile: tinySABasicProfile, recognized: false }
}
