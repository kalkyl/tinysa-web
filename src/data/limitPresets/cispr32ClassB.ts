import type { LimitPreset } from './types'
import { distanceDisclaimer } from './disclaimer'

const EPSILON_HZ = 1

/** CISPR 32 / EN 55032 Class B radiated emission limits, measured at 10m. */
export const CISPR32_CLASS_B_10M: LimitPreset = {
  id: 'cispr32-classb-10m',
  name: 'CISPR 32 Class B (10m)',
  unit: 'dBuV',
  disclaimer: distanceDisclaimer(10),
  breakpoints: [
    { freqHz: 30e6, dB: 30 },
    { freqHz: 230e6 - EPSILON_HZ, dB: 30 },
    { freqHz: 230e6, dB: 37 },
    { freqHz: 1000e6, dB: 37 },
  ],
}

/** CISPR 22/32's own documented 3m alternate-distance table (not a computed conversion). */
export const CISPR32_CLASS_B_3M: LimitPreset = {
  id: 'cispr32-classb-3m',
  name: 'CISPR 32 Class B (3m)',
  unit: 'dBuV',
  disclaimer: distanceDisclaimer(3),
  breakpoints: [
    { freqHz: 30e6, dB: 40 },
    { freqHz: 230e6 - EPSILON_HZ, dB: 40 },
    { freqHz: 230e6, dB: 47 },
    { freqHz: 1000e6, dB: 47 },
  ],
}
