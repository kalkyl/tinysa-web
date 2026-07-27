/** Rounds a raw tick spacing up to a "nice" 1/2/5×10^n step. */
export function niceStep(range: number, targetTicks = 6): number {
  if (range <= 0) return 1
  const rough = range / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
  const residual = rough / magnitude
  let niceResidual: number
  if (residual > 5) niceResidual = 10
  else if (residual > 2) niceResidual = 5
  else if (residual > 1) niceResidual = 2
  else niceResidual = 1
  return niceResidual * magnitude
}

export function computeTicks(min: number, max: number, targetTicks = 6): number[] {
  if (max <= min) return [min]
  const step = niceStep(max - min, targetTicks)
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  const epsilon = step * 1e-9
  for (let v = start; v <= max + epsilon; v += step) {
    ticks.push(Math.round(v / step) * step)
  }
  return ticks
}

export function formatFrequencyHz(hz: number): string {
  const mhz = hz / 1e6
  const abs = Math.abs(mhz)
  if (abs >= 1000) return `${(mhz / 1000).toFixed(2)} GHz`
  if (abs >= 1) return `${mhz.toFixed(abs < 10 ? 3 : abs < 100 ? 2 : 1)} MHz`
  return `${(hz / 1e3).toFixed(1)} kHz`
}

export type XAxisScale = 'linear' | 'log'

// Clamps to strictly-positive bounds for log math; only expands to a full decade if degenerate (max <= min).
export function resolveLogRange(min: number, max: number): { min: number; max: number } {
  const safeMin = Math.max(min, 1e-6)
  const safeMax = max > safeMin ? max : safeMin * 10
  return { min: safeMin, max: safeMax }
}

/** Log-scale ticks at 1/2/5 x 10^n within [min, max] (min must be > 0). */
export function computeLogTicks(min: number, max: number): number[] {
  const { min: safeMin, max: safeMax } = resolveLogRange(min, max)
  const startDecade = Math.floor(Math.log10(safeMin))
  const endDecade = Math.ceil(Math.log10(safeMax))
  const multipliers = [1, 2, 5]
  const epsilon = safeMax * 1e-9
  const ticks: number[] = []
  for (let decade = startDecade; decade <= endDecade; decade++) {
    for (const m of multipliers) {
      const value = m * Math.pow(10, decade)
      if (value >= safeMin - epsilon && value <= safeMax + epsilon) {
        ticks.push(value)
      }
    }
  }
  return ticks
}
