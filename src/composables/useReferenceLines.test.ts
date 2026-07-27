import { describe, expect, it } from 'vitest'
import { useReferenceLines } from './useReferenceLines'
import { useSweepConfig } from './useSweepConfig'

describe('useReferenceLines', () => {
  it('starts with no presets enabled and no custom lines', () => {
    const { activeReferenceSeries } = useReferenceLines()
    expect(activeReferenceSeries.value).toEqual([])
  })

  it('toggling a preset on adds it to the active series, sampled across the current sweep range', () => {
    const { sweepConfig } = useSweepConfig()
    sweepConfig.value // touch to ensure composable singleton initialized
    const { presets, togglePreset, activeReferenceSeries, isPresetEnabled } = useReferenceLines()
    const preset = presets[0]

    togglePreset(preset.id, true)
    expect(isPresetEnabled(preset.id)).toBe(true)

    const active = activeReferenceSeries.value.find((s) => s.id === preset.id)
    expect(active).toBeDefined()
    expect(active!.frequenciesHz.length).toBe(active!.values.length)
    expect(active!.unit).toBe(preset.unit)

    togglePreset(preset.id, false)
    expect(activeReferenceSeries.value.find((s) => s.id === preset.id)).toBeUndefined()
  })

  it('adds and removes custom limit lines', () => {
    const { addCustomLine, removeCustomLine, customLines, activeReferenceSeries } = useReferenceLines()
    const before = customLines.value.length

    addCustomLine('My mask', 'dBm', [
      { freqHz: 0, dB: -50 },
      { freqHz: 1e9, dB: -50 },
    ])
    expect(customLines.value.length).toBe(before + 1)
    const added = customLines.value[customLines.value.length - 1]
    expect(activeReferenceSeries.value.some((s) => s.id === added.id)).toBe(true)

    removeCustomLine(added.id)
    expect(customLines.value.some((l) => l.id === added.id)).toBe(false)
    expect(activeReferenceSeries.value.some((s) => s.id === added.id)).toBe(false)
  })
})
