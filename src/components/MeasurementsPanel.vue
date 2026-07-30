<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMeasurementStore } from '../composables/useMeasurementStore'
import { useNoiseFloor, frequenciesMatch } from '../composables/useNoiseFloor'
import { useSweepConfig } from '../composables/useSweepConfig'
import { useSubtractModeActive } from '../composables/useSubtractMode'
import { computeFrequencyList } from '../utils/frequencyList'
import { formatFrequencyHz } from '../plot/axes'
import { buildCurvesCsv, type NamedCurve } from '../utils/csv'
import type { StoredMeasurement } from '../types/measurement'
import SaveMeasurementDialog from './SaveMeasurementDialog.vue'
import ExportImportControls from './ExportImportControls.vue'

const { visibleMeasurements, remove, rename, toggleOverlay, togglePeakOverlay, isOverlayVisible, isPeakOverlayVisible, exportOneJson } =
  useMeasurementStore()
const noiseFloor = useNoiseFloor()
const { sweepConfig } = useSweepConfig()

const editingId = ref<string | null>(null)
const editName = ref('')
const editNote = ref('')

const currentFrequenciesHz = computed(() => {
  const cfg = sweepConfig.value
  return computeFrequencyList(cfg.startHz, cfg.stopHz, cfg.points)
})

function isSweepCompatible(m: StoredMeasurement): boolean {
  return frequenciesMatch(m.frequenciesHz, currentFrequenciesHz.value)
}

function isSubtractSource(m: StoredMeasurement): boolean {
  return noiseFloor.subtractSourceId.value === m.id
}

// Every overlay is on the wrong scale while subtracting (relative dB vs.
// absolute dBm/dBuV) — not just the measurement being subtracted, since an
// overlay of *any* other measurement would sit on the plot's now-relative
// Y-axis too.
const subtractModeActive = useSubtractModeActive()

/** Each measurement's overlay visibility right before Subtract forced it off, so turning Subtract off can put them all back rather than leaving them off for good. */
const preSubtractOverlayState = new Map<string, { live: boolean; peak: boolean }>()

// There's only one active subtraction source at a time (mutually exclusive
// with any other measurement's Subtract, and with the ambient noise-floor
// capture in NoiseFloorControls) — checking this one just points the shared
// source id at it.
function toggleSubtract(m: StoredMeasurement, checked: boolean): void {
  if (checked) {
    noiseFloor.setSource(m.id)
    noiseFloor.setEnabled(true)
    for (const other of visibleMeasurements.value) {
      preSubtractOverlayState.set(other.id, { live: isOverlayVisible(other.id), peak: isPeakOverlayVisible(other.id) })
      if (isOverlayVisible(other.id)) toggleOverlay(other.id, false)
      if (isPeakOverlayVisible(other.id)) togglePeakOverlay(other.id, false)
    }
  } else {
    noiseFloor.setSource(null)
    noiseFloor.setEnabled(false)
    for (const [id, previous] of preSubtractOverlayState) {
      if (previous.live) toggleOverlay(id, true)
      if (previous.peak) togglePeakOverlay(id, true)
    }
    preSubtractOverlayState.clear()
  }
}

function formatRbw(rbwKHz: number | 'auto'): string {
  return rbwKHz === 'auto' ? 'RBW auto' : `RBW ${rbwKHz} kHz`
}

function startEdit(id: string, name: string, note: string): void {
  editingId.value = id
  editName.value = name
  editNote.value = note
}

async function saveEdit(): Promise<void> {
  if (!editingId.value) return
  await rename(editingId.value, editName.value.trim(), editNote.value.trim())
  editingId.value = null
}

function cancelEdit(): void {
  editingId.value = null
}

function confirmRemove(id: string, name: string): void {
  if (window.confirm(`Delete "${name}"? This can't be undone.`)) {
    remove(id)
  }
}

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportOne(id: string, name: string): void {
  const json = exportOneJson(id)
  if (json) downloadJson(`${name.replace(/[^a-z0-9-_]+/gi, '_') || 'measurement'}.json`, json)
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportOneCsv(m: StoredMeasurement): void {
  const curves: NamedCurve[] = [{ label: 'Amplitude (dBm)', amplitudes: m.amplitudesDbm }]
  if (m.peakHoldDbm) {
    curves.push({ label: 'Peak hold (dBm)', amplitudes: m.peakHoldDbm })
  }
  const csv = buildCurvesCsv(m.frequenciesHz, curves)
  downloadCsv(`${m.name.replace(/[^a-z0-9-_]+/gi, '_') || 'measurement'}.csv`, csv)
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString()
}
</script>

<template>
  <fieldset class="measurements-panel">
    <legend>Measurements</legend>

    <SaveMeasurementDialog />
    <ExportImportControls />

    <p v-if="visibleMeasurements.length === 0" class="empty">No saved measurements yet.</p>

    <ul class="list">
      <li v-for="m in visibleMeasurements" :key="m.id">
        <template v-if="editingId === m.id">
          <input v-model="editName" type="text" class="edit-name" />
          <textarea v-model="editNote" rows="2" class="edit-note"></textarea>
          <div class="row-actions">
            <button type="button" @click="saveEdit">Save</button>
            <button type="button" @click="cancelEdit">Cancel</button>
          </div>
        </template>
        <template v-else>
          <div class="row-header">
            <span class="name">{{ m.name }}</span>
            <span class="meta">{{ formatTimestamp(m.createdAt) }}</span>
          </div>
          <p class="sweep-info">
            {{ formatFrequencyHz(m.sweep.startHz) }}–{{ formatFrequencyHz(m.sweep.stopHz) }} · {{ m.sweep.points }} pts ·
            {{ formatRbw(m.sweep.rbwKHz) }}
            <span v-if="m.averagingWindowSize" class="nowrap">· AVG {{ m.averagingWindowSize }}</span>
          </p>
          <div class="overlay-toggles">
            <span class="overlay-toggles-label">Overlay</span>
            <div class="overlay-toggle-row">
              <label
                class="overlay-toggle"
                :title="subtractModeActive ? 'Not available while subtracting (wrong scale)' : `Overlay this measurement's live curve`"
              >
                <input
                  type="checkbox"
                  :disabled="subtractModeActive"
                  :checked="isOverlayVisible(m.id)"
                  @change="toggleOverlay(m.id, ($event.target as HTMLInputElement).checked)"
                />
                <span :class="{ disabled: subtractModeActive }">Live</span>
              </label>
              <label
                v-if="m.peakHoldDbm"
                class="overlay-toggle"
                :title="subtractModeActive ? 'Not available while subtracting (wrong scale)' : `Overlay this measurement's peak-hold curve`"
              >
                <input
                  type="checkbox"
                  :disabled="subtractModeActive"
                  :checked="isPeakOverlayVisible(m.id)"
                  @change="togglePeakOverlay(m.id, ($event.target as HTMLInputElement).checked)"
                />
                <span :class="{ disabled: subtractModeActive }">Peak</span>
              </label>
              <label
                class="overlay-toggle subtract-toggle"
                :class="{ disabled: !isSweepCompatible(m) }"
                :title="
                  isSweepCompatible(m)
                    ? 'Subtract this measurement from the live trace (and peak hold, if it has a peak-hold curve)'
                    : 'Sweep range/points do not match the current sweep'
                "
              >
                <input
                  type="checkbox"
                  :disabled="!isSweepCompatible(m)"
                  :checked="isSubtractSource(m)"
                  @change="toggleSubtract(m, ($event.target as HTMLInputElement).checked)"
                />
                <span :class="{ disabled: !isSweepCompatible(m) }">Subtract</span>
              </label>
            </div>
          </div>
          <p v-if="m.note" class="note">{{ m.note }}</p>
          <div class="row-actions">
            <button type="button" @click="startEdit(m.id, m.name, m.note)">Edit</button>
            <button type="button" @click="exportOne(m.id, m.name)">JSON</button>
            <button type="button" @click="exportOneCsv(m)">CSV</button>
            <button type="button" @click="confirmRemove(m.id, m.name)">Delete</button>
          </div>
        </template>
      </li>
    </ul>
  </fieldset>
</template>

<style scoped>
.measurements-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem 1rem 1rem;
  max-width: 26rem;
}
.empty {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted-ink);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.list li {
  border-top: 1px solid var(--gridline);
  padding-top: 0.75rem;
  font-size: 0.85rem;
}
.row-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
.sweep-info {
  margin: 0.3rem 0 0;
  font-size: 0.75rem;
  color: var(--muted-ink);
  font-variant-numeric: tabular-nums;
}
.sweep-info .nowrap {
  white-space: nowrap;
}
.overlay-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.4rem;
}
.overlay-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}
.subtract-toggle {
  margin-left: 0.3rem;
  padding-left: 0.7rem;
  border-left: 1px solid var(--gridline);
}
.subtract-toggle.disabled {
  cursor: not-allowed;
}
.subtract-toggle.disabled span {
  opacity: 0.5;
}
.overlay-toggles-label {
  font-size: 0.75rem;
  color: var(--muted-ink);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.overlay-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.name {
  font-weight: 600;
}
.meta {
  color: var(--muted-ink);
  font-size: 0.75rem;
}
.note {
  margin: 0.3rem 0 0;
  color: var(--secondary-ink);
  font-size: 0.8rem;
}
.row-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.edit-name,
.edit-note {
  width: 100%;
  font: inherit;
  margin-bottom: 0.4rem;
}
</style>
