<script setup lang="ts">
import { useLiveMeasurement } from '../composables/useLiveMeasurement'
import { useYAxisRange } from '../composables/useYAxisRange'

const { enabled, setEnabled, peakAmplitudesDbm, wasResetByBinCountChange, reset } = useLiveMeasurement()
const { resetAutoRange } = useYAxisRange()

function resetPeakHold(): void {
  reset()
  resetAutoRange()
}
</script>

<template>
  <fieldset class="peak-hold-controls">
    <legend>Peak hold</legend>
    <button :disabled="!peakAmplitudesDbm" @click="resetPeakHold">Reset peak</button>
    <label class="toggle">
      <input type="checkbox" :checked="enabled" @change="setEnabled(($event.target as HTMLInputElement).checked)" />
      Enable
    </label>
    <p v-if="wasResetByBinCountChange" class="notice">Peak hold was reset because the point count changed.</p>
  </fieldset>
</template>

<style scoped>
.peak-hold-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}
.toggle {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}
.notice {
  margin: 0;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
</style>
