import { ref } from 'vue'
import { SWEEP_PRESETS, type SweepPreset } from '../data/sweepPresets'

const STORAGE_KEY = 'tinysa-web:custom-sweep-presets'

function loadCustomPresets(): SweepPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(presets: SweepPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

const customPresets = ref<SweepPreset[]>(loadCustomPresets())

export function useSweepPresets() {
  function addCustomPreset(label: string, startHz: number, stopHz: number): void {
    customPresets.value = [...customPresets.value, { id: `custom-${Date.now()}`, label, startHz, stopHz }]
    persist(customPresets.value)
  }

  function removeCustomPreset(id: string): void {
    customPresets.value = customPresets.value.filter((p) => p.id !== id)
    persist(customPresets.value)
  }

  function isCustomPreset(id: string): boolean {
    return customPresets.value.some((p) => p.id === id)
  }

  return { builtInPresets: SWEEP_PRESETS, customPresets, addCustomPreset, removeCustomPreset, isCustomPreset }
}
