export interface Breakpoint {
  freqHz: number
  dB: number
}

// Samples a piecewise-linear line at each frequency; holds flat past the outermost breakpoints.
export function interpolateLine(breakpoints: Breakpoint[], frequenciesHz: Float64Array): Float64Array {
  const out = new Float64Array(frequenciesHz.length)
  if (breakpoints.length === 0) return out
  const sorted = [...breakpoints].sort((a, b) => a.freqHz - b.freqHz)
  for (let i = 0; i < frequenciesHz.length; i++) {
    out[i] = interpolateAt(sorted, frequenciesHz[i])
  }
  return out
}

function interpolateAt(sorted: Breakpoint[], freqHz: number): number {
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (freqHz <= first.freqHz) return first.dB
  if (freqHz >= last.freqHz) return last.dB
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (freqHz <= next.freqHz) {
      const prev = sorted[i - 1]
      const span = next.freqHz - prev.freqHz
      const t = span > 0 ? (freqHz - prev.freqHz) / span : 0
      return prev.dB + t * (next.dB - prev.dB)
    }
  }
  return last.dB
}
