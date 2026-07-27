import type { DeviceProfile } from './types'

const SUPPORTED_COMMANDS = new Set([
  'sweep',
  'rbw',
  'scanraw',
  'frequencies',
  'pause',
  'resume',
  'version',
  'info',
  'attenuate',
  'mode',
  'level',
  'sweeptime',
])

/** tinySA Basic: the only fully-implemented and tested device profile. */
export const tinySABasicProfile: DeviceProfile = {
  id: 'tinysa-basic',
  displayName: 'tinySA (Basic)',
  freqRangeHz: { min: 100_000, max: 960_000_000 },
  // Treated as a conservative continuous range pending confirmation against
  // real hardware of whether RBW is actually a discrete step list.
  rbwRangeKHz: { min: 0.2, max: 850 },
  defaultPoints: 450,
  maxPoints: 450,
  toDbm: (raw) => raw / 32 - 128,
  supportsCommand: (cmd) => SUPPORTED_COMMANDS.has(cmd),
}
