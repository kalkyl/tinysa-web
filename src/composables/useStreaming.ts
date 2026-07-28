import { ref } from 'vue'
import { useSerialPort } from './useSerialPort'
import type { AttenuatorSetting, InputMode, RbwSetting, ScanRawFrame, SweepConfig } from '../types/protocol'

export type FrameListener = (frame: ScanRawFrame) => void

const isStreaming = ref(false)
const streamError = ref<string | null>(null)
const listeners = new Set<FrameListener>()

export function useStreaming() {
  const { device } = useSerialPort()

  function onFrame(cb: FrameListener): () => void {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }

  // No native push-streaming mode, so this polls scanraw back-to-back until stop().
  async function start(
    getConfig: () => SweepConfig,
    getRbw: () => RbwSetting,
    getInputMode: () => InputMode,
    getAttenuator: () => AttenuatorSetting,
  ): Promise<void> {
    if (isStreaming.value) return
    const d = device.value
    if (!d) throw new Error('Not connected to a tinySA.')

    isStreaming.value = true
    streamError.value = null
    let lastRbw: RbwSetting | undefined
    let lastInputMode: InputMode | undefined
    let lastAttenuator: AttenuatorSetting | undefined

    try {
      await d.pause()
      while (isStreaming.value) {
        const rbw = getRbw()
        if (rbw !== lastRbw) {
          await d.setRbw(rbw)
          lastRbw = rbw
        }
        const inputMode = getInputMode()
        if (inputMode !== lastInputMode) {
          await d.setInputMode(inputMode)
          lastInputMode = inputMode
        }
        const attenuator = getAttenuator()
        if (attenuator !== lastAttenuator) {
          await d.setAttenuator(attenuator)
          lastAttenuator = attenuator
        }
        const frame = await d.scanRaw(getConfig())
        for (const cb of listeners) cb(frame)
      }
    } catch (err) {
      streamError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isStreaming.value = false
      try {
        await d.resume()
      } catch {
        // device may already be disconnected/desynced; nothing more to do
      }
    }
  }

  function stop(): void {
    isStreaming.value = false
  }

  return { isStreaming, streamError, start, stop, onFrame }
}
