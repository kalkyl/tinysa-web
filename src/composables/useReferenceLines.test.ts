import { describe, expect, it } from 'vitest'
import { useReferenceLines } from './useReferenceLines'
import { useSweepConfig } from './useSweepConfig'
import { useNoiseFloor } from './useNoiseFloor'
import { useMeasurementStore } from './useMeasurementStore'
import { computeFrequencyList } from '../utils/frequencyList'
import type { StoredMeasurement } from '../types/measurement'

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

  it('toggling a custom line off hides it without deleting it, same as a preset', () => {
    const { addCustomLine, removeCustomLine, toggleCustomLine, isCustomLineEnabled, customLines, activeReferenceSeries } =
      useReferenceLines()

    addCustomLine('Toggle me', 'dBm', [
      { freqHz: 0, dB: -50 },
      { freqHz: 1e9, dB: -50 },
    ])
    const added = customLines.value[customLines.value.length - 1]
    expect(isCustomLineEnabled(added)).toBe(true)
    expect(activeReferenceSeries.value.some((s) => s.id === added.id)).toBe(true)

    toggleCustomLine(added.id, false)
    const afterToggleOff = customLines.value.find((l) => l.id === added.id)!
    expect(isCustomLineEnabled(afterToggleOff)).toBe(false)
    expect(activeReferenceSeries.value.some((s) => s.id === added.id)).toBe(false)
    expect(customLines.value.some((l) => l.id === added.id)).toBe(true) // still there, just hidden

    toggleCustomLine(added.id, true)
    expect(activeReferenceSeries.value.some((s) => s.id === added.id)).toBe(true)

    removeCustomLine(added.id)
  })

  it('updateCustomLine replaces name/unit/breakpoints in place, keeping the same id', () => {
    const { addCustomLine, updateCustomLine, removeCustomLine, customLines, activeReferenceSeries } = useReferenceLines()

    addCustomLine('Original name', 'dBm', [
      { freqHz: 0, dB: -50 },
      { freqHz: 1e9, dB: -50 },
    ])
    const added = customLines.value[customLines.value.length - 1]

    updateCustomLine(added.id, 'Renamed', 'dBuV', [
      { freqHz: 0, dB: 40 },
      { freqHz: 1e9, dB: 60 },
    ])
    const updated = customLines.value.find((l) => l.id === added.id)!
    expect(updated.name).toBe('Renamed')
    expect(updated.unit).toBe('dBuV')
    expect(updated.breakpoints).toEqual([
      { freqHz: 0, dB: 40 },
      { freqHz: 1e9, dB: 60 },
    ])
    // Still enabled and rendered — updating shouldn't disturb visibility.
    expect(activeReferenceSeries.value.some((s) => s.id === added.id)).toBe(true)

    removeCustomLine(added.id)
  })

  it('hides all reference lines while subtracting, without touching the underlying selection', async () => {
    const { sweepConfig } = useSweepConfig()
    const { presets, togglePreset, activeReferenceSeries, isPresetEnabled } = useReferenceLines()
    const { setSource, setEnabled } = useNoiseFloor()
    const { save } = useMeasurementStore()
    const preset = presets[0]
    togglePreset(preset.id, true)
    expect(activeReferenceSeries.value.length).toBeGreaterThan(0)

    const cfg = sweepConfig.value
    const frequenciesHz = computeFrequencyList(cfg.startHz, cfg.stopHz, cfg.points)
    const source: StoredMeasurement = {
      id: 'ref-lines-src',
      schemaVersion: 1,
      name: 'Baseline',
      note: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deviceModel: 'unknown',
      sweep: { ...cfg, rbwKHz: 'auto' },
      calibrationOffsetDb: 0,
      averagingWindowSize: null,
      frequenciesHz,
      amplitudesDbm: new Float64Array(frequenciesHz.length).fill(-90),
      peakHoldDbm: null,
    }
    await save(source)
    setSource('ref-lines-src')
    setEnabled(true)

    expect(activeReferenceSeries.value).toEqual([])
    expect(isPresetEnabled(preset.id)).toBe(true) // selection itself is untouched

    setSource(null)
    setEnabled(false)
    expect(activeReferenceSeries.value.length).toBeGreaterThan(0)
    togglePreset(preset.id, false)
  })
})
