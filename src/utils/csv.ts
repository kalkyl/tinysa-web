export interface NamedCurve {
  label: string
  amplitudes: Float64Array
}

/** Builds a CSV table: one frequency column, then one column per curve (all must share the same length as frequenciesHz). */
export function buildCurvesCsv(frequenciesHz: Float64Array, curves: NamedCurve[]): string {
  const header = ['Frequency (Hz)', ...curves.map((c) => c.label)].join(',')
  const lines = [header]
  for (let i = 0; i < frequenciesHz.length; i++) {
    const row = [String(frequenciesHz[i]), ...curves.map((c) => String(c.amplitudes[i]))]
    lines.push(row.join(','))
  }
  return lines.join('\n')
}
