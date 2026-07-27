import { computed, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { interpolateLine, type Breakpoint } from '../utils/interpolate'
import { computeFrequencyList } from '../utils/frequencyList'
import { useSweepConfig } from './useSweepConfig'
import { LIMIT_PRESETS } from '../data/limitPresets'
import type { YAxisUnit } from '../plot/units'

export interface CustomLimitLine {
  id: string
  name: string
  unit: YAxisUnit
  breakpoints: Breakpoint[]
}

export interface ReferenceSeries {
  id: string
  label: string
  unit: YAxisUnit
  frequenciesHz: Float64Array
  values: Float64Array
}

const SAMPLE_POINTS = 200

const enabledPresetIds = ref<Set<string>>(new Set())
const customLines = ref<CustomLimitLine[]>([])

export function useReferenceLines() {
  const { sweepConfig } = useSweepConfig()

  function togglePreset(id: string, enabled: boolean): void {
    const next = new Set(enabledPresetIds.value)
    if (enabled) next.add(id)
    else next.delete(id)
    enabledPresetIds.value = next
  }

  function isPresetEnabled(id: string): boolean {
    return enabledPresetIds.value.has(id)
  }

  function addCustomLine(name: string, unit: YAxisUnit, breakpoints: Breakpoint[]): void {
    customLines.value = [...customLines.value, { id: uuidv4(), name, unit, breakpoints }]
  }

  function removeCustomLine(id: string): void {
    customLines.value = customLines.value.filter((line) => line.id !== id)
  }

  const activeReferenceSeries = computed<ReferenceSeries[]>(() => {
    const cfg = sweepConfig.value
    const freqSamples = computeFrequencyList(cfg.startHz, cfg.stopHz, SAMPLE_POINTS)
    const series: ReferenceSeries[] = []

    for (const preset of LIMIT_PRESETS) {
      if (enabledPresetIds.value.has(preset.id)) {
        series.push({
          id: preset.id,
          label: preset.name,
          unit: preset.unit,
          frequenciesHz: freqSamples,
          values: interpolateLine(preset.breakpoints, freqSamples),
        })
      }
    }
    for (const line of customLines.value) {
      series.push({
        id: line.id,
        label: line.name,
        unit: line.unit,
        frequenciesHz: freqSamples,
        values: interpolateLine(line.breakpoints, freqSamples),
      })
    }
    return series
  })

  return {
    presets: LIMIT_PRESETS,
    isPresetEnabled,
    togglePreset,
    customLines,
    addCustomLine,
    removeCustomLine,
    activeReferenceSeries,
  }
}
