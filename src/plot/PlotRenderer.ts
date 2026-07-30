import { CHART_FONT_FAMILY, CHROME } from './colors'
import { computeLogTicks, computeTicks, computeXScale, formatFrequencyHz, resolveLogRange, type XAxisScale } from './axes'
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

export interface PlotHorizontalLine {
  /** Already converted to the draw input's yAxisUnit. */
  value: number
  label: string
}

export interface PlotHoverCrosshair {
  xCss: number
  yCss: number
  showVertical: boolean
  showHorizontal: boolean
}

export interface PlotRange {
  min: number
  max: number
}

export interface PlotDrawInput {
  freqRangeHz: PlotRange
  /** Already converted to yAxisUnit (unless amplitudeIsRelative). */
  yRange: PlotRange
  xAxisScale: XAxisScale
  yAxisUnit: YAxisUnit
  /** Noise-floor-subtracted values are a dB delta, not an absolute power — see formatAmplitude. */
  amplitudeIsRelative?: boolean
  series: PlotSeries[]
  markers: PlotMarkerPoint[]
  /** User-placed horizontal threshold/helper lines, added by clicking the Y-axis label area. */
  horizontalLines?: PlotHorizontalLine[]
  /** Faint hover crosshair — full crosshair over the chart, single hair when hovering just an axis's label margin. */
  hoverCrosshair?: PlotHoverCrosshair | null
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

  /** Inverse of yPixelToValue — for hit-testing a horizontal line's on-screen position. */
  valueToYPixel(value: number, input: Pick<PlotDrawInput, 'yRange'>): number {
    const heightCss = this.canvas.height / this.dpr
    const plotTop = MARGIN.top
    const plotBottom = heightCss - MARGIN.bottom
    const plotHeight = plotBottom - plotTop || 1
    return this.makeYScale(input, plotBottom, plotHeight)(value)
  }

  /** Whether a CSS-pixel point falls inside the plotted (gridded) area, vs. the margin/label region. */
  isInsidePlotArea(xCss: number, yCss: number): boolean {
    const widthCss = this.canvas.width / this.dpr
    const heightCss = this.canvas.height / this.dpr
    return (
      xCss >= MARGIN.left && xCss <= widthCss - MARGIN.right && yCss >= MARGIN.top && yCss <= heightCss - MARGIN.bottom
    )
  }

  /** Whether a CSS-pixel point falls in the Y-axis label margin — where clicking places a horizontal helper line. */
  isInYAxisArea(xCss: number, yCss: number): boolean {
    const heightCss = this.canvas.height / this.dpr
    return xCss >= 0 && xCss < MARGIN.left && yCss >= MARGIN.top && yCss <= heightCss - MARGIN.bottom
  }

  /** Whether a CSS-pixel point falls in the X-axis (frequency) label margin below the plot. */
  isInXAxisArea(xCss: number, yCss: number): boolean {
    const widthCss = this.canvas.width / this.dpr
    const heightCss = this.canvas.height / this.dpr
    return xCss >= MARGIN.left && xCss <= widthCss - MARGIN.right && yCss > heightCss - MARGIN.bottom && yCss <= heightCss
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
    const yScale = this.makeYScale(input, plotBottom, plotHeight)

    this.drawGrid(ctx, chrome, input, plotLeft, plotTop, plotRight, plotBottom, xScale, yScale)

    if (input.horizontalLines?.length) {
      this.drawHorizontalLines(ctx, chrome, input.horizontalLines, plotLeft, plotRight, yScale)
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect(plotLeft, plotTop, plotWidth, plotHeight)
    ctx.clip()
    for (const series of input.series) {
      this.drawSeries(ctx, series, xScale, yScale)
    }
    ctx.restore()

    for (const marker of input.markers) {
      this.drawMarker(ctx, marker, chrome, xScale, yScale, plotTop, plotBottom, input.yAxisUnit, input.amplitudeIsRelative)
    }

    if (input.hoverCrosshair) {
      this.drawHoverCrosshair(ctx, chrome, input.hoverCrosshair, plotLeft, plotTop, plotRight, plotBottom)
    }

    ctx.restore()
  }

  private drawHoverCrosshair(
    ctx: CanvasRenderingContext2D,
    chrome: typeof CHROME,
    crosshair: PlotHoverCrosshair,
    plotLeft: number,
    plotTop: number,
    plotRight: number,
    plotBottom: number,
  ): void {
    ctx.save()
    ctx.strokeStyle = chrome.primaryInk
    ctx.globalAlpha = 0.07
    ctx.lineWidth = 1
    ctx.setLineDash([])
    if (crosshair.showVertical) {
      ctx.beginPath()
      ctx.moveTo(crosshair.xCss, plotTop)
      ctx.lineTo(crosshair.xCss, plotBottom)
      ctx.stroke()
    }
    if (crosshair.showHorizontal) {
      ctx.beginPath()
      ctx.moveTo(plotLeft, crosshair.yCss)
      ctx.lineTo(plotRight, crosshair.yCss)
      ctx.stroke()
    }
    ctx.restore()
  }

  private makeXScale(
    input: Pick<PlotDrawInput, 'freqRangeHz' | 'xAxisScale'>,
    plotLeft: number,
    plotWidth: number,
  ): (hz: number) => number {
    return computeXScale(input.freqRangeHz, input.xAxisScale, plotLeft, plotWidth)
  }

  private makeYScale(input: Pick<PlotDrawInput, 'yRange'>, plotBottom: number, plotHeight: number): (value: number) => number {
    return (value: number): number =>
      plotBottom - ((value - input.yRange.min) / (input.yRange.max - input.yRange.min || 1)) * plotHeight
  }

  private drawHorizontalLines(
    ctx: CanvasRenderingContext2D,
    chrome: typeof CHROME,
    lines: PlotHorizontalLine[],
    plotLeft: number,
    plotRight: number,
    yScale: (value: number) => number,
  ): void {
    ctx.save()
    ctx.strokeStyle = chrome.mutedInk
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.font = `11px ${CHART_FONT_FAMILY}`
    ctx.fillStyle = chrome.mutedInk
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    for (const line of lines) {
      const y = yScale(line.value)
      ctx.beginPath()
      ctx.moveTo(plotLeft, y)
      ctx.lineTo(plotRight, y)
      ctx.stroke()
      ctx.fillText(line.label, plotLeft + 4, y - 2)
    }
    ctx.restore()
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
    ctx.font = `11px ${CHART_FONT_FAMILY}`
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
      const label = formatAmplitude(value, input.yAxisUnit, input.amplitudeIsRelative)
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
    amplitudeIsRelative: boolean | undefined,
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

    const rect = this.markerLabelRect(marker, x, plotTop, yAxisUnit, amplitudeIsRelative)
    ctx.fillStyle = chrome.surface
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.fillStyle = chrome.primaryInk
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(this.markerLabelText(marker, yAxisUnit, amplitudeIsRelative), rect.x + 3, rect.y + 1)
  }

  private markerLabelText(marker: PlotMarkerPoint, yAxisUnit: YAxisUnit, amplitudeIsRelative: boolean | undefined): string {
    return `${marker.label}: ${formatFrequencyHz(marker.freqHz)}${marker.amplitude !== null ? `, ${formatAmplitude(marker.amplitude, yAxisUnit, amplitudeIsRelative)}` : ''}`
  }

  /** The label's on-screen box for a marker at x-pixel `x`. */
  private markerLabelRect(
    marker: PlotMarkerPoint,
    x: number,
    plotTop: number,
    yAxisUnit: YAxisUnit,
    amplitudeIsRelative: boolean | undefined,
  ): { x: number; y: number; width: number; height: number } {
    const widthCss = this.canvas.width / this.dpr
    this.ctx.font = `11px ${CHART_FONT_FAMILY}`
    const textWidth = this.ctx.measureText(this.markerLabelText(marker, yAxisUnit, amplitudeIsRelative)).width
    const labelX = Math.min(Math.max(x + 6, 4), widthCss - textWidth - 10)
    return { x: labelX - 3, y: plotTop + 2, width: textWidth + 6, height: 14 }
  }
}
