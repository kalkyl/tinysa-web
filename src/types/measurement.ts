import type { DeviceModelId } from '../device/models/types'
import type { RbwSetting } from './protocol'

export interface StoredSweepConfig {
  startHz: number
  stopHz: number
  points: number
  rbwKHz: RbwSetting
}

export interface StoredMeasurement {
  id: string
  schemaVersion: 1
  name: string
  note: string
  createdAt: number
  updatedAt: number
  deviceModel: DeviceModelId | 'unknown'
  sweep: StoredSweepConfig
  calibrationOffsetDb: number
  frequenciesHz: Float64Array
  /** Already calibration-applied, in dBm. */
  amplitudesDbm: Float64Array
  peakHoldDbm: Float64Array | null
}

export interface ExportedMeasurementV1 {
  id: string
  schemaVersion: 1
  name: string
  note: string
  createdAt: number
  updatedAt: number
  deviceModel: DeviceModelId | 'unknown'
  sweep: StoredSweepConfig
  calibrationOffsetDb: number
  frequenciesHz: number[]
  amplitudesDbm: number[]
  peakHoldDbm: number[] | null
}

export interface ExportFileV1 {
  formatVersion: 1
  exportedAt: number
  measurements: ExportedMeasurementV1[]
}
