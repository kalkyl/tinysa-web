/** Index of the frequency bin closest to freqHz. Returns 0 for an empty array. */
export function nearestBinIndex(frequenciesHz: Float64Array, freqHz: number): number {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < frequenciesHz.length; i++) {
    const dist = Math.abs(frequenciesHz[i] - freqHz)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}
