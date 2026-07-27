import type { LimitPreset } from './types'
import { distanceDisclaimer } from './disclaimer'

const EPSILON_HZ = 1

/** FCC Part 15.109 Class B radiated emission limits, measured at 3m. */
export const FCC_PART15_CLASS_B: LimitPreset = {
  id: 'fcc-part15-classb-3m',
  name: 'FCC Part 15 Class B (3m)',
  unit: 'dBuV',
  disclaimer: distanceDisclaimer(3),
  breakpoints: [
    { freqHz: 30e6, dB: 40 },
    { freqHz: 88e6 - EPSILON_HZ, dB: 40 },
    { freqHz: 88e6, dB: 43.5 },
    { freqHz: 216e6 - EPSILON_HZ, dB: 43.5 },
    { freqHz: 216e6, dB: 46 },
    { freqHz: 960e6 - EPSILON_HZ, dB: 46 },
    { freqHz: 960e6, dB: 54 },
    { freqHz: 3000e6, dB: 54 },
  ],
}
