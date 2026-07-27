import { computed } from 'vue'
import { useSerialPort } from './useSerialPort'

export function useDeviceCapabilities() {
  const { device } = useSerialPort()
  const freqRangeHz = computed(() => device.value?.profile.freqRangeHz ?? null)
  const rbwRangeKHz = computed(() => device.value?.profile.rbwRangeKHz ?? null)
  const defaultPoints = computed(() => device.value?.profile.defaultPoints ?? null)
  const maxPoints = computed(() => device.value?.profile.maxPoints ?? null)
  const displayName = computed(() => device.value?.profile.displayName ?? null)
  const firmwareVersion = computed(() => {
    const text = device.value?.versionText
    if (!text) return null
    return text.split(/\r?\n/)[0]?.trim() || null
  })
  return { freqRangeHz, rbwRangeKHz, defaultPoints, maxPoints, displayName, firmwareVersion }
}
