import { computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { interpolateLine, type Breakpoint } from '../utils/interpolate'
import { computeFrequencyList } from '../utils/frequencyList'
import { persistedRef } from '../utils/persistedRef'
import { useSweepConfig } from './useSweepConfig'
import { useSubtractModeActive } from './useSubtractMode'
import { LIMIT_PRESETS } from '../data/limitPresets'
import type { YAxisUnit } from '../plot/units'

export interface CustomLimitLine {
  id: string
  name: string
  unit: YAxisUnit
  breakpoints: Breakpoint[]
  /** Optional for backward compatibility with lines saved before this existed — treated as enabled when absent. */
  enabled?: boolean
}

export interface ReferenceSeries {
  id: string
  label: string
  unit: YAxisUnit
  frequenciesHz: Float64Array
  values: Float64Array
}

const SAMPLE_POINTS = 200

const enabledPresetIds = persistedRef<string[]>('referenceLines.enabledPresetIds', [])
const customLines = persistedRef<CustomLimitLine[]>('referenceLines.customLines', [])

export function useReferenceLines() {
  const { sweepConfig } = useSweepConfig()
  const subtractModeActive = useSubtractModeActive()

  function togglePreset(id: string, enabled: boolean): void {
    if (enabled) {
      if (!enabledPresetIds.value.includes(id)) enabledPresetIds.value = [...enabledPresetIds.value, id]
    } else {
      enabledPresetIds.value = enabledPresetIds.value.filter((x) => x !== id)
    }
  }

  function isPresetEnabled(id: string): boolean {
    return enabledPresetIds.value.includes(id)
  }

  function addCustomLine(name: string, unit: YAxisUnit, breakpoints: Breakpoint[]): void {
    customLines.value = [...customLines.value, { id: uuidv4(), name, unit, breakpoints, enabled: true }]
  }

  function updateCustomLine(id: string, name: string, unit: YAxisUnit, breakpoints: Breakpoint[]): void {
    customLines.value = customLines.value.map((line) => (line.id === id ? { ...line, name, unit, breakpoints } : line))
  }

  function removeCustomLine(id: string): void {
    customLines.value = customLines.value.filter((line) => line.id !== id)
  }

  function toggleCustomLine(id: string, enabled: boolean): void {
    customLines.value = customLines.value.map((line) => (line.id === id ? { ...line, enabled } : line))
  }

  function isCustomLineEnabled(line: CustomLimitLine): boolean {
    return line.enabled !== false
  }

  // Absolute dBm/dBuV lines are the wrong scale while subtracting — hidden, not deselected.
  const activeReferenceSeries = computed<ReferenceSeries[]>(() => {
    if (subtractModeActive.value) return []
    const cfg = sweepConfig.value
    const freqSamples = computeFrequencyList(cfg.startHz, cfg.stopHz, SAMPLE_POINTS)
    const series: ReferenceSeries[] = []

    for (const preset of LIMIT_PRESETS) {
      if (enabledPresetIds.value.includes(preset.id)) {
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
      if (!isCustomLineEnabled(line)) continue
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
    updateCustomLine,
    removeCustomLine,
    toggleCustomLine,
    isCustomLineEnabled,
    activeReferenceSeries,
    subtractModeActive,
  }
}
