import { getDb } from './schema'
import type { StoredMeasurement } from '../types/measurement'

export async function listMeasurements(): Promise<StoredMeasurement[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('measurements', 'by-createdAt')
  return all.reverse() // newest first
}

export async function saveMeasurement(measurement: StoredMeasurement): Promise<void> {
  const db = await getDb()
  await db.put('measurements', measurement)
}

export async function deleteMeasurement(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('measurements', id)
}

export async function renameMeasurement(id: string, name: string, note: string): Promise<void> {
  const db = await getDb()
  const existing = await db.get('measurements', id)
  if (!existing) return
  await db.put('measurements', { ...existing, name, note, updatedAt: Date.now() })
}
