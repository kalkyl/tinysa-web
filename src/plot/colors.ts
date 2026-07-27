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
