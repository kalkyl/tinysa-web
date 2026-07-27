export interface FrequencyRangeHz {
  min: number
  max: number
}

export type RbwRangeKHz = { min: number; max: number } | { discreteKHz: number[] }

export type DeviceModelId = 'tinysa-basic' | 'tinysa-ultra'

export interface DeviceProfile {
  id: DeviceModelId
  displayName: string
  freqRangeHz: FrequencyRangeHz
  rbwRangeKHz: RbwRangeKHz
  defaultPoints: number
  maxPoints: number
  toDbm(rawSample: number): number
  supportsCommand(cmd: string): boolean
}

function rbwBounds(profile: DeviceProfile): { min: number; max: number } {
  const range = profile.rbwRangeKHz
  return 'discreteKHz' in range
    ? { min: Math.min(...range.discreteKHz), max: Math.max(...range.discreteKHz) }
    : { min: range.min, max: range.max }
}

// Estimates what 'auto' RBW the device would pick, for timeout math only — using
// the narrowest possible RBW as a worst case would wildly overestimate sweep time.
export function estimateAutoRbwKHz(profile: DeviceProfile, spanHz: number, points: number): number {
  const { min, max } = rbwBounds(profile)
  const spanKHz = spanHz / 1000
  const estimate = points > 0 ? spanKHz / points : max
  return Math.min(max, Math.max(min, estimate))
}
