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
  /** Sweep count of the averaging window if averaging was on when saved, else null. */
  averagingWindowSize: number | null
  frequenciesHz: Float64Array
  /** Already calibration-applied, in dBm. */
  amplitudesDbm: Float64Array
  peakHoldDbm: Float64Array | null
  /** An ambient/no-signal snapshot captured via "Capture now" (see useNoiseFloor) rather than a measurement the user named — kept out of the visible list and exports. */
  isNoiseFloor?: boolean
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
  averagingWindowSize: number | null
  frequenciesHz: number[]
  amplitudesDbm: number[]
  peakHoldDbm: number[] | null
  isNoiseFloor?: boolean
}

export interface ExportFileV1 {
  formatVersion: 1
  exportedAt: number
  measurements: ExportedMeasurementV1[]
}
