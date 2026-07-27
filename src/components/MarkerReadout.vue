<script setup lang="ts">
import { computed } from 'vue'
import { useMarkers, type MarkerId } from '../composables/useMarkers'
import { useLiveMeasurement } from '../composables/useLiveMeasurement'
import { useDisplayUnits } from '../composables/useDisplayUnits'
import { formatAmplitude, convertFromDbm } from '../plot/units'
import { formatFrequencyHz } from '../plot/axes'
import { nearestBinIndex } from '../utils/nearestBin'
import { findHarmonicBases } from '../utils/harmonicFinder'

const { marker1, marker2, activeMarker, setActiveMarker, setEnabled, clear } = useMarkers()
const { displayedFrame } = useLiveMeasurement()
const { yAxisUnit } = useDisplayUnits()

function amplitudeAt(freqHz: number): number | null {
  const frame = displayedFrame.value
  if (!frame || frame.frequenciesHz.length === 0) return null
  return convertFromDbm(frame.amplitudesDbm[nearestBinIndex(frame.frequenciesHz, freqHz)], yAxisUnit.value)
}

const rows = computed(() =>
  ([1, 2] as MarkerId[]).map((id) => {
    const state = id === 1 ? marker1.value : marker2.value
    const amplitude = state.enabled ? amplitudeAt(state.freqHz) : null
    return {
      id,
      label: `M${id}`,
      enabled: state.enabled,
      freqHz: state.freqHz,
      amplitude,
      freqLabel: state.enabled ? formatFrequencyHz(state.freqHz) : '—',
      ampLabel: state.enabled && amplitude !== null ? formatAmplitude(amplitude, yAxisUnit.value) : '—',
    }
  }),
)

const delta = computed(() => {
  if (!marker1.value.enabled || !marker2.value.enabled) return null
  const deltaFreqHz = marker2.value.freqHz - marker1.value.freqHz
  const amp1 = amplitudeAt(marker1.value.freqHz)
  const amp2 = amplitudeAt(marker2.value.freqHz)
  const deltaAmp = amp1 !== null && amp2 !== null ? amp2 - amp1 : null
  return { deltaFreqHz, deltaAmp }
})

const harmonicCandidates = computed(() => {
  if (!marker1.value.enabled || !marker2.value.enabled) return []
  return findHarmonicBases(marker1.value.freqHz, marker2.value.freqHz).slice(0, 4)
})
</script>

<template>
  <fieldset class="marker-readout" title="Click the plot to place the active marker.">
    <legend>Markers</legend>

    <div v-for="row in rows" :key="row.id" class="marker-row">
      <label class="active-radio">
        <input
          type="radio"
          name="active-marker"
          :checked="activeMarker === row.id"
          @change="setActiveMarker(row.id)"
        />
        {{ row.label }}
      </label>
      <label class="enabled-checkbox">
        <input
          type="checkbox"
          :checked="row.enabled"
          @change="setEnabled(row.id, ($event.target as HTMLInputElement).checked)"
        />
      </label>
      <span class="readout">{{ row.freqLabel }}<template v-if="row.enabled">, {{ row.ampLabel }}</template></span>
      <button type="button" :disabled="!row.enabled" @click="clear(row.id)">Clear</button>
    </div>

    <p v-if="delta" class="delta">
      Δ: {{ (delta.deltaFreqHz / 1e6).toFixed(3) }} MHz<template v-if="delta.deltaAmp !== null">
        , {{ delta.deltaAmp >= 0 ? '+' : '' }}{{ delta.deltaAmp.toFixed(1) }} {{ yAxisUnit === 'dBuV' ? 'dBµV' : 'dBm' }}</template
      >
    </p>

    <details v-if="delta" class="harmonics">
      <summary>Possible common base…</summary>
      <ul v-if="harmonicCandidates.length">
        <li v-for="c in harmonicCandidates" :key="c.baseHz">
          {{ formatFrequencyHz(c.baseHz) }} (lower=×{{ c.nLow }}, higher=×{{ c.nHigh }}, ±{{ (c.errorFraction * 100).toFixed(1) }}%)
        </li>
      </ul>
      <p v-else class="hint">No clean harmonic relationship found within tolerance.</p>
    </details>
  </fieldset>
</template>

<style scoped>
.marker-readout {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
}
.hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted-ink);
}
.marker-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.active-radio,
.enabled-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.readout {
  flex: 1;
  font-variant-numeric: tabular-nums;
}
.delta {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  font-weight: 600;
}
.harmonics {
  margin-top: 0.1rem;
  font-size: 0.75rem;
  color: var(--muted-ink);
}
.harmonics summary {
  cursor: pointer;
}
.harmonics ul {
  margin: 0.2rem 0 0;
  padding: 0 0 0 1.1rem;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
</style>
