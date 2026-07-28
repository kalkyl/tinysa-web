<script setup lang="ts">
import { ref } from 'vue'
import { useReferenceLines, type CustomLimitLine } from '../composables/useReferenceLines'
import { LIMIT_PRESET_DISCLAIMER } from '../data/limitPresets'
import CustomLimitLineEditor from './CustomLimitLineEditor.vue'

const {
  presets,
  isPresetEnabled,
  togglePreset,
  customLines,
  removeCustomLine,
  toggleCustomLine,
  isCustomLineEnabled,
  subtractModeActive,
} = useReferenceLines()
const showEditor = ref(false)
const editingLine = ref<CustomLimitLine | null>(null)

function openAddEditor(): void {
  editingLine.value = null
  showEditor.value = true
}

function openEditEditor(line: CustomLimitLine): void {
  editingLine.value = line
  showEditor.value = true
}

function closeEditor(): void {
  showEditor.value = false
  editingLine.value = null
}
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
        <label>
          <input
            type="checkbox"
            :disabled="subtractModeActive"
            :checked="isCustomLineEnabled(line)"
            @change="toggleCustomLine(line.id, ($event.target as HTMLInputElement).checked)"
          />
          <span :class="{ disabled: subtractModeActive }">{{ line.name }}</span>
        </label>
        <div class="custom-line-actions">
          <button type="button" @click="openEditEditor(line)">Edit</button>
          <button type="button" @click="removeCustomLine(line.id)">Remove</button>
        </div>
      </li>
    </ul>

    <button v-if="!showEditor" type="button" @click="openAddEditor">Add custom line…</button>
    <CustomLimitLineEditor
      v-if="showEditor"
      :key="editingLine?.id ?? 'new'"
      :edit-line="editingLine"
      @submit="closeEditor"
      @cancel="closeEditor"
    />
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
.preset-list label,
.custom-list label {
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
.custom-line-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
span.disabled {
  opacity: 0.5;
}
</style>
