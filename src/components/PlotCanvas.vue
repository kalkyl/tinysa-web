<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue'
import { MARGIN, PlotRenderer, type PlotDrawInput, type PlotMarkerPoint, type PlotSeries } from '../plot/PlotRenderer'
import { categoricalColor, LIVE_TRACE_SLOT, OVERLAY_SLOT_START, PEAK_HOLD_SLOT } from '../plot/colors'
import { convertArrayFromDbm, convertArrayUnit, convertFromDbm, formatAmplitude } from '../plot/units'
import { formatFrequencyHz } from '../plot/axes'
import { useLiveMeasurement } from '../composables/useLiveMeasurement'
import { useSweepConfig } from '../composables/useSweepConfig'
import { useYAxisRange } from '../composables/useYAxisRange'
import { useDisplayUnits } from '../composables/useDisplayUnits'
import { useReferenceLines } from '../composables/useReferenceLines'
import { useMarkers, type MarkerId } from '../composables/useMarkers'
import { useMeasurementStore } from '../composables/useMeasurementStore'
import { useAveraging } from '../composables/useAveraging'
import { useNoiseFloor } from '../composables/useNoiseFloor'
import { nearestBinIndex } from '../utils/nearestBin'
import type { YAxisUnit } from '../plot/units'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const containerEl = ref<HTMLDivElement | null>(null)
const renderer = shallowRef<PlotRenderer | null>(null)
const showLiveTrace = ref(true)
const cursorReadout = ref<string | null>(null)

const {
  displayedFrame,
  displayedPeakAmplitudesDbm,
  peakFrequenciesHz,
  enabled: peakHoldEnabled,
  setEnabled: setPeakHoldEnabled,
} = useLiveMeasurement()
const { sweepConfig } = useSweepConfig()
const { computeRange, resetAutoRange } = useYAxisRange()
const { xAxisScale, yAxisUnit } = useDisplayUnits()
const { activeReferenceSeries } = useReferenceLines()
const { activeMarker, markerPoints, placeActiveMarkerAt, setMarkerFreq, setActiveMarker } = useMarkers()
let draggingMarkerId: MarkerId | null = null
const { overlaySeries } = useMeasurementStore()
const { enabled: averagingEnabled } = useAveraging()
const noiseFloor = useNoiseFloor()

let resizeObserver: ResizeObserver | null = null

const REFERENCE_DASH = [2, 3]
const OVERLAY_DASH = [8, 3, 2, 3]

interface ExtraSeries {
  id: string
  label: string
  kind: 'reference' | 'overlay'
  unit: YAxisUnit
  frequenciesHz: Float64Array
  values: Float64Array
}

// Reference lines get color slots first, then overlays continue the same sequence.
const combinedExtraSeries = computed<ExtraSeries[]>(() => [
  ...activeReferenceSeries.value.map((s) => ({ ...s, kind: 'reference' as const })),
  ...overlaySeries.value.map((s) => ({
    id: s.id,
    label: s.label,
    kind: 'overlay' as const,
    unit: 'dBm' as YAxisUnit,
    frequenciesHz: s.frequenciesHz,
    values: s.amplitudesDbm,
  })),
])

interface LegendEntry {
  label: string
  color: string
  dash: number[]
  width: number
  dimmed?: boolean
  title?: string
  visible?: boolean
  onToggle?: (visible: boolean) => void
}

// Noise-floor-subtracted values are a dB delta, not an absolute power, so the
// dBm<->dBuV absolute-unit offset must not be applied to them (see
// useNoiseFloor). The Y-axis scale/format follows the *live* trace's
// subtraction state specifically — it's the one currentYRange is derived
// from below.
const liveIsRelative = computed(() => {
  const frame = displayedFrame.value
  return !!frame && noiseFloor.isSubtractionActive(frame.frequenciesHz)
})

const peakIsRelative = computed(() => {
  const freqs = peakFrequenciesHz.value
  return !!freqs && noiseFloor.isSubtractionActive(freqs)
})

// The Y-axis follows live's domain (see currentYRange). If live is
// subtracting but peak hold isn't (e.g. an ambient "Capture now" baseline,
// which only ever targets live) — or vice versa — peak hold's values are on
// the wrong scale for whatever unit conversion the axis is applying: hide it
// entirely rather than let it sit outside the fitted range or get double/no
// offset applied.
const peakScaleMismatch = computed(() => liveIsRelative.value !== peakIsRelative.value)

const legendEntries = computed(() => {
  const entries: LegendEntry[] = []
  entries.push({
    label: averagingEnabled.value ? 'Live (averaged)' : 'Live',
    color: categoricalColor(LIVE_TRACE_SLOT),
    dash: [],
    width: 2,
    visible: showLiveTrace.value,
    onToggle: (visible) => (showLiveTrace.value = visible),
  })
  if (displayedPeakAmplitudesDbm.value) {
    entries.push({
      label: 'Peak hold',
      color: categoricalColor(PEAK_HOLD_SLOT),
      dash: [6, 4],
      width: 2,
      dimmed: peakScaleMismatch.value,
      title: peakScaleMismatch.value ? "Hidden — doesn't share live's noise-floor-subtraction state (wrong scale)" : undefined,
      visible: peakHoldEnabled.value,
      onToggle: (visible) => setPeakHoldEnabled(visible),
    })
  }
  combinedExtraSeries.value.forEach((series, i) => {
    const slot = OVERLAY_SLOT_START + i
    entries.push({
      label: series.label,
      color: categoricalColor(slot),
      dash: series.kind === 'reference' ? REFERENCE_DASH : OVERLAY_DASH,
      width: series.kind === 'reference' ? 1.5 : 2,
      dimmed: true,
    })
  })
  return entries
})

// A relative dB delta and an absolute dBm reading are numerically worlds
// apart (delta near 0 vs. e.g. -80). The auto-range's hysteresis (below)
// only rescales on breach, which usually — but not reliably — catches a
// domain jump; force a clean refit whenever either curve's relative-ness
// actually flips, rather than risk a stale/oversized range from the other
// domain lingering.
watch([liveIsRelative, peakIsRelative], () => resetAutoRange())

const currentYRange = computed(() => {
  const peakAmps = peakHoldEnabled.value && !peakScaleMismatch.value ? displayedPeakAmplitudesDbm.value : null
  const dbmRange = computeRange(displayedFrame.value?.amplitudesDbm ?? null, peakAmps)
  const unit = yAxisUnit.value
  if (liveIsRelative.value) return dbmRange
  return { min: convertFromDbm(dbmRange.min, unit), max: convertFromDbm(dbmRange.max, unit) }
})

function buildDrawInput(): PlotDrawInput | null {
  const frame = displayedFrame.value
  const cfg = sweepConfig.value
  const unit = yAxisUnit.value
  const isRelative = liveIsRelative.value
  const freqRangeHz = { min: cfg.startHz, max: cfg.stopHz }
  const yRange = currentYRange.value

  const series: PlotSeries[] = []
  if (frame && showLiveTrace.value) {
    series.push({
      frequenciesHz: frame.frequenciesHz,
      amplitudes: isRelative ? frame.amplitudesDbm : convertArrayFromDbm(frame.amplitudesDbm, unit),
      style: { color: categoricalColor(LIVE_TRACE_SLOT), dash: [], width: 2 },
    })
  }
  const peakAmps = displayedPeakAmplitudesDbm.value
  if (peakHoldEnabled.value && peakFrequenciesHz.value && peakAmps && !peakScaleMismatch.value) {
    series.push({
      frequenciesHz: peakFrequenciesHz.value,
      amplitudes: peakIsRelative.value ? peakAmps : convertArrayFromDbm(peakAmps, unit),
      style: { color: categoricalColor(PEAK_HOLD_SLOT), dash: [6, 4], width: 2 },
    })
  }
  combinedExtraSeries.value.forEach((extra, i) => {
    const slot = OVERLAY_SLOT_START + i
    series.push({
      frequenciesHz: extra.frequenciesHz,
      amplitudes: convertArrayUnit(extra.values, extra.unit, unit),
      style: {
        color: categoricalColor(slot),
        dash: extra.kind === 'reference' ? REFERENCE_DASH : OVERLAY_DASH,
        width: extra.kind === 'reference' ? 1.5 : 2,
        dimmed: true,
      },
    })
  })

  const markers: PlotMarkerPoint[] = markerPoints.value.map((m) => ({
    freqHz: m.freqHz,
    amplitude: nearestAmplitude(frame, m.freqHz, unit, isRelative),
    label: m.label,
  }))

  return { freqRangeHz, yRange, xAxisScale: xAxisScale.value, yAxisUnit: unit, amplitudeIsRelative: isRelative, series, markers }
}

function nearestAmplitude(
  frame: { frequenciesHz: Float64Array; amplitudesDbm: Float64Array } | null,
  freqHz: number,
  unit: ReturnType<typeof useDisplayUnits>['yAxisUnit']['value'],
  isRelative: boolean,
): number | null {
  if (!frame || frame.frequenciesHz.length === 0) return null
  const raw = frame.amplitudesDbm[nearestBinIndex(frame.frequenciesHz, freqHz)]
  return isRelative ? raw : convertFromDbm(raw, unit)
}

function redraw(): void {
  const r = renderer.value
  const input = buildDrawInput()
  if (!r || !input) return
  r.draw(input)
}

const MARKER_HIT_TOLERANCE_PX = 10

function freqRangeInput() {
  return { freqRangeHz: { min: sweepConfig.value.startHz, max: sweepConfig.value.stopHz }, xAxisScale: xAxisScale.value }
}

function xCssFromEvent(ev: MouseEvent, canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect()
  return Math.min(Math.max(ev.clientX - rect.left, 0), rect.width)
}

function hitTestMarker(r: PlotRenderer, xCss: number): MarkerId | null {
  const input = freqRangeInput()
  let best: MarkerId | null = null
  let bestDist = MARKER_HIT_TOLERANCE_PX
  for (const m of markerPoints.value) {
    const dist = Math.abs(r.freqHzToXPixel(m.freqHz, input) - xCss)
    if (dist < bestDist) {
      bestDist = dist
      best = m.id === 'm1' ? 1 : 2
    }
  }
  return best
}

function handleMouseDown(ev: MouseEvent): void {
  const r = renderer.value
  const canvas = canvasEl.value
  if (!r || !canvas) return
  const xCss = xCssFromEvent(ev, canvas)
  const hit = hitTestMarker(r, xCss)
  if (hit) {
    setActiveMarker(hit)
    draggingMarkerId = hit
  } else {
    placeActiveMarkerAt(r.xPixelToFreqHz(xCss, freqRangeInput()))
    draggingMarkerId = activeMarker.value
  }
  window.addEventListener('mousemove', handleWindowMouseMove)
  window.addEventListener('mouseup', handleWindowMouseUp)
}

function handleWindowMouseMove(ev: MouseEvent): void {
  const r = renderer.value
  const canvas = canvasEl.value
  if (!r || !canvas || draggingMarkerId === null) return
  setMarkerFreq(draggingMarkerId, r.xPixelToFreqHz(xCssFromEvent(ev, canvas), freqRangeInput()))
}

function handleWindowMouseUp(): void {
  draggingMarkerId = null
  window.removeEventListener('mousemove', handleWindowMouseMove)
  window.removeEventListener('mouseup', handleWindowMouseUp)
}

function handleMouseMove(ev: MouseEvent): void {
  const r = renderer.value
  const canvas = canvasEl.value
  if (!r || !canvas) return
  const rect = canvas.getBoundingClientRect()
  const xCss = ev.clientX - rect.left
  const yCss = ev.clientY - rect.top
  if (!r.isInsidePlotArea(xCss, yCss)) {
    cursorReadout.value = null
    return
  }
  const freqHz = r.xPixelToFreqHz(xCss, freqRangeInput())
  const value = r.yPixelToValue(yCss, { yRange: currentYRange.value })
  cursorReadout.value = `${formatFrequencyHz(freqHz)}, ${formatAmplitude(value, yAxisUnit.value, liveIsRelative.value)}`
}

function handleMouseLeave(): void {
  cursorReadout.value = null
}

onMounted(() => {
  if (!canvasEl.value || !containerEl.value) return
  renderer.value = new PlotRenderer(canvasEl.value)

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect
      renderer.value?.resize(width, height)
      redraw()
    }
  })
  resizeObserver.observe(containerEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  handleWindowMouseUp()
})

watchEffect(() => {
  redraw()
})
</script>

<template>
  <div class="plot-canvas">
    <div ref="containerEl" class="canvas-container">
      <canvas ref="canvasEl" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave"></canvas>
      <div v-if="cursorReadout" class="cursor-readout">{{ cursorReadout }}</div>
    </div>
    <ul
      v-if="legendEntries.length"
      class="legend"
      :style="{ paddingLeft: `${MARGIN.left}px`, paddingRight: `${MARGIN.right}px` }"
    >
      <li
        v-for="entry in legendEntries"
        :key="entry.label"
        :class="{ dimmed: entry.dimmed || entry.visible === false }"
        :title="entry.title"
      >
        <label v-if="entry.onToggle" class="legend-toggle">
          <input type="checkbox" :checked="entry.visible" @change="entry.onToggle(($event.target as HTMLInputElement).checked)" />
          <svg width="20" height="10" aria-hidden="true">
            <line
              x1="0"
              y1="5"
              x2="20"
              y2="5"
              :stroke="entry.color"
              :stroke-width="entry.width"
              :stroke-dasharray="entry.dash.join(',')"
            />
          </svg>
          <span>{{ entry.label }}</span>
        </label>
        <template v-else>
          <svg width="20" height="10" aria-hidden="true">
            <line
              x1="0"
              y1="5"
              x2="20"
              y2="5"
              :stroke="entry.color"
              :stroke-width="entry.width"
              :stroke-dasharray="entry.dash.join(',')"
            />
          </svg>
          <span>{{ entry.label }}</span>
        </template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.plot-canvas {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.canvas-container {
  flex: 1;
  min-height: 320px;
  position: relative;
}
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}
.cursor-readout {
  position: absolute;
  right: 16px;
  bottom: 30px;
  transform: translate(-4px, -4px);
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: var(--primary-ink);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid var(--border);
  border-radius: 3px;
  pointer-events: none;
}
.legend {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  margin: 0;
  padding: 0;
  font-size: 0.8rem;
  color: var(--secondary-ink);
}
.legend li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.legend-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}
.legend li.dimmed {
  opacity: 0.7;
}
</style>
