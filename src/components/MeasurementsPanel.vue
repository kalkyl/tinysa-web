<script setup lang="ts">
import { ref } from 'vue'
import { useMeasurementStore } from '../composables/useMeasurementStore'
import { buildCurvesCsv, type NamedCurve } from '../utils/csv'
import type { StoredMeasurement } from '../types/measurement'
import SaveMeasurementDialog from './SaveMeasurementDialog.vue'
import ExportImportControls from './ExportImportControls.vue'

const { measurements, remove, rename, toggleOverlay, togglePeakOverlay, isOverlayVisible, isPeakOverlayVisible, exportOneJson } =
  useMeasurementStore()

const editingId = ref<string | null>(null)
const editName = ref('')
const editNote = ref('')

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

    <p v-if="measurements.length === 0" class="empty">No saved measurements yet.</p>

    <ul class="list">
      <li v-for="m in measurements" :key="m.id">
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
          <div class="overlay-toggles">
            <span class="overlay-toggles-label">Overlay:</span>
            <label class="overlay-toggle" title="Overlay this measurement's live curve">
              <input
                type="checkbox"
                :checked="isOverlayVisible(m.id)"
                @change="toggleOverlay(m.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>Live</span>
            </label>
            <label v-if="m.peakHoldDbm" class="overlay-toggle" title="Overlay this measurement's peak-hold curve">
              <input
                type="checkbox"
                :checked="isPeakOverlayVisible(m.id)"
                @change="togglePeakOverlay(m.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>Peak hold</span>
            </label>
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
.overlay-toggles {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 0.4rem;
}
.overlay-toggles-label {
  font-size: 0.75rem;
  color: var(--muted-ink);
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
