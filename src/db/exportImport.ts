import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { ExportFileV1, StoredMeasurement } from '../types/measurement'

const sweepSchema = z.object({
  startHz: z.number(),
  stopHz: z.number(),
  points: z.number(),
  rbwKHz: z.union([z.number(), z.literal('auto')]),
})

const exportedMeasurementSchema = z.object({
  id: z.string(),
  schemaVersion: z.literal(1),
  name: z.string(),
  note: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deviceModel: z.enum(['tinysa-basic', 'tinysa-ultra', 'unknown']),
  sweep: sweepSchema,
  calibrationOffsetDb: z.number(),
  // Older exports predate this field — default to "no averaging" rather than rejecting the file.
  averagingWindowSize: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  frequenciesHz: z.array(z.number()),
  amplitudesDbm: z.array(z.number()),
  peakHoldDbm: z.array(z.number()).nullable(),
  isNoiseFloor: z.boolean().optional(),
})

const exportFileSchema = z.object({
  formatVersion: z.literal(1),
  exportedAt: z.number(),
  measurements: z.array(exportedMeasurementSchema),
})

export function toExportFile(measurements: StoredMeasurement[]): ExportFileV1 {
  return {
    formatVersion: 1,
    exportedAt: Date.now(),
    measurements: measurements.map((m) => ({
      ...m,
      frequenciesHz: Array.from(m.frequenciesHz),
      amplitudesDbm: Array.from(m.amplitudesDbm),
      peakHoldDbm: m.peakHoldDbm ? Array.from(m.peakHoldDbm) : null,
    })),
  }
}

// Always assigns a fresh id so an import can never overwrite an existing saved measurement.
export function fromExportFile(json: unknown): StoredMeasurement[] {
  const parsed = exportFileSchema.parse(json)
  return parsed.measurements.map((m) => ({
    ...m,
    id: uuidv4(),
    frequenciesHz: Float64Array.from(m.frequenciesHz),
    amplitudesDbm: Float64Array.from(m.amplitudesDbm),
    peakHoldDbm: m.peakHoldDbm ? Float64Array.from(m.peakHoldDbm) : null,
  }))
}
