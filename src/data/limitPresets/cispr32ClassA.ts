import type { LimitPreset } from './types'
import { distanceDisclaimer } from './disclaimer'

const EPSILON_HZ = 1

// CISPR 32 / EN 55032 defines Class A radiated limits at 10m: 40, 47 dBµV/m across the same
// band edges as Class B. CISPR doesn't publish a 3m Class A table (unlike Class B, which
// has its own documented 3m alternate-distance table), so this is a computed +10dB offset.
/** CISPR 32 / EN 55032 Class A radiated emission limits, projected to 3m (computed, not an independently documented value). */
export const CISPR32_CLASS_A_3M: LimitPreset = {
  id: 'cispr32-classa-3m',
  name: 'CISPR 32 Class A (3m)',
  unit: 'dBuV',
  disclaimer: distanceDisclaimer(3),
  breakpoints: [
    { freqHz: 30e6, dB: 50 },
    { freqHz: 230e6 - EPSILON_HZ, dB: 50 },
    { freqHz: 230e6, dB: 57 },
    { freqHz: 1000e6, dB: 57 },
  ],
}
