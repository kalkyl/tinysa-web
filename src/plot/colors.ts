/** Validated categorical palette (dataviz skill reference instance), stepped for the dark surface — dark mode only. */
export const CATEGORICAL: string[] = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']

export const CHROME = {
  surface: '#1a1a19',
  primaryInk: '#ffffff',
  secondaryInk: '#c3c2b7',
  mutedInk: '#898781',
  gridline: '#2c2c2a',
  baseline: '#383835',
}

// Matches the --mono custom property in style.css — Canvas can't read CSS variables, so kept in sync manually.
export const CHART_FONT_FAMILY = '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, Consolas, monospace'

// Live uses the palette's yellow/amber slot (a nod to the tinySA's own on-device trace color).
export const LIVE_TRACE_SLOT = 3
export const PEAK_HOLD_SLOT = 1

/** Overlay/reference-line series pull from remaining slots in creation order, then fold into "Other". */
export const OVERLAY_SLOT_START = 2
export const MAX_DISTINCT_OVERLAY_SLOTS = CATEGORICAL.length - OVERLAY_SLOT_START

export function categoricalColor(slot: number): string {
  if (slot < CATEGORICAL.length) return CATEGORICAL[slot]
  return '#8f8d84' // shared muted "Other" — never a generated hue
}

// Sequential magnitude ramp (dataviz skill reference instance: single hue, blue), stepped
// 100→700. Reversed from the skill's light-surface ordering (100=lightest) so the
// low-amplitude end recedes toward this app's dark surface and peaks pop bright — the
// same steps, just walked in the direction that reads correctly on `CHROME.surface`.
const WATERFALL_RAMP: string[] = [
  '#0d366b', // 700 — lowest amplitude, blends toward the dark surface
  '#104281', // 650
  '#184f95', // 600
  '#1c5cab', // 550
  '#256abf', // 500
  '#2a78d6', // 450
  '#3987e5', // 400
  '#5598e7', // 350
  '#6da7ec', // 300
  '#86b6ef', // 250
  '#9ec5f4', // 200
  '#b7d3f6', // 150
  '#cde2fb', // 100 — highest amplitude, pops against the dark surface
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Maps a normalized magnitude (0 = lowest, 1 = highest) to a waterfall color, interpolated between ramp steps. */
export function waterfallColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t))
  const scaled = clamped * (WATERFALL_RAMP.length - 1)
  const i0 = Math.floor(scaled)
  const i1 = Math.min(WATERFALL_RAMP.length - 1, i0 + 1)
  const frac = scaled - i0
  const [r0, g0, b0] = hexToRgb(WATERFALL_RAMP[i0])
  const [r1, g1, b1] = hexToRgb(WATERFALL_RAMP[i1])
  const r = Math.round(r0 + (r1 - r0) * frac)
  const g = Math.round(g0 + (g1 - g0) * frac)
  const b = Math.round(b0 + (b1 - b0) * frac)
  return `rgb(${r}, ${g}, ${b})`
}
