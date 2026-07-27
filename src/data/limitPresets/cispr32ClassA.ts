import type { LimitPreset } from './types'
import { distanceDisclaimer } from './disclaimer'

const EPSILON_HZ = 1

/** CISPR 32 / EN 55032 Class A radiated emission limits, measured at 10m. */
export const CISPR32_CLASS_A: LimitPreset = {
  id: 'cispr32-classa-10m',
  name: 'CISPR 32 Class A (10m)',
  unit: 'dBuV',
  disclaimer: distanceDisclaimer(10),
  breakpoints: [
    { freqHz: 30e6, dB: 40 },
    { freqHz: 230e6 - EPSILON_HZ, dB: 40 },
    { freqHz: 230e6, dB: 47 },
    { freqHz: 1000e6, dB: 47 },
  ],
}
