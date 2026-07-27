import type { Breakpoint } from '../../utils/interpolate'
import type { YAxisUnit } from '../../plot/units'

export interface LimitPreset {
  id: string
  name: string
  /** Unit the breakpoint values are authored in — usually dBuV(/m), the standard EMC convention. */
  unit: YAxisUnit
  breakpoints: Breakpoint[]
  /** Shown in the UI next to every preset — these are not verified against the current official standard text. */
  disclaimer: string
}
