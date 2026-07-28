import { computed, shallowRef, watch } from 'vue'
import { persistedRef } from '../utils/persistedRef'
import { useSerialPort } from './useSerialPort'
import { useStreaming } from './useStreaming'
import type { AttenuatorSetting, InputMode } from '../types/protocol'

const inputMode = persistedRef<InputMode>('device.inputMode', 'low')
// Default to manual/0dB: on tinySA Basic, "auto" is a fixed 30dB (Low mode) / 0dB (High
// mode) preset rather than an adaptive AGC, so defaulting to it would silently raise the
// noise floor for new users.
const attenuatorAuto = persistedRef('device.attenuatorAuto', false)
const attenuatorDb = persistedRef('device.attenuatorDb', 0)
// Shifts the IF to reduce spurious mixer products/images — a real quality improvement
// with only a minor sweep-time cost, so (unlike attenuator "auto") on is a sensible default.
const spurReduction = persistedRef('device.spurReduction', true)

/** What the device actually resolved "auto" (or the fixed setting) to — read back periodically while streaming. */
const effectiveAttenuatorDb = shallowRef<number | null>(null)

const ATTENUATOR_POLL_INTERVAL_MS = 1000
let wired = false
let pollTimer: ReturnType<typeof setInterval> | undefined

export function useInputSettings() {
  const { device } = useSerialPort()
  const { isStreaming } = useStreaming()

  if (!wired) {
    wired = true

    const poll = (): void => {
      device.value?.getAttenuator().then(
        (db) => {
          effectiveAttenuatorDb.value = db
        },
        () => {
          // transient read failure; keep showing the last known value
        },
      )
    }

    watch(
      isStreaming,
      (streaming) => {
        if (streaming) {
          poll()
          pollTimer = setInterval(poll, ATTENUATOR_POLL_INTERVAL_MS)
        } else {
          if (pollTimer) clearInterval(pollTimer)
          pollTimer = undefined
          effectiveAttenuatorDb.value = null
        }
      },
      { immediate: true },
    )
  }

  const attenuator = computed<AttenuatorSetting>(() => (attenuatorAuto.value ? 'auto' : attenuatorDb.value))

  return { inputMode, attenuatorAuto, attenuatorDb, attenuator, effectiveAttenuatorDb, spurReduction }
}
