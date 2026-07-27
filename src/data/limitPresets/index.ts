import type { LimitPreset } from './types'
import { FCC_PART15_CLASS_B } from './fccPart15ClassB'
import { FCC_PART15_CLASS_A } from './fccPart15ClassA'
import { CISPR32_CLASS_B_10M, CISPR32_CLASS_B_3M } from './cispr32ClassB'
import { CISPR32_CLASS_A } from './cispr32ClassA'

export type { LimitPreset } from './types'
export { LIMIT_PRESET_DISCLAIMER } from './disclaimer'

export const LIMIT_PRESETS: LimitPreset[] = [
  FCC_PART15_CLASS_B,
  CISPR32_CLASS_B_3M,
  FCC_PART15_CLASS_A,
  CISPR32_CLASS_B_10M,
  CISPR32_CLASS_A,
]
