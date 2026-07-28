import { MARGIN } from './PlotRenderer'
import { computeXScale, resolveLogRange, type XAxisScale } from './axes'
import { CHROME, waterfallColor } from './colors'

export interface WaterfallRow {
  frequenciesHz: Float64Array
  amplitudesDbm: Float64Array
  timestampMs: number
}

export interface WaterfallDrawInput {
  freqRangeHz: { min: number; max: number }
  xAxisScale: XAxisScale
  /** dB range the color ramp is normalized against — independent of the main plot's Y-axis. */
  colorRangeDbm: { min: number; max: number }
  /** Oldest first. */
  rows: WaterfallRow[]
  nowMs: number
  windowMs: number
}

/** Renders sweep history as colored bands, newest at the top — reuses PlotRenderer's MARGIN so columns line up with the spectrum plot above it. */
export class WaterfallRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private dpr: number

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d canvas context unavailable')
    this.ctx = ctx
    this.dpr = window.devicePixelRatio || 1
  }

  resize(widthCss: number, heightCss: number): void {
    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.max(1, Math.round(widthCss * this.dpr))
    this.canvas.height = Math.max(1, Math.round(heightCss * this.dpr))
  }

  /** Whether a CSS-pixel point falls inside the plotted area — for a hover readout. */
  isInsidePlotArea(xCss: number, yCss: number): boolean {
    const widthCss = this.canvas.width / this.dpr
    const heightCss = this.canvas.height / this.dpr
    return xCss >= MARGIN.left && xCss <= widthCss - MARGIN.right && yCss >= 0 && yCss <= heightCss
  }

  /** Converts a CSS-pixel x coordinate back to a frequency — mirrors PlotRenderer.xPixelToFreqHz so the two canvases agree pixel-for-pixel. */
  xPixelToFreqHz(xCss: number, input: Pick<WaterfallDrawInput, 'freqRangeHz' | 'xAxisScale'>): number {
    const widthCss = this.canvas.width / this.dpr
    const plotLeft = MARGIN.left
    const plotRight = widthCss - MARGIN.right
    const t = (xCss - plotLeft) / (plotRight - plotLeft)
    const { min, max } = input.freqRangeHz
    if (input.xAxisScale === 'log') {
      const { min: safeMin, max: safeMax } = resolveLogRange(min, max)
      return safeMin * Math.pow(safeMax / safeMin, t)
    }
    return min + t * (max - min)
  }

  /** Converts a CSS-pixel y coordinate to "how long ago" (ms), for a hover readout. */
  yPixelToElapsedMs(yCss: number, windowMs: number): number {
    const heightCss = this.canvas.height / this.dpr
    return Math.min(windowMs, Math.max(0, (yCss / heightCss) * windowMs))
  }

  /** Finds the row whose time-band covers a given "ms ago" value — for a hover readout. */
  rowAtElapsedMs(rows: WaterfallRow[], nowMs: number, elapsedMs: number): WaterfallRow | null {
    for (let i = 0; i < rows.length; i++) {
      const { elapsedNew, elapsedOld } = this.bandElapsedMs(rows, i, nowMs)
      if (elapsedMs >= elapsedNew && elapsedMs <= elapsedOld) return rows[i]
    }
    return null
  }

  private bandElapsedMs(rows: WaterfallRow[], i: number, nowMs: number): { elapsedNew: number; elapsedOld: number } {
    const row = rows[i]
    const newerBoundaryMs = i + 1 < rows.length ? rows[i + 1].timestampMs : nowMs
    return { elapsedNew: Math.max(0, nowMs - newerBoundaryMs), elapsedOld: Math.max(0, nowMs - row.timestampMs) }
  }

  draw(input: WaterfallDrawInput): void {
    const { ctx, canvas, dpr } = this
    const widthCss = canvas.width / dpr
    const heightCss = canvas.height / dpr

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, widthCss, heightCss)
    ctx.fillStyle = CHROME.surface
    ctx.fillRect(0, 0, widthCss, heightCss)

    const plotLeft = MARGIN.left
    const plotRight = widthCss - MARGIN.right
    const plotWidth = Math.max(1, plotRight - plotLeft)
    const plotTop = 0
    const plotBottom = heightCss

    if (input.rows.length > 0 && plotWidth > 0 && input.windowMs > 0) {
      const xScale = computeXScale(input.freqRangeHz, input.xAxisScale, plotLeft, plotWidth)
      const { min: dbMin, max: dbMax } = input.colorRangeDbm
      const dbRange = dbMax - dbMin || 1

      ctx.save()
      ctx.beginPath()
      ctx.rect(plotLeft, plotTop, plotWidth, plotBottom - plotTop)
      ctx.clip()

      const { rows, nowMs, windowMs } = input
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const { elapsedNew, elapsedOld } = this.bandElapsedMs(rows, i, nowMs)
        const yTop = plotTop + (elapsedNew / windowMs) * (plotBottom - plotTop)
        const yBottom = plotTop + (elapsedOld / windowMs) * (plotBottom - plotTop)
        const bandTop = Math.min(plotBottom, Math.max(plotTop, yTop))
        if (bandTop >= plotBottom) continue
        // Guarantee >=1px so a row right at the trailing edge doesn't flicker between a
        // sub-pixel height and none, given real sweep timing isn't perfectly uniform.
        const bandBottom = Math.max(bandTop + 1, Math.min(plotBottom, yBottom))

        const { frequenciesHz, amplitudesDbm } = row
        for (let j = 0; j < frequenciesHz.length; j++) {
          const x0 = xScale(frequenciesHz[j])
          const x1 = j + 1 < frequenciesHz.length ? xScale(frequenciesHz[j + 1]) : plotRight
          const width = Math.max(1, x1 - x0)
          const t = (amplitudesDbm[j] - dbMin) / dbRange
          ctx.fillStyle = waterfallColor(t)
          ctx.fillRect(x0, bandTop, width, bandBottom - bandTop)
        }
      }

      ctx.restore()
    }

    // Drawn in canvas coordinates, not a CSS border, so it's inset by the exact same MARGIN as the spectrum plot's border.
    ctx.strokeStyle = CHROME.baseline
    ctx.lineWidth = 1
    ctx.strokeRect(plotLeft, plotTop, plotWidth, plotBottom - plotTop)

    ctx.restore()
  }
}
