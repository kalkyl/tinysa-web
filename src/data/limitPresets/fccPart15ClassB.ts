import type { LimitPreset } from './types'
import { conductedDisclaimer, distanceDisclaimer } from './disclaimer'

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

/** FCC Part 15.107 Class B conducted emission limits, measured on AC mains via a LISN — quasi-peak. */
export const FCC_PART15_CLASS_B_CONDUCTED: LimitPreset = {
  id: 'fcc-part15-classb-conducted',
  name: 'FCC Part 15 Class B (Conducted)',
  unit: 'dBuV',
  disclaimer: conductedDisclaimer(),
  breakpoints: [
    { freqHz: 150e3, dB: 66 },
    { freqHz: 500e3, dB: 56 },
    { freqHz: 5e6 - EPSILON_HZ, dB: 56 },
    { freqHz: 5e6, dB: 60 },
    { freqHz: 30e6, dB: 60 },
  ],
}
