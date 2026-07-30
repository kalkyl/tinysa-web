<script setup lang="ts">
import { computed } from 'vue'
import { useDisplayUnits } from '../composables/useDisplayUnits'
import { useSubtractModeActive } from '../composables/useSubtractMode'
import { useWaterfall } from '../composables/useWaterfall'
import { convertFromDbm, convertToDbm, unitLabel } from '../plot/units'
import { MARGIN } from '../plot/PlotRenderer'

const { xAxisScale, yAxisUnit } = useDisplayUnits()

// While subtracting, the live/peak curves are a relative dB delta, not an
// absolute power — a dBm/dBuV choice has nothing to apply to, so hide it
// rather than show a selector that does nothing.
const subtractModeActive = useSubtractModeActive()

const {
  enabled: waterfallEnabled,
  windowSeconds: waterfallWindowSeconds,
  rows: waterfallRows,
  colorAuto: waterfallColorAuto,
  colorMinDbm: waterfallColorMinDbm,
  colorMaxDbm: waterfallColorMaxDbm,
  setEnabled: setWaterfallEnabled,
  clear: clearWaterfall,
} = useWaterfall()
const hasWaterfallData = computed(() => waterfallRows.value.length > 0)

// Same relative-dB-delta caveat as the Y-axis unit above: a subtracted value is
// unit-invariant, so skip the dBm/dBuV conversion and just show it as a plain dB delta.
const waterfallUnitLabel = computed(() => (subtractModeActive.value ? 'dB' : unitLabel(yAxisUnit.value)))
const waterfallMinDisplay = computed({
  get: () => Math.round((subtractModeActive.value ? waterfallColorMinDbm.value : convertFromDbm(waterfallColorMinDbm.value, yAxisUnit.value)) * 10) / 10,
  set: (v: number) => (waterfallColorMinDbm.value = subtractModeActive.value ? v : convertToDbm(v, yAxisUnit.value)),
})
const waterfallMaxDisplay = computed({
  get: () => Math.round((subtractModeActive.value ? waterfallColorMaxDbm.value : convertFromDbm(waterfallColorMaxDbm.value, yAxisUnit.value)) * 10) / 10,
  set: (v: number) => (waterfallColorMaxDbm.value = subtractModeActive.value ? v : convertToDbm(v, yAxisUnit.value)),
})
</script>

<template>
  <fieldset class="display-options" :style="{ marginLeft: `${MARGIN.left}px`, marginRight: `${MARGIN.right}px` }">
    <legend>Display</legend>
    <div class="radio-group">
      <span class="group-label">X-axis</span>
      <label class="radio"><input v-model="xAxisScale" type="radio" value="linear" /> Linear</label>
      <label class="radio"><input v-model="xAxisScale" type="radio" value="log" /> Log</label>
    </div>
    <div v-if="!subtractModeActive" class="radio-group">
      <span class="group-label">Y-axis unit</span>
      <label class="radio"><input v-model="yAxisUnit" type="radio" value="dBm" /> <span class="unit">dBm</span></label>
      <label class="radio"><input v-model="yAxisUnit" type="radio" value="dBuV" /> <span class="unit">dBµV</span></label>
    </div>
    <div class="divider" aria-hidden="true"></div>
    <div class="radio-group">
      <label class="radio">
        <input
          type="checkbox"
          :checked="waterfallEnabled"
          @change="setWaterfallEnabled(($event.target as HTMLInputElement).checked)"
        />
        Waterfall
      </label>
      <template v-if="waterfallEnabled">
        <label class="radio">
          Window (s)
          <input v-model.number="waterfallWindowSeconds" type="number" min="5" max="600" step="5" />
        </label>
        <button type="button" :disabled="!hasWaterfallData" @click="clearWaterfall">Clear</button>
        <label class="radio">
          <input
            type="checkbox"
            :checked="waterfallColorAuto"
            @change="waterfallColorAuto = ($event.target as HTMLInputElement).checked"
          />
          Auto sensitivity
        </label>
        <template v-if="!waterfallColorAuto">
          <label class="radio">
            Min ({{ waterfallUnitLabel }})
            <input v-model.number="waterfallMinDisplay" type="number" step="1" />
          </label>
          <label class="radio">
            Max ({{ waterfallUnitLabel }})
            <input v-model.number="waterfallMaxDisplay" type="number" step="1" />
          </label>
        </template>
      </template>
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
.unit {
  text-transform: none;
}
.divider {
  align-self: stretch;
  width: 1px;
  background: var(--border);
}
.radio {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
}
input[type='number'] {
  width: 4.5rem;
}
</style>
