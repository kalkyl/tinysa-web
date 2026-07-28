<script setup lang="ts">
import { useLiveMeasurement } from '../composables/useLiveMeasurement'
import { useYAxisRange } from '../composables/useYAxisRange'

const { peakAmplitudesDbm, wasResetByBinCountChange, reset } = useLiveMeasurement()
const { resetAutoRange } = useYAxisRange()

function resetPeakHold(): void {
  reset()
  resetAutoRange()
}
</script>

<template>
  <fieldset class="peak-hold-controls">
    <legend>Peak hold</legend>
    <button :disabled="!peakAmplitudesDbm" @click="resetPeakHold">Reset peak hold</button>
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
.notice {
  margin: 0;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
</style>
