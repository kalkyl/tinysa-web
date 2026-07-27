<script setup lang="ts">
import { ref } from 'vue'
import { useMeasurementStore } from '../composables/useMeasurementStore'

const { measurements, exportAllJson, importJson } = useMeasurementStore()
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportAll(): void {
  downloadJson(`tinysa-measurements-${new Date().toISOString().slice(0, 10)}.json`, exportAllJson())
}

function triggerImport(): void {
  fileInput.value?.click()
}

async function handleFileChange(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importError.value = null
  importSuccess.value = null
  try {
    const text = await file.text()
    const count = await importJson(text)
    importSuccess.value = `Imported ${count} measurement${count === 1 ? '' : 's'}.`
  } catch (err) {
    importError.value = `Import failed: ${err instanceof Error ? err.message : String(err)}`
  }
}
</script>

<template>
  <div class="export-import-controls">
    <button type="button" :disabled="measurements.length === 0" @click="exportAll">Export all…</button>
    <button type="button" @click="triggerImport">Import…</button>
    <input ref="fileInput" type="file" accept="application/json" class="hidden-input" @change="handleFileChange" />
    <p v-if="importError" class="error">{{ importError }}</p>
    <p v-if="importSuccess" class="success">{{ importSuccess }}</p>
  </div>
</template>

<style scoped>
.export-import-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.hidden-input {
  display: none;
}
.error {
  color: var(--error-ink);
  font-size: 0.75rem;
  margin: 0;
  flex-basis: 100%;
}
.success {
  color: var(--secondary-ink);
  font-size: 0.75rem;
  margin: 0;
  flex-basis: 100%;
}
</style>
