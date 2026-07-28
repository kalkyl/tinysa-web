<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNoiseFloor, NOISE_FLOOR_MEASUREMENT_ID, frequenciesMatch } from '../composables/useNoiseFloor'
import { useMeasurementStore } from '../composables/useMeasurementStore'
import { useLiveMeasurement } from '../composables/useLiveMeasurement'
import { useSweepConfig } from '../composables/useSweepConfig'
import { useSerialPort } from '../composables/useSerialPort'
import { useAveraging } from '../composables/useAveraging'
import { computeFrequencyList } from '../utils/frequencyList'
import type { StoredMeasurement } from '../types/measurement'

const { subtractSourceId, enabled, setSource, setEnabled } = useNoiseFloor()
const { measurements, save, remove } = useMeasurementStore()
const { preSubtractionFrame, peakFrequenciesHz, peakAmplitudesDbm, calibrationOffsetDb } = useLiveMeasurement()
const { sweepConfig, rbw } = useSweepConfig()
const { device } = useSerialPort()
const { enabled: averagingEnabled, windowSize: averagingWindowSize } = useAveraging()

const canCapture = computed(() => !!preSubtractionFrame.value)
const capturing = ref(false)

// The noise floor is really just another measurement — captured with the
// same live+peak curves as a regular save, just tagged `isNoiseFloor` and
// kept out of the visible list — so it's persisted like any other
// measurement rather than living in its own separate, easy-to-lose state.
const noiseFloorMeasurement = computed(() => measurements.value.find((m) => m.id === NOISE_FLOOR_MEASUREMENT_ID) ?? null)
const isNoiseFloorSource = computed(() => subtractSourceId.value === NOISE_FLOOR_MEASUREMENT_ID)

async function captureNow(): Promise<void> {
  const frame = preSubtractionFrame.value
  if (!frame) return
  capturing.value = true
  try {
    const now = Date.now()
    const measurement: StoredMeasurement = {
      id: NOISE_FLOOR_MEASUREMENT_ID,
      schemaVersion: 1,
      name: 'Noise floor',
      note: '',
      createdAt: noiseFloorMeasurement.value?.createdAt ?? now,
      updatedAt: now,
      deviceModel: device.value?.profile.id ?? 'unknown',
      sweep: { ...sweepConfig.value, rbwKHz: rbw.value },
      calibrationOffsetDb: calibrationOffsetDb.value,
      averagingWindowSize: averagingEnabled.value ? averagingWindowSize.value : null,
      frequenciesHz: frame.frequenciesHz,
      amplitudesDbm: frame.amplitudesDbm,
      peakHoldDbm: peakFrequenciesHz.value && peakAmplitudesDbm.value ? peakAmplitudesDbm.value : null,
      isNoiseFloor: true,
    }
    await save(measurement)
    setSource(NOISE_FLOOR_MEASUREMENT_ID)
  } finally {
    capturing.value = false
  }
}

async function clearCapture(): Promise<void> {
  if (isNoiseFloorSource.value) {
    setSource(null)
    setEnabled(false)
  }
  await remove(NOISE_FLOOR_MEASUREMENT_ID)
}

// Mutually exclusive with any measurement's own Subtract checkbox — there's
// only one active source id, so selecting this one deselects whichever
// measurement (if any) was previously subtracting, and vice versa.
function toggleSubtract(checked: boolean): void {
  setSource(checked ? NOISE_FLOOR_MEASUREMENT_ID : null)
  setEnabled(checked)
}

const capturedLabel = computed(() =>
  noiseFloorMeasurement.value ? new Date(noiseFloorMeasurement.value.updatedAt).toLocaleTimeString() : null,
)

const currentFrequenciesHz = computed(() => {
  const cfg = sweepConfig.value
  return computeFrequencyList(cfg.startHz, cfg.stopHz, cfg.points)
})
const isCompatible = computed(() => {
  const m = noiseFloorMeasurement.value
  return !!m && frequenciesMatch(m.frequenciesHz, currentFrequenciesHz.value)
})
const toggleDisabled = computed(() => !noiseFloorMeasurement.value || !isCompatible.value)
const mismatchNotice = computed(() => {
  if (!noiseFloorMeasurement.value || isCompatible.value) return null
  return "Baseline doesn't match the current sweep range/points."
})
</script>

<template>
  <fieldset
    class="noise-floor-controls"
    title="Point at an ambient/no-signal condition, then capture — it'll be subtracted from the live trace and peak hold. To compare against a saved measurement instead, use the Subtract checkbox in the Measurements list (the two are mutually exclusive)."
  >
    <legend>Noise floor</legend>
    <div class="controls-row">
      <button type="button" :disabled="!canCapture || capturing" @click="captureNow">Capture now</button>
      <button type="button" :disabled="!noiseFloorMeasurement" @click="clearCapture">Clear</button>
    </div>
    <label class="toggle">
      <input
        type="checkbox"
        :disabled="toggleDisabled"
        :checked="isNoiseFloorSource && enabled"
        @change="toggleSubtract(($event.target as HTMLInputElement).checked)"
      />
      <span :class="{ disabled: toggleDisabled }">Subtract</span>
    </label>
    <span class="captured-at">{{ noiseFloorMeasurement ? `Captured ${capturedLabel}` : 'No baseline set' }}</span>
    <p v-if="mismatchNotice" class="notice">{{ mismatchNotice }}</p>
  </fieldset>
</template>

<style scoped>
.noise-floor-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}
.controls-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
}
.toggle span.disabled {
  opacity: 0.5;
}
.captured-at {
  font-size: 0.75rem;
  color: var(--muted-ink);
}
.notice {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted-ink);
}
</style>
