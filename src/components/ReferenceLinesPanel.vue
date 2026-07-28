<script setup lang="ts">
import { ref } from 'vue'
import { useReferenceLines } from '../composables/useReferenceLines'
import { LIMIT_PRESET_DISCLAIMER } from '../data/limitPresets'
import CustomLimitLineEditor from './CustomLimitLineEditor.vue'

const { presets, isPresetEnabled, togglePreset, customLines, removeCustomLine, subtractModeActive } = useReferenceLines()
const showEditor = ref(false)
</script>

<template>
  <fieldset class="reference-lines-panel" :title="LIMIT_PRESET_DISCLAIMER">
    <legend>Reference lines</legend>

    <ul class="preset-list">
      <li
        v-for="preset in presets"
        :key="preset.id"
        :title="subtractModeActive ? 'Not shown while subtracting (wrong scale)' : preset.disclaimer"
      >
        <label>
          <input
            type="checkbox"
            :disabled="subtractModeActive"
            :checked="isPresetEnabled(preset.id)"
            @change="togglePreset(preset.id, ($event.target as HTMLInputElement).checked)"
          />
          <span :class="{ disabled: subtractModeActive }">{{ preset.name }}</span>
        </label>
      </li>
    </ul>

    <ul v-if="customLines.length" class="custom-list">
      <li v-for="line in customLines" :key="line.id" :title="subtractModeActive ? 'Not shown while subtracting (wrong scale)' : ''">
        <span :class="{ disabled: subtractModeActive }">{{ line.name }} ({{ line.unit }})</span>
        <button type="button" @click="removeCustomLine(line.id)">Remove</button>
      </li>
    </ul>

    <button type="button" @click="showEditor = !showEditor">
      {{ showEditor ? 'Cancel' : 'Add custom line…' }}
    </button>
    <CustomLimitLineEditor v-if="showEditor" @submit="showEditor = false" />
  </fieldset>
</template>

<style scoped>
.reference-lines-panel {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  max-width: 26rem;
}
.preset-list,
.custom-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.preset-list label {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: default;
}
.custom-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}
span.disabled {
  opacity: 0.5;
}
</style>
