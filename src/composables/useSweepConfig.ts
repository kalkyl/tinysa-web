import { computed } from 'vue'
import { useDeviceCapabilities } from './useDeviceCapabilities'
import { formatFrequencyHz } from '../plot/axes'
import { persistedRef } from '../utils/persistedRef'
import type { RbwSetting, SweepConfig } from '../types/protocol'

const startHz = persistedRef('sweep.startHz', 88_000_000)
const stopHz = persistedRef('sweep.stopHz', 108_000_000)
const rbw = persistedRef<RbwSetting>('sweep.rbw', 'auto')
const points = persistedRef('sweep.points', 450)

export function useSweepConfig() {
  const { freqRangeHz, rbwRangeKHz, maxPoints } = useDeviceCapabilities()

  const validationError = computed<string | null>(() => {
    if (!(startHz.value < stopHz.value)) {
      return 'Start frequency must be less than stop frequency.'
    }
    const range = freqRangeHz.value
    if (range && (startHz.value < range.min || stopHz.value > range.max)) {
      return `Frequency must be within ${formatFrequencyHz(range.min)}–${formatFrequencyHz(range.max)}.`
    }
    if (rbw.value !== 'auto') {
      const rbwRange = rbwRangeKHz.value
      if (rbwRange) {
        if ('discreteKHz' in rbwRange) {
          if (!rbwRange.discreteKHz.includes(rbw.value)) {
            return 'RBW is not one of the supported values.'
          }
        } else if (rbw.value < rbwRange.min || rbw.value > rbwRange.max) {
          return `RBW must be within ${rbwRange.min}–${rbwRange.max} kHz.`
        }
      }
    }
    if (points.value < 2) return 'Points must be at least 2.'
    if (maxPoints.value && points.value > maxPoints.value) {
      return `Points must be ≤ ${maxPoints.value}.`
    }
    return null
  })

  const sweepConfig = computed<SweepConfig>(() => ({
    startHz: startHz.value,
    stopHz: stopHz.value,
    points: points.value,
  }))

  return { startHz, stopHz, rbw, points, sweepConfig, validationError }
}
