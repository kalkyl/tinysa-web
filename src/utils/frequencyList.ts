/** Client-side computation of evenly-spaced sweep bin frequencies, an alternative to a `frequencies` round-trip. */
export function computeFrequencyList(startHz: number, stopHz: number, points: number): Float64Array {
  const out = new Float64Array(points)
  if (points <= 1) {
    out[0] = startHz
    return out
  }
  const step = (stopHz - startHz) / (points - 1)
  for (let i = 0; i < points; i++) {
    out[i] = startHz + step * i
  }
  return out
}
