<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSweepConfig } from '../composables/useSweepConfig'
import { useSerialPort } from '../composables/useSerialPort'
import { useLiveMeasurement } from '../composables/useLiveMeasurement'
import { useYAxisRange } from '../composables/useYAxisRange'
import { useDisplayUnits } from '../composables/useDisplayUnits'
import { useSweepPresets } from '../composables/useSweepPresets'
import { convertFromDbm, convertToDbm } from '../plot/units'

const { startHz, stopHz, rbw, points, sweepConfig, validationError } = useSweepConfig()
const { state } = useSerialPort()
const { isStreaming, streamError, start, stop } = useLiveMeasurement()
const { auto: yAxisAuto, manualMinDbm, manualMaxDbm } = useYAxisRange()
const { yAxisUnit } = useDisplayUnits()
const { builtInPresets, customPresets, addCustomPreset, removeCustomPreset, isCustomPreset } = useSweepPresets()

// manualMinDbm/manualMaxDbm are always dBm internally; these proxies show/accept the selected unit.
const manualMinDisplay = computed({
  get: () => Math.round(convertFromDbm(manualMinDbm.value, yAxisUnit.value) * 10) / 10,
  set: (v: number) => (manualMinDbm.value = convertToDbm(v, yAxisUnit.value)),
})
const manualMaxDisplay = computed({
  get: () => Math.round(convertFromDbm(manualMaxDbm.value, yAxisUnit.value) * 10) / 10,
  set: (v: number) => (manualMaxDbm.value = convertToDbm(v, yAxisUnit.value)),
})

const startMHz = computed({
  get: () => startHz.value / 1e6,
  set: (v: number) => (startHz.value = v * 1e6),
})
const stopMHz = computed({
  get: () => stopHz.value / 1e6,
  set: (v: number) => (stopHz.value = v * 1e6),
})
const rbwAuto = ref(rbw.value === 'auto')
const rbwKHz = ref(typeof rbw.value === 'number' ? rbw.value : 30)

function syncRbw(): void {
  rbw.value = rbwAuto.value ? 'auto' : rbwKHz.value
}

const selectedPresetId = ref('')

function applyPreset(id: string): void {
  const preset = [...builtInPresets, ...customPresets.value].find((p) => p.id === id)
  if (!preset) return
  startHz.value = preset.startHz
  stopHz.value = preset.stopHz
  selectedPresetId.value = id
}

const showSaveForm = ref(false)
const newPresetName = ref('')

function saveCurrentAsPreset(): void {
  if (!newPresetName.value.trim()) return
  addCustomPreset(newPresetName.value.trim(), startHz.value, stopHz.value)
  newPresetName.value = ''
  showSaveForm.value = false
}

function deleteSelectedPreset(): void {
  if (!isCustomPreset(selectedPresetId.value)) return
  const preset = customPresets.value.find((p) => p.id === selectedPresetId.value)
  if (!preset || !window.confirm(`Delete preset "${preset.label}"? This can't be undone.`)) return
  removeCustomPreset(selectedPresetId.value)
  selectedPresetId.value = ''
}

const canStream = computed(() => state.value === 'connected' && !validationError.value)

async function toggleStreaming(): Promise<void> {
  if (isStreaming.value) {
    stop()
    return
  }
  try {
    await start(() => sweepConfig.value, () => rbw.value)
  } catch {
    // streamError surfaces the message; nothing else to do here.
  }
}
</script>

<template>
  <fieldset class="sweep-controls">
    <legend>Sweep</legend>

    <button
      class="stream-toggle"
      :class="{ primary: !isStreaming }"
      :disabled="!canStream && !isStreaming"
      @click="toggleStreaming"
    >
      {{ isStreaming ? 'Stop' : 'Start' }} streaming
    </button>

    <label>
      Start (MHz)
      <input v-model.number="startMHz" type="number" step="0.001" :disabled="isStreaming" />
    </label>
    <label>
      Stop (MHz)
      <input v-model.number="stopMHz" type="number" step="0.001" :disabled="isStreaming" />
    </label>
    <label>
      Points
      <input v-model.number="points" type="number" step="1" min="2" :disabled="isStreaming" />
    </label>

    <div class="checkbox-group">
      <span class="spacer-label" aria-hidden="true">&nbsp;</span>
      <label class="inline-checkbox">
        <input v-model="rbwAuto" type="checkbox" @change="syncRbw" />
        RBW auto
      </label>
    </div>
    <label v-if="!rbwAuto">
      RBW (kHz)
      <input v-model.number="rbwKHz" type="number" step="0.1" min="0.1" @change="syncRbw" />
    </label>

    <div class="checkbox-group">
      <span class="spacer-label" aria-hidden="true">&nbsp;</span>
      <label class="inline-checkbox">
        <input v-model="yAxisAuto" type="checkbox" />
        Auto Y-axis
      </label>
    </div>
    <template v-if="!yAxisAuto">
      <label>
        Y min ({{ yAxisUnit }})
        <input v-model.number="manualMinDisplay" type="number" step="1" />
      </label>
      <label>
        Y max ({{ yAxisUnit }})
        <input v-model.number="manualMaxDisplay" type="number" step="1" />
      </label>
    </template>

    <div class="preset-group">
      <label>
        Preset
        <select v-model="selectedPresetId" :disabled="isStreaming" @change="applyPreset(selectedPresetId)">
          <option value="">Custom</option>
          <optgroup label="Built-in">
            <option v-for="p in builtInPresets" :key="p.id" :value="p.id">{{ p.label }}</option>
          </optgroup>
          <optgroup v-if="customPresets.length" label="Saved">
            <option v-for="p in customPresets" :key="p.id" :value="p.id">{{ p.label }}</option>
          </optgroup>
        </select>
      </label>
      <div class="checkbox-group">
        <span class="spacer-label" aria-hidden="true">&nbsp;</span>
        <button type="button" :disabled="isStreaming" @click="showSaveForm = !showSaveForm">Save as preset…</button>
      </div>
      <div class="checkbox-group">
        <span class="spacer-label" aria-hidden="true">&nbsp;</span>
        <button type="button" :disabled="!isCustomPreset(selectedPresetId)" @click="deleteSelectedPreset">Delete preset</button>
      </div>
    </div>

    <div v-if="showSaveForm" class="save-preset-form">
      <input v-model="newPresetName" type="text" placeholder="Preset name" @keyup.enter="saveCurrentAsPreset" />
      <button type="button" :disabled="!newPresetName.trim()" @click="saveCurrentAsPreset">Save</button>
    </div>

    <p v-if="validationError" class="warning">{{ validationError }}</p>
    <p v-if="streamError" class="warning">{{ streamError }}</p>
  </fieldset>
</template>

<style scoped>
.sweep-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.spacer-label {
  font-size: 0.8rem;
  visibility: hidden;
}
.inline-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
}
input[type='number'] {
  width: 7rem;
}
.stream-toggle {
  font-weight: 600;
}
.preset-group {
  display: flex;
  align-items: end;
  gap: 0.5rem;
  margin-left: auto;
}
.save-preset-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.warning {
  flex-basis: 100%;
  color: var(--error-ink);
  font-size: 0.8rem;
  margin: 0;
}
</style>
