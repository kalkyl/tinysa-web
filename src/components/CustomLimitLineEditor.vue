<script setup lang="ts">
import { ref } from 'vue'
import { useReferenceLines } from '../composables/useReferenceLines'
import { useDisplayUnits } from '../composables/useDisplayUnits'
import type { Breakpoint } from '../utils/interpolate'

const { addCustomLine } = useReferenceLines()
const { yAxisUnit } = useDisplayUnits()
const emit = defineEmits<{ submit: [] }>()

interface Row {
  mhz: number
  db: number
}

const name = ref('')
const rows = ref<Row[]>([
  { mhz: 30, db: -50 },
  { mhz: 1000, db: -50 },
])

function addRow(): void {
  const last = rows.value[rows.value.length - 1]
  rows.value = [...rows.value, { mhz: (last?.mhz ?? 0) + 10, db: last?.db ?? -50 }]
}

function removeRow(index: number): void {
  rows.value = rows.value.filter((_, i) => i !== index)
}

function submit(): void {
  if (!name.value.trim() || rows.value.length < 2) return
  const breakpoints: Breakpoint[] = rows.value.map((r) => ({ freqHz: r.mhz * 1e6, dB: r.db }))
  addCustomLine(name.value.trim(), yAxisUnit.value, breakpoints)
  name.value = ''
  rows.value = [
    { mhz: 30, db: -50 },
    { mhz: 1000, db: -50 },
  ]
  emit('submit')
}
</script>

<template>
  <form class="custom-line-editor" @submit.prevent="submit">
    <label>
      Name
      <input v-model="name" type="text" placeholder="My limit line" />
    </label>

    <table>
      <thead>
        <tr>
          <th>Freq (MHz)</th>
          <th>Level ({{ yAxisUnit }})</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td><input v-model.number="row.mhz" type="number" step="0.001" /></td>
          <td><input v-model.number="row.db" type="number" step="0.1" /></td>
          <td><button type="button" :disabled="rows.length <= 2" @click="removeRow(i)">✕</button></td>
        </tr>
      </tbody>
    </table>

    <div class="row-actions">
      <button type="button" @click="addRow">Add point</button>
      <button type="submit" :disabled="!name.trim() || rows.length < 2">Add line</button>
    </div>
  </form>
</template>

<style scoped>
.custom-line-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
table {
  border-collapse: collapse;
  font-size: 0.8rem;
}
th {
  text-align: left;
  color: var(--muted-ink);
  font-weight: 500;
  padding: 0.15rem 0.4rem;
}
td {
  padding: 0.15rem 0.4rem;
}
td input {
  width: 6rem;
}
.row-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
