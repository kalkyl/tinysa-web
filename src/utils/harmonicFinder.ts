export interface HarmonicCandidate {
  /** Candidate fundamental/base frequency, in Hz. */
  baseHz: number
  /** Harmonic number of the lower marker frequency. */
  nLow: number
  /** Harmonic number of the higher marker frequency. */
  nHigh: number
  errorHz: number
  /** Error as a fraction of baseHz (e.g. 0.02 = 2%). */
  errorFraction: number
}

// Searches for base/fundamental frequencies that both inputs are near-integer multiples of
// (i.e. could be harmonics of a common oscillator) — a bounded search, not a rigorous solver.
export function findHarmonicBases(
  freqAHz: number,
  freqBHz: number,
  maxHarmonic = 20,
  toleranceFraction = 0.02,
): HarmonicCandidate[] {
  const lo = Math.min(freqAHz, freqBHz)
  const hi = Math.max(freqAHz, freqBHz)
  if (lo <= 0 || hi <= 0 || lo === hi) return []

  const candidates: HarmonicCandidate[] = []
  for (let nLow = 1; nLow <= maxHarmonic; nLow++) {
    const baseHz = lo / nLow
    const nHigh = Math.round(hi / baseHz)
    if (nHigh < 1 || nHigh > maxHarmonic * (hi / lo) + 1) continue
    const errorHz = Math.abs(hi - nHigh * baseHz)
    const errorFraction = errorHz / baseHz
    if (errorFraction <= toleranceFraction) {
      candidates.push({ baseHz, nLow, nHigh, errorHz, errorFraction })
    }
  }

  candidates.sort((a, b) => a.errorFraction - b.errorFraction)
  return candidates
}
