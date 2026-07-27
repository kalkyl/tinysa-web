/** Per-bin mean across a set of same-length sweeps. */
export function computeAverage(sweeps: Float64Array[]): Float64Array {
  if (sweeps.length === 0) return new Float64Array(0)
  const length = sweeps[0].length
  const out = new Float64Array(length)
  for (const sweep of sweeps) {
    for (let i = 0; i < length; i++) {
      out[i] += sweep[i]
    }
  }
  for (let i = 0; i < length; i++) {
    out[i] /= sweeps.length
  }
  return out
}
