export type YAxisUnit = 'dBm' | 'dBuV'

/** dBµV = dBm + 107, the standard conversion for a 50Ω RF system — common in EMC pre-compliance work. */
const DBM_TO_DBUV_OFFSET_50OHM = 107

export function dbmToDbuV(dbm: number): number {
  return dbm + DBM_TO_DBUV_OFFSET_50OHM
}

export function dbuVToDbm(dbuV: number): number {
  return dbuV - DBM_TO_DBUV_OFFSET_50OHM
}

export function convertFromDbm(dbm: number, unit: YAxisUnit): number {
  return unit === 'dBuV' ? dbmToDbuV(dbm) : dbm
}

export function convertToDbm(value: number, unit: YAxisUnit): number {
  return unit === 'dBuV' ? dbuVToDbm(value) : value
}

export function convertArrayFromDbm(values: Float64Array, unit: YAxisUnit): Float64Array {
  if (unit === 'dBm') return values
  return Float64Array.from(values, (v) => dbmToDbuV(v))
}

/** Converts a value authored in `from` units into `to` units, via the shared dBm<->dBuV convention. */
export function convertUnit(value: number, from: YAxisUnit, to: YAxisUnit): number {
  if (from === to) return value
  return convertFromDbm(convertToDbm(value, from), to)
}

export function convertArrayUnit(values: Float64Array, from: YAxisUnit, to: YAxisUnit): Float64Array {
  if (from === to) return values
  return Float64Array.from(values, (v) => convertUnit(v, from, to))
}

export function formatAmplitude(value: number, unit: YAxisUnit): string {
  return `${Math.round(value)} ${unit === 'dBuV' ? 'dBµV' : 'dBm'}`
}
