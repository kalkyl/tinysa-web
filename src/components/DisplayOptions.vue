<script setup lang="ts">
import { useDisplayUnits } from '../composables/useDisplayUnits'
import { MARGIN } from '../plot/PlotRenderer'

const { xAxisScale, yAxisUnit } = useDisplayUnits()
</script>

<template>
  <fieldset class="display-options" :style="{ marginLeft: `${MARGIN.left}px`, marginRight: `${MARGIN.right}px` }">
    <legend>Display</legend>
    <div class="radio-group">
      <span class="group-label">X-axis</span>
      <label class="radio"><input v-model="xAxisScale" type="radio" value="linear" /> Linear</label>
      <label class="radio"><input v-model="xAxisScale" type="radio" value="log" /> Log</label>
    </div>
    <div class="radio-group">
      <span class="group-label">Y-axis unit</span>
      <label class="radio"><input v-model="yAxisUnit" type="radio" value="dBm" /> dBm</label>
      <label class="radio"><input v-model="yAxisUnit" type="radio" value="dBuV" /> dBµV</label>
    </div>
  </fieldset>
</template>

<style scoped>
.display-options {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 0.5rem 1rem;
}
.radio-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
.group-label {
  color: var(--muted-ink);
}
.radio {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
}
</style>
