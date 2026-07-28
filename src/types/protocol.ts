export interface SweepConfig {
  startHz: number
  stopHz: number
  points: number
}

export interface ScanRawFrame {
  frequenciesHz: Float64Array
  amplitudesDbm: Float64Array
  timestampMs: number
}

export type RbwSetting = number | 'auto'

/** Basic's single RF port operates in either direct-sampling ("low", ≤350 MHz) or harmonic-mixing ("high", ≥240 MHz) mode. */
export type InputMode = 'low' | 'high'

export type AttenuatorSetting = number | 'auto'
