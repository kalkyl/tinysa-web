const ASCII_TIMEOUT_MS = 2000
const MIN_SCAN_TIMEOUT_MS = 1000
// Hard ceiling: setTimeout delays beyond ~24.8 days overflow to a 32-bit int and fire
// almost instantly instead of waiting, silently turning a huge timeout into a spurious one.
const MAX_SCAN_TIMEOUT_MS = 30_000
const SAFETY_MARGIN = 2

export function asciiCommandTimeoutMs(): number {
  return ASCII_TIMEOUT_MS
}

/**
 * A scanraw sweep's duration depends on span, RBW, and point count. Formula
 * adapted from a working reference implementation (Ho-Ro/nanovna-tools);
 * treat the constants as tunable once real hardware timing is available.
 */
export function computeScanTimeoutMs(startHz: number, stopHz: number, rbwKHz: number, points: number): number {
  const seconds = (stopHz - startHz) / 20_000 / rbwKHz ** 2 + points / 500 + 1
  const timeoutMs = seconds * SAFETY_MARGIN * 1000
  return Math.min(MAX_SCAN_TIMEOUT_MS, Math.max(MIN_SCAN_TIMEOUT_MS, timeoutMs))
}
