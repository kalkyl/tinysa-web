import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { StoredMeasurement } from '../types/measurement'

interface TinySADB extends DBSchema {
  measurements: {
    key: string
    value: StoredMeasurement
    indexes: { 'by-createdAt': number; 'by-name': string }
  }
}

const DB_NAME = 'tinysa-web'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<TinySADB>> | null = null

export function getDb(): Promise<IDBPDatabase<TinySADB>> {
  if (!dbPromise) {
    dbPromise = openDB<TinySADB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('measurements', { keyPath: 'id' })
        store.createIndex('by-createdAt', 'createdAt')
        store.createIndex('by-name', 'name')
      },
    })
  }
  return dbPromise
}
