<script setup lang="ts">
import { useCalibrationOffset } from '../composables/useCalibrationOffset'

const { calibrationOffsetDb } = useCalibrationOffset()
</script>

<template>
  <fieldset class="calibration-control" title="Antenna factor + cable loss, added to every displayed/saved amplitude.">
    <legend>Calibration offset</legend>
    <label>
      Offset (dB)
      <input v-model.number="calibrationOffsetDb" type="number" step="0.1" />
    </label>
  </fieldset>
</template>

<style scoped>
.calibration-control {
  display: flex;
  align-items: flex-start;
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
input {
  width: 6rem;
}
</style>
