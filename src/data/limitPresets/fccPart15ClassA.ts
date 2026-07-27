import type { LimitPreset } from './types'
import { distanceDisclaimer } from './disclaimer'

const EPSILON_HZ = 1

/** FCC Part 15.109 Class A radiated emission limits, measured at 10m. */
export const FCC_PART15_CLASS_A: LimitPreset = {
  id: 'fcc-part15-classa-10m',
  name: 'FCC Part 15 Class A (10m)',
  unit: 'dBuV',
  disclaimer: distanceDisclaimer(10),
  breakpoints: [
    { freqHz: 30e6, dB: 39 },
    { freqHz: 88e6 - EPSILON_HZ, dB: 39 },
    { freqHz: 88e6, dB: 43.5 },
    { freqHz: 216e6 - EPSILON_HZ, dB: 43.5 },
    { freqHz: 216e6, dB: 46.5 },
    { freqHz: 960e6 - EPSILON_HZ, dB: 46.5 },
    { freqHz: 960e6, dB: 49.5 },
    { freqHz: 3000e6, dB: 49.5 },
  ],
}
