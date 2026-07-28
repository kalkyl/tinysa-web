<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue'
import {
  MARGIN,
  PlotRenderer,
  type PlotDrawInput,
  type PlotHorizontalLine,
  type PlotHoverCrosshair,
  type PlotMarkerPoint,
  type PlotSeries,
} from '../plot/PlotRenderer'
import { categoricalColor, CHROME, LIVE_TRACE_SLOT, OVERLAY_SLOT_START, PEAK_HOLD_SLOT } from '../plot/colors'
import { convertArrayFromDbm, convertArrayUnit, convertFromDbm, convertToDbm, formatAmplitude } from '../plot/units'
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
import { useHorizontalMarkers } from '../composables/useHorizontalMarkers'
import { nearestBinIndex } from '../utils/nearestBin'
import type { YAxisUnit } from '../plot/units'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const containerEl = ref<HTMLDivElement | null>(null)
const rootEl = ref<HTMLDivElement | null>(null)
const renderer = shallowRef<PlotRenderer | null>(null)
const showLiveTrace = ref(true)
const canvasCursor = ref<'crosshair' | 'ns-resize' | 'ew-resize'>('crosshair')
const canvasTitle = ref('')
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
const { activeMarker, markerPoints, placeActiveMarkerAt, setMarkerFreq, setActiveMarker, setEnabled } = useMarkers()
let draggingMarkerId: MarkerId | null = null
// Plain (non-reactive) — updated directly by the mouse handlers, which call redraw()
// themselves, rather than adding a ref that reruns the whole watchEffect on every pixel of movement.
let hoverCrosshair: PlotHoverCrosshair | null = null
const { overlaySeries } = useMeasurementStore()
const { enabled: averagingEnabled } = useAveraging()
const noiseFloor = useNoiseFloor()
const horizontalMarkers = useHorizontalMarkers()

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

// Stored as absolute dBm — meaningless as a delta, so hidden while subtracting (same
// "wrong scale" reasoning as reference lines/overlays/the unit selector).
const horizontalLinesForDraw = computed<PlotHorizontalLine[]>(() => {
  if (liveIsRelative.value) return []
  const unit = yAxisUnit.value
  return horizontalMarkers.markers.value.map((m) => {
    const value = convertFromDbm(m.valueDbm, unit)
    return { value, label: formatAmplitude(value, unit, false) }
  })
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

  // The level dot only makes sense pinned to a visible curve — when Live is hidden there's
  // nothing on-screen for it to mark, so the label falls back to frequency-only.
  const markers: PlotMarkerPoint[] = markerPoints.value.map((m) => ({
    freqHz: m.freqHz,
    amplitude: showLiveTrace.value ? nearestAmplitude(frame, m.freqHz, unit, isRelative) : null,
    label: m.label,
  }))

  return {
    freqRangeHz,
    yRange,
    xAxisScale: xAxisScale.value,
    yAxisUnit: unit,
    amplitudeIsRelative: isRelative,
    series,
    markers,
    horizontalLines: horizontalLinesForDraw.value,
    hoverCrosshair,
  }
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

function yCssFromEvent(ev: MouseEvent, canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect()
  return Math.min(Math.max(ev.clientY - rect.top, 0), rect.height)
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

const HORIZONTAL_MARKER_HIT_TOLERANCE_PX = 6

function hitTestHorizontalMarker(r: PlotRenderer, yCss: number): string | null {
  const unit = yAxisUnit.value
  for (const m of horizontalMarkers.markers.value) {
    const y = r.valueToYPixel(convertFromDbm(m.valueDbm, unit), { yRange: currentYRange.value })
    if (Math.abs(y - yCss) <= HORIZONTAL_MARKER_HIT_TOLERANCE_PX) return m.id
  }
  return null
}

// Left-click always adds (empty margin) or drags (existing line) — delete is a separate
// right-click gesture (handleContextMenu), so there's no click-vs-drag ambiguity to
// resolve here. A mousedown on empty margin space adds a new line immediately and starts
// dragging it too, so it can be fine-tuned in the same gesture (mirrors
// placeActiveMarkerAt's behavior for M1/M2).
let horizontalDragId: string | null = null

function handleYAxisMouseDown(yCss: number): void {
  if (liveIsRelative.value) return
  const r = renderer.value
  if (!r) return
  const hitId = hitTestHorizontalMarker(r, yCss)
  if (hitId) {
    horizontalDragId = hitId
  } else {
    const displayValue = r.yPixelToValue(yCss, { yRange: currentYRange.value })
    horizontalDragId = horizontalMarkers.add(convertToDbm(displayValue, yAxisUnit.value))
  }
  window.addEventListener('mousemove', handleWindowMouseMoveHorizontal)
  window.addEventListener('mouseup', handleWindowMouseUpHorizontal)
}

function handleWindowMouseMoveHorizontal(ev: MouseEvent): void {
  const r = renderer.value
  const canvas = canvasEl.value
  if (!r || !canvas || !horizontalDragId) return
  const yCss = yCssFromEvent(ev, canvas)
  const displayValue = r.yPixelToValue(yCss, { yRange: currentYRange.value })
  horizontalMarkers.setValue(horizontalDragId, convertToDbm(displayValue, yAxisUnit.value))
}

function handleWindowMouseUpHorizontal(): void {
  horizontalDragId = null
  window.removeEventListener('mousemove', handleWindowMouseMoveHorizontal)
  window.removeEventListener('mouseup', handleWindowMouseUpHorizontal)
}

// Right-click on an existing horizontal line deletes it; right-click on a frequency
// marker (its line, same hit-test as dragging) hides it (disables it, but keeps its
// frequency so re-enabling restores position) — both only suppress the browser's context
// menu when they actually hit something, so right-clicking elsewhere still behaves normally.
function handleContextMenu(ev: MouseEvent): void {
  const r = renderer.value
  const canvas = canvasEl.value
  if (!r || !canvas) return
  const xCss = xCssFromEvent(ev, canvas)
  const yCss = yCssFromEvent(ev, canvas)

  if (!liveIsRelative.value && r.isInYAxisArea(xCss, yCss)) {
    const hitId = hitTestHorizontalMarker(r, yCss)
    if (hitId) {
      ev.preventDefault()
      horizontalMarkers.remove(hitId)
    }
    return
  }

  const hit = hitTestMarker(r, xCss)
  if (hit) {
    ev.preventDefault()
    setEnabled(hit, false)
  }
}

function handleMouseDown(ev: MouseEvent): void {
  const r = renderer.value
  const canvas = canvasEl.value
  if (!r || !canvas) return
  const xCss = xCssFromEvent(ev, canvas)
  const yCss = yCssFromEvent(ev, canvas)

  if (r.isInYAxisArea(xCss, yCss)) {
    handleYAxisMouseDown(yCss)
    return
  }

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

  const inPlotArea = r.isInsidePlotArea(xCss, yCss)
  const inYAxisArea = r.isInYAxisArea(xCss, yCss)
  const inXAxisArea = r.isInXAxisArea(xCss, yCss)

  // Horizontal-line placement/dragging is meaningless while subtracting (see
  // horizontalLinesForDraw) — gate the marker-specific interactions on that, but not the
  // crosshair/readout below, which are just a coordinate readout and stay useful regardless.
  const yAxisMarkersActive = inYAxisArea && !liveIsRelative.value
  const hitHorizontal = yAxisMarkersActive ? hitTestHorizontalMarker(r, yCss) : null
  const hitFreqMarker = !inYAxisArea ? hitTestMarker(r, xCss) : null

  canvasCursor.value =
    horizontalDragId || hitHorizontal ? 'ns-resize' : draggingMarkerId !== null || hitFreqMarker ? 'ew-resize' : 'crosshair'
  canvasTitle.value = hitHorizontal
    ? 'Drag to move, right-click to delete'
    : yAxisMarkersActive
      ? 'Click to add a helper line'
      : hitFreqMarker
        ? 'Drag to move, right-click to hide'
        : ''

  hoverCrosshair = inPlotArea
    ? { xCss, yCss, showVertical: true, showHorizontal: true }
    : inYAxisArea
      ? { xCss, yCss, showVertical: false, showHorizontal: true }
      : inXAxisArea
        ? { xCss, yCss, showVertical: true, showHorizontal: false }
        : null
  redraw()

  if (inPlotArea) {
    const freqHz = r.xPixelToFreqHz(xCss, freqRangeInput())
    const value = r.yPixelToValue(yCss, { yRange: currentYRange.value })
    cursorReadout.value = `${formatFrequencyHz(freqHz)}, ${formatAmplitude(value, yAxisUnit.value, liveIsRelative.value)}`
  } else if (inYAxisArea) {
    cursorReadout.value = formatAmplitude(r.yPixelToValue(yCss, { yRange: currentYRange.value }), yAxisUnit.value, liveIsRelative.value)
  } else if (inXAxisArea) {
    cursorReadout.value = formatFrequencyHz(r.xPixelToFreqHz(xCss, freqRangeInput()))
  } else {
    cursorReadout.value = null
  }
}

function handleMouseLeave(): void {
  cursorReadout.value = null
  canvasTitle.value = ''
  hoverCrosshair = null
  redraw()
  if (!horizontalDragId && draggingMarkerId === null) canvasCursor.value = 'crosshair'
}

// Waterfall lives in a separate <canvas> (a sibling component slotted into
// .below-canvas) — composite it in below the main plot when present/enabled,
// rather than exporting only the FFT chart.
function exportPng(): void {
  const canvas = canvasEl.value
  if (!canvas) return
  const waterfallCanvas = rootEl.value?.querySelector<HTMLCanvasElement>('.waterfall-container canvas') ?? null
  const composite = waterfallCanvas ? compositeWithWaterfall(canvas, waterfallCanvas) : canvas

  composite.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tinysa-plot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

function compositeWithWaterfall(main: HTMLCanvasElement, waterfall: HTMLCanvasElement): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1
  const gapPx = Math.round(12 * dpr)
  const out = document.createElement('canvas')
  out.width = Math.max(main.width, waterfall.width)
  out.height = main.height + gapPx + waterfall.height
  const ctx = out.getContext('2d')
  if (!ctx) return main
  ctx.fillStyle = CHROME.surface
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(main, 0, 0)
  ctx.drawImage(waterfall, 0, main.height + gapPx)
  return out
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
  <div ref="rootEl" class="plot-canvas">
    <div ref="containerEl" class="canvas-container">
      <canvas
        ref="canvasEl"
        :style="{ cursor: canvasCursor }"
        :title="canvasTitle"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
        @contextmenu="handleContextMenu"
      ></canvas>
      <div v-if="cursorReadout" class="cursor-readout">{{ cursorReadout }}</div>
    </div>
    <slot name="below-canvas" />
    <div class="legend-row" :style="{ paddingLeft: `${MARGIN.left}px`, paddingRight: `${MARGIN.right}px` }">
      <ul v-if="legendEntries.length" class="legend">
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
      <button type="button" class="export-png" title="Export the plot as a PNG image" @click="exportPng">Export PNG</button>
    </div>
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
.legend-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
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
.export-png {
  flex-shrink: 0;
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
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
