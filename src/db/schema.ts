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
// Bumped past the short-lived v2 (a since-removed separate noiseFloorBaselines
// store) so anyone who already upgraded to it doesn't hit a downgrade error.
const DB_VERSION = 3

let dbPromise: Promise<IDBPDatabase<TinySADB>> | null = null

export function getDb(): Promise<IDBPDatabase<TinySADB>> {
  if (!dbPromise) {
    dbPromise = openDB<TinySADB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('measurements', { keyPath: 'id' })
          store.createIndex('by-createdAt', 'createdAt')
          store.createIndex('by-name', 'name')
        }
        // A short-lived v2 store, since removed in favor of tagging a regular
        // measurement — idb's types don't know its name anymore, hence the casts.
        const rawDb = db as unknown as { objectStoreNames: DOMStringList; deleteObjectStore(name: string): void }
        if (oldVersion >= 2 && oldVersion < 3 && rawDb.objectStoreNames.contains('noiseFloorBaselines')) {
          rawDb.deleteObjectStore('noiseFloorBaselines')
        }
      },
    })
  }
  return dbPromise
}
