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
