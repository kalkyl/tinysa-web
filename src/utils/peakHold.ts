// Running max-hold; resets on a bin-count change since alignment would otherwise be meaningless.
export function updatePeak(existing: Float64Array | null, incoming: Float64Array): Float64Array {
  if (!existing || existing.length !== incoming.length) {
    return Float64Array.from(incoming)
  }
  const out = new Float64Array(existing.length)
  for (let i = 0; i < existing.length; i++) {
    out[i] = Math.max(existing[i], incoming[i])
  }
  return out
}
