import { ref } from 'vue'
import type { XAxisScale } from '../plot/axes'
import type { YAxisUnit } from '../plot/units'

const xAxisScale = ref<XAxisScale>('log')
const yAxisUnit = ref<YAxisUnit>('dBuV')

export function useDisplayUnits() {
  return { xAxisScale, yAxisUnit }
}
