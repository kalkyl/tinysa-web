import type { LimitPreset } from './types'
import { FCC_PART15_CLASS_B, FCC_PART15_CLASS_B_CONDUCTED } from './fccPart15ClassB'
import { FCC_PART15_CLASS_A_3M } from './fccPart15ClassA'
import { CISPR32_CLASS_B_3M } from './cispr32ClassB'
import { CISPR32_CLASS_A_3M } from './cispr32ClassA'

export type { LimitPreset } from './types'
export { LIMIT_PRESET_DISCLAIMER } from './disclaimer'

export const LIMIT_PRESETS: LimitPreset[] = [
  FCC_PART15_CLASS_B,
  FCC_PART15_CLASS_B_CONDUCTED,
  FCC_PART15_CLASS_A_3M,
  CISPR32_CLASS_B_3M,
  CISPR32_CLASS_A_3M,
].sort((a, b) => a.name.localeCompare(b.name))
