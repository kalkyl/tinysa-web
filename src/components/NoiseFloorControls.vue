<script setup lang="ts">
import { computed } from 'vue'
import { useNoiseFloor } from '../composables/useNoiseFloor'
import { useLiveMeasurement } from '../composables/useLiveMeasurement'

const { enabled, baselineAmplitudesDbm, capturedAtMs, capture, clear } = useNoiseFloor()
const { preSubtractionFrame } = useLiveMeasurement()

const canCapture = computed(() => !!preSubtractionFrame.value)

function captureNow(): void {
  const frame = preSubtractionFrame.value
  if (!frame) return
  capture(frame.frequenciesHz, frame.amplitudesDbm)
}

const capturedLabel = computed(() => (capturedAtMs.value ? new Date(capturedAtMs.value).toLocaleTimeString() : null))
</script>

<template>
  <fieldset
    class="noise-floor-controls"
    title="Point at an ambient/no-signal condition, then capture — it'll be subtracted from the trace."
  >
    <legend>Noise floor</legend>
    <div class="controls-row">
      <button type="button" :disabled="!canCapture" @click="captureNow">Capture now</button>
      <button type="button" :disabled="!baselineAmplitudesDbm" @click="clear">Clear</button>
    </div>
    <label class="toggle">
      <input
        type="checkbox"
        :disabled="!baselineAmplitudesDbm"
        :checked="enabled"
        @change="enabled = ($event.target as HTMLInputElement).checked"
      />
      Subtract
    </label>
    <span class="captured-at">{{ capturedLabel ? `Captured ${capturedLabel}` : 'No baseline captured' }}</span>
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
.captured-at {
  font-size: 0.75rem;
  color: var(--muted-ink);
}
</style>
