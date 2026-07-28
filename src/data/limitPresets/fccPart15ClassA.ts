import type { LimitPreset } from './types'
import { distanceDisclaimer } from './disclaimer'

const EPSILON_HZ = 1

// FCC Part 15.109 defines Class A radiated limits at 10m: 39, 43.5, 46.5, 49.5 dBµV/m
// across the same band edges as Class B. FCC doesn't publish a 3m Class A table (Class A
// is inherently a 10m-measurement class), so this is a computed +10dB offset — a rounded
// approximation of the 20*log10(10/3)≈10.5dB inverse-distance relationship in 15.31(f).
/** FCC Part 15.109 Class A radiated emission limits, projected to 3m (computed, not an independently documented value). */
export const FCC_PART15_CLASS_A_3M: LimitPreset = {
  id: 'fcc-part15-classa-3m',
  name: 'FCC Part 15 Class A (3m)',
  unit: 'dBuV',
  disclaimer: distanceDisclaimer(3),
  breakpoints: [
    { freqHz: 30e6, dB: 49 },
    { freqHz: 88e6 - EPSILON_HZ, dB: 49 },
    { freqHz: 88e6, dB: 53.5 },
    { freqHz: 216e6 - EPSILON_HZ, dB: 53.5 },
    { freqHz: 216e6, dB: 56.5 },
    { freqHz: 960e6 - EPSILON_HZ, dB: 56.5 },
    { freqHz: 960e6, dB: 59.5 },
    { freqHz: 3000e6, dB: 59.5 },
  ],
}
