import { DeviceUnsupportedError } from '../errors'
import type { DeviceProfile } from './types'

// TODO(tinysa-ultra): placeholder values, not verified against real hardware/docs.
// A detected Ultra is refused (registry.ts + TinySADevice.connect) rather than misapplying Basic constants.
export const tinySAUltraProfile: DeviceProfile = {
  id: 'tinysa-ultra',
  displayName: 'tinySA Ultra',
  freqRangeHz: { min: 100_000, max: 5_300_000_000 },
  rbwRangeKHz: { min: 0.2, max: 850 },
  defaultPoints: 450,
  maxPoints: 450,
  toDbm: () => {
    throw new DeviceUnsupportedError('tinySA Ultra is not yet supported by this app')
  },
  supportsCommand: () => false,
}
