export interface SweepPreset {
  id: string
  label: string
  startHz: number
  stopHz: number
}

// Low/mid/high follow the FCC Part 15.109 breakpoints (also used by the limit-line presets).
export const SWEEP_PRESETS: SweepPreset[] = [
  { id: 'full', label: 'Full range (0.1–960 MHz)', startHz: 100_000, stopHz: 960_000_000 },
  { id: 'emc-full', label: 'Radiated, full (30–960 MHz)', startHz: 30_000_000, stopHz: 960_000_000 },
  { id: 'emc-low', label: 'Radiated, low band (30–88 MHz)', startHz: 30_000_000, stopHz: 88_000_000 },
  { id: 'emc-mid', label: 'Radiated, mid band (88–216 MHz)', startHz: 88_000_000, stopHz: 216_000_000 },
  { id: 'emc-high', label: 'Radiated, high band (216–960 MHz)', startHz: 216_000_000, stopHz: 960_000_000 },
  { id: 'conducted', label: 'Conducted emissions (0.15–30 MHz)', startHz: 150_000, stopHz: 30_000_000 },
]
