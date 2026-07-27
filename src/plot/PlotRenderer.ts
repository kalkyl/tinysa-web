import { CHROME } from './colors'
import { computeLogTicks, computeTicks, formatFrequencyHz, resolveLogRange, type XAxisScale } from './axes'
import { formatAmplitude, type YAxisUnit } from './units'

export interface PlotSeriesStyle {
  color: string
  /** [] = solid line, per canvas setLineDash */
  dash: number[]
  width: number
  /** Recedes the series (lower opacity) — used for reference/overlay curves so the live trace stays visually dominant. */
  dimmed?: boolean
}

export interface PlotSeries {
  frequenciesHz: Float64Array
  /** Already converted to the draw input's yAxisUnit. */
  amplitudes: Float64Array
  style: PlotSeriesStyle
}

export interface PlotMarkerPoint {
  freqHz: number
  /** Already converted to the draw input's yAxisUnit. */
  amplitude: number | null
  label: string
}

export interface PlotRange {
  min: number
  max: number
}

export interface PlotDrawInput {
  freqRangeHz: PlotRange
  /** Already converted to yAxisUnit. */
  yRange: PlotRange
  xAxisScale: XAxisScale
  yAxisUnit: YAxisUnit
  series: PlotSeries[]
  markers: PlotMarkerPoint[]
}

/** Plot-area inset for axis labels — exported so DOM elements (legend, controls) can align to it. */
export const MARGIN = { top: 12, right: 16, bottom: 30, left: 54 }
const MARKER_RADIUS = 5 // >= 4 per mark spec (>= 8px diameter)
const MARKER_RING_WIDTH = 2
const DIMMED_ALPHA = 0.55

export class PlotRenderer {
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

  /** Converts a CSS-pixel x coordinate (e.g. from a click event) back to a frequency, given the current axis mode. */
  xPixelToFreqHz(xCss: number, input: Pick<PlotDrawInput, 'freqRangeHz' | 'xAxisScale'>): number {
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

  /** Inverse of xPixelToFreqHz — for hit-testing a marker's on-screen position. */
  freqHzToXPixel(freqHz: number, input: Pick<PlotDrawInput, 'freqRangeHz' | 'xAxisScale'>): number {
    const widthCss = this.canvas.width / this.dpr
    const plotLeft = MARGIN.left
    const plotWidth = widthCss - MARGIN.right - plotLeft
    return this.makeXScale(input, plotLeft, plotWidth)(freqHz)
  }

  /** Converts a CSS-pixel y coordinate back to a yRange value — for a cursor readout. */
  yPixelToValue(yCss: number, input: Pick<PlotDrawInput, 'yRange'>): number {
    const heightCss = this.canvas.height / this.dpr
    const plotTop = MARGIN.top
    const plotBottom = heightCss - MARGIN.bottom
    const plotHeight = plotBottom - plotTop || 1
    const { min, max } = input.yRange
    return min + ((plotBottom - yCss) / plotHeight) * (max - min)
  }

  /** Whether a CSS-pixel point falls inside the plotted (gridded) area, vs. the margin/label region. */
  isInsidePlotArea(xCss: number, yCss: number): boolean {
    const widthCss = this.canvas.width / this.dpr
    const heightCss = this.canvas.height / this.dpr
    return (
      xCss >= MARGIN.left && xCss <= widthCss - MARGIN.right && yCss >= MARGIN.top && yCss <= heightCss - MARGIN.bottom
    )
  }

  draw(input: PlotDrawInput): void {
    const { ctx, canvas, dpr } = this
    const chrome = CHROME
    const widthCss = canvas.width / dpr
    const heightCss = canvas.height / dpr

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, widthCss, heightCss)
    ctx.fillStyle = chrome.surface
    ctx.fillRect(0, 0, widthCss, heightCss)

    const plotLeft = MARGIN.left
    const plotTop = MARGIN.top
    const plotRight = widthCss - MARGIN.right
    const plotBottom = heightCss - MARGIN.bottom
    const plotWidth = Math.max(1, plotRight - plotLeft)
    const plotHeight = Math.max(1, plotBottom - plotTop)

    const xScale = this.makeXScale(input, plotLeft, plotWidth)
    const yScale = (value: number): number =>
      plotBottom - ((value - input.yRange.min) / (input.yRange.max - input.yRange.min || 1)) * plotHeight

    this.drawGrid(ctx, chrome, input, plotLeft, plotTop, plotRight, plotBottom, xScale, yScale)

    ctx.save()
    ctx.beginPath()
    ctx.rect(plotLeft, plotTop, plotWidth, plotHeight)
    ctx.clip()
    for (const series of input.series) {
      this.drawSeries(ctx, series, xScale, yScale)
    }
    ctx.restore()

    for (const marker of input.markers) {
      this.drawMarker(ctx, marker, chrome, xScale, yScale, plotTop, plotBottom, input.yAxisUnit)
    }

    ctx.restore()
  }

  private makeXScale(
    input: Pick<PlotDrawInput, 'freqRangeHz' | 'xAxisScale'>,
    plotLeft: number,
    plotWidth: number,
  ): (hz: number) => number {
    const { min, max } = input.freqRangeHz
    if (input.xAxisScale === 'log') {
      const { min: safeMin, max: safeMax } = resolveLogRange(min, max)
      const logRange = Math.log10(safeMax / safeMin) || 1
      return (hz: number) => plotLeft + (Math.log10(Math.max(hz, safeMin) / safeMin) / logRange) * plotWidth
    }
    const range = max - min || 1
    return (hz: number) => plotLeft + ((hz - min) / range) * plotWidth
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    chrome: typeof CHROME,
    input: PlotDrawInput,
    plotLeft: number,
    plotTop: number,
    plotRight: number,
    plotBottom: number,
    xScale: (hz: number) => number,
    yScale: (value: number) => number,
  ): void {
    const xTicks =
      input.xAxisScale === 'log'
        ? computeLogTicks(input.freqRangeHz.min, input.freqRangeHz.max)
        : computeTicks(input.freqRangeHz.min, input.freqRangeHz.max, 6)
    const yTicks = computeTicks(input.yRange.min, input.yRange.max, 6)

    ctx.strokeStyle = chrome.gridline
    ctx.lineWidth = 1
    ctx.setLineDash([])
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillStyle = chrome.mutedInk

    for (const hz of xTicks) {
      const x = xScale(hz)
      ctx.beginPath()
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, plotBottom)
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(formatFrequencyHz(hz), x, plotBottom + 6)
    }

    for (const value of yTicks) {
      const y = yScale(value)
      ctx.beginPath()
      ctx.moveTo(plotLeft, y)
      ctx.lineTo(plotRight, y)
      ctx.stroke()
      // Right-aligned text can push a wide label's leading '-' past x=0 and
      // off the canvas; measure and clamp so the full label always stays on-screen.
      const label = formatAmplitude(value, input.yAxisUnit)
      const textWidth = ctx.measureText(label).width
      const x = Math.max(2, plotLeft - 8 - textWidth)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x, y)
    }

    ctx.strokeStyle = chrome.baseline
    ctx.strokeRect(plotLeft, plotTop, plotRight - plotLeft, plotBottom - plotTop)
  }

  private drawSeries(
    ctx: CanvasRenderingContext2D,
    series: PlotSeries,
    xScale: (hz: number) => number,
    yScale: (value: number) => number,
  ): void {
    const { frequenciesHz, amplitudes, style } = series
    if (frequenciesHz.length === 0) return
    ctx.save()
    if (style.dimmed) ctx.globalAlpha = DIMMED_ALPHA
    ctx.beginPath()
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.width
    ctx.setLineDash(style.dash)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    for (let i = 0; i < frequenciesHz.length; i++) {
      const x = xScale(frequenciesHz[i])
      const y = yScale(amplitudes[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  private drawMarker(
    ctx: CanvasRenderingContext2D,
    marker: PlotMarkerPoint,
    chrome: typeof CHROME,
    xScale: (hz: number) => number,
    yScale: (value: number) => number,
    plotTop: number,
    plotBottom: number,
    yAxisUnit: YAxisUnit,
  ): void {
    const x = xScale(marker.freqHz)

    ctx.strokeStyle = chrome.mutedInk
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x, plotTop)
    ctx.lineTo(x, plotBottom)
    ctx.stroke()
    ctx.setLineDash([])

    if (marker.amplitude !== null) {
      const y = yScale(marker.amplitude)
      ctx.fillStyle = chrome.surface
      ctx.beginPath()
      ctx.arc(x, y, MARKER_RADIUS + MARKER_RING_WIDTH, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = chrome.primaryInk
      ctx.beginPath()
      ctx.arc(x, y, MARKER_RADIUS, 0, Math.PI * 2)
      ctx.fill()
    }

    const label = `${marker.label}: ${formatFrequencyHz(marker.freqHz)}${marker.amplitude !== null ? `, ${formatAmplitude(marker.amplitude, yAxisUnit)}` : ''}`
    ctx.font = '11px system-ui, sans-serif'
    const textWidth = ctx.measureText(label).width
    const labelX = Math.min(Math.max(x + 6, 4), ctx.canvas.width / this.dpr - textWidth - 10)
    ctx.fillStyle = chrome.surface
    ctx.fillRect(labelX - 3, plotTop + 2, textWidth + 6, 14)
    ctx.fillStyle = chrome.primaryInk
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(label, labelX, plotTop + 3)
  }
}
