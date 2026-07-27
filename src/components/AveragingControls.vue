<script setup lang="ts">
import { useAveraging } from '../composables/useAveraging'

const { enabled, windowSize, averagedAmplitudesDbm, setEnabled, reset } = useAveraging()
</script>

<template>
  <fieldset class="averaging-controls">
    <legend>Averaging</legend>
    <div class="sweeps-row">
      <label>
        Sweeps
        <input v-model.number="windowSize" type="number" min="2" max="200" step="1" :disabled="!enabled" />
      </label>
      <button type="button" :disabled="!averagedAmplitudesDbm" @click="reset">Reset average</button>
    </div>
    <label class="toggle">
      <input type="checkbox" :checked="enabled" @change="setEnabled(($event.target as HTMLInputElement).checked)" />
      Enable
    </label>
  </fieldset>
</template>

<style scoped>
.averaging-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
.sweeps-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}
.toggle {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}
input[type='number'] {
  width: 5rem;
}
</style>
