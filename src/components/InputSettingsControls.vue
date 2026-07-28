<script setup lang="ts">
import { useInputSettings } from '../composables/useInputSettings'

const { inputMode, attenuatorAuto, attenuatorDb, effectiveAttenuatorDb } = useInputSettings()
</script>

<template>
  <fieldset class="input-settings" title="RF front-end settings, applied to the device when streaming starts (or changes mid-stream).">
    <legend>Input</legend>

    <label>
      Port mode
      <select v-model="inputMode">
        <option value="low">Low (≤350 MHz)</option>
        <option value="high">High (≥240 MHz)</option>
      </select>
    </label>

    <div class="attenuator-field">
      <label>
        Attenuator (dB)
        <input v-model.number="attenuatorDb" type="number" step="1" min="0" max="31" :disabled="attenuatorAuto" />
      </label>
      <label
        class="inline-checkbox"
        title="Not an adaptive AGC on tinySA Basic — it's a fixed preset: 30dB in Low input mode, 0dB in High."
      >
        <input v-model="attenuatorAuto" type="checkbox" />
        Auto
      </label>
      <p v-if="effectiveAttenuatorDb !== null" class="effective">Effective: {{ effectiveAttenuatorDb.toFixed(0) }} dB</p>
    </div>
  </fieldset>
</template>

<style scoped>
.input-settings {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
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
.attenuator-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.inline-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
}
input[type='number'] {
  width: 6rem;
}
input[type='number']:disabled {
  opacity: 0.5;
}
.effective {
  margin: 0;
  font-size: 0.75rem;
  color: var(--secondary-ink);
}
</style>
