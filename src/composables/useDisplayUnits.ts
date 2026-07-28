import { persistedRef } from '../utils/persistedRef'
import type { XAxisScale } from '../plot/axes'
import type { YAxisUnit } from '../plot/units'

const xAxisScale = persistedRef<XAxisScale>('display.xAxisScale', 'log')
const yAxisUnit = persistedRef<YAxisUnit>('display.yAxisUnit', 'dBuV')

export function useDisplayUnits() {
  return { xAxisScale, yAxisUnit }
}
