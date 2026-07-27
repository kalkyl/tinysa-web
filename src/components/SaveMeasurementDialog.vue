<script setup lang="ts">
import { computed, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useMeasurementStore } from '../composables/useMeasurementStore'
import { useLiveMeasurement } from '../composables/useLiveMeasurement'
import { useSweepConfig } from '../composables/useSweepConfig'
import { useSerialPort } from '../composables/useSerialPort'
import type { StoredMeasurement } from '../types/measurement'

const { save } = useMeasurementStore()
const { displayedFrame, peakFrequenciesHz, peakAmplitudesDbm, calibrationOffsetDb } = useLiveMeasurement()
const { sweepConfig, rbw } = useSweepConfig()
const { device } = useSerialPort()

const name = ref('')
const note = ref('')
const saving = ref(false)

const canSave = computed(() => !!displayedFrame.value && name.value.trim().length > 0 && !saving.value)

async function submit(): Promise<void> {
  const frame = displayedFrame.value
  if (!frame || !name.value.trim()) return
  saving.value = true
  try {
    const now = Date.now()
    const measurement: StoredMeasurement = {
      id: uuidv4(),
      schemaVersion: 1,
      name: name.value.trim(),
      note: note.value.trim(),
      createdAt: now,
      updatedAt: now,
      deviceModel: device.value?.profile.id ?? 'unknown',
      sweep: { ...sweepConfig.value, rbwKHz: rbw.value },
      calibrationOffsetDb: calibrationOffsetDb.value,
      frequenciesHz: frame.frequenciesHz,
      amplitudesDbm: frame.amplitudesDbm,
      peakHoldDbm: peakFrequenciesHz.value && peakAmplitudesDbm.value ? peakAmplitudesDbm.value : null,
    }
    await save(measurement)
    name.value = ''
    note.value = ''
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="save-dialog" @submit.prevent="submit">
    <label>
      Name
      <input v-model="name" type="text" placeholder="e.g. Prototype v2, antenna A" />
    </label>
    <label>
      Note
      <textarea v-model="note" rows="2" placeholder="Test setup, conditions, anything worth remembering…"></textarea>
    </label>
    <button
      type="submit"
      :disabled="!canSave"
      :title="!displayedFrame ? 'Start streaming to capture a measurement to save.' : ''"
    >
      Save current measurement
    </button>
  </form>
</template>

<style scoped>
.save-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
input,
textarea {
  font: inherit;
}
.hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted-ink);
}
</style>
