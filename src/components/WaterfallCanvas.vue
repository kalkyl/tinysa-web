<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watchEffect } from 'vue'
import { WaterfallRenderer, type WaterfallDrawInput } from '../plot/WaterfallRenderer'
import { useWaterfall } from '../composables/useWaterfall'
import { useSweepConfig } from '../composables/useSweepConfig'
import { useDisplayUnits } from '../composables/useDisplayUnits'
import { useSubtractModeActive } from '../composables/useSubtractMode'
import { convertFromDbm, formatAmplitude } from '../plot/units'
import { formatFrequencyHz } from '../plot/axes'
import { nearestBinIndex } from '../utils/nearestBin'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const containerEl = ref<HTMLDivElement | null>(null)
const renderer = shallowRef<WaterfallRenderer | null>(null)
const cursorReadout = ref<string | null>(null)
let resizeObserver: ResizeObserver | null = null
// The draw input's nowMs is a snapshot, not live time — cache it so the hover readout
// looks up the same row boundaries actually on screen, rather than drifting from a fresh Date.now().
let lastDrawInput: WaterfallDrawInput | null = null

const { windowSeconds, displayRows, colorRangeDbm } = useWaterfall()
const { sweepConfig } = useSweepConfig()
const { xAxisScale, yAxisUnit } = useDisplayUnits()
const subtractModeActive = useSubtractModeActive()

function buildDrawInput(): WaterfallDrawInput {
  const cfg = sweepConfig.value
  const rows = displayRows.value
  // Anchor to the newest row's own timestamp, not a fresh Date.now() — matches the
  // reference ingest() trims against, so the oldest row's elapsed time can't drift past windowMs.
  const nowMs = rows.length > 0 ? rows[rows.length - 1].timestampMs : Date.now()
  return {
    freqRangeHz: { min: cfg.startHz, max: cfg.stopHz },
    xAxisScale: xAxisScale.value,
    colorRangeDbm: colorRangeDbm.value,
    rows,
    nowMs,
    windowMs: windowSeconds.value * 1000,
  }
}

function redraw(): void {
  const input = buildDrawInput()
  lastDrawInput = input
  renderer.value?.draw(input)
}

function formatElapsed(elapsedMs: number): string {
  return elapsedMs < 1000 ? 'now' : `-${Math.round(elapsedMs / 1000)}s`
}

function handleMouseMove(ev: MouseEvent): void {
  const r = renderer.value
  const canvas = canvasEl.value
  if (!r || !canvas || !lastDrawInput) return
  const rect = canvas.getBoundingClientRect()
  const xCss = ev.clientX - rect.left
  const yCss = ev.clientY - rect.top
  if (!r.isInsidePlotArea(xCss, yCss)) {
    cursorReadout.value = null
    return
  }
  const freqHz = r.xPixelToFreqHz(xCss, lastDrawInput)
  const elapsedMs = r.yPixelToElapsedMs(yCss, lastDrawInput.windowMs)
  const row = r.rowAtElapsedMs(lastDrawInput.rows, lastDrawInput.nowMs, elapsedMs)

  let amplitudeLabel = ''
  if (row && row.frequenciesHz.length > 0) {
    const raw = row.amplitudesDbm[nearestBinIndex(row.frequenciesHz, freqHz)]
    const value = subtractModeActive.value ? raw : convertFromDbm(raw, yAxisUnit.value)
    amplitudeLabel = `, ${formatAmplitude(value, yAxisUnit.value, subtractModeActive.value)}`
  }
  cursorReadout.value = `${formatFrequencyHz(freqHz)}, ${formatElapsed(elapsedMs)}${amplitudeLabel}`
}

function handleMouseLeave(): void {
  cursorReadout.value = null
}

onMounted(() => {
  if (!canvasEl.value || !containerEl.value) return
  renderer.value = new WaterfallRenderer(canvasEl.value)

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
})

watchEffect(() => {
  redraw()
})
</script>

<template>
  <div ref="containerEl" class="waterfall-container">
    <canvas ref="canvasEl" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave"></canvas>
    <div v-if="cursorReadout" class="cursor-readout">{{ cursorReadout }}</div>
  </div>
</template>

<style scoped>
.waterfall-container {
  position: relative;
  height: 180px;
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
  bottom: 8px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  color: var(--primary-ink);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid var(--border);
  border-radius: 3px;
  pointer-events: none;
}
</style>
