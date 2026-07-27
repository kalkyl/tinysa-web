import { ref } from 'vue'
import { useSerialPort } from './useSerialPort'
import type { RbwSetting, ScanRawFrame, SweepConfig } from '../types/protocol'

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
  async function start(getConfig: () => SweepConfig, getRbw: () => RbwSetting): Promise<void> {
    if (isStreaming.value) return
    const d = device.value
    if (!d) throw new Error('Not connected to a tinySA.')

    isStreaming.value = true
    streamError.value = null
    let lastRbw: RbwSetting | undefined

    try {
      await d.pause()
      while (isStreaming.value) {
        const rbw = getRbw()
        if (rbw !== lastRbw) {
          await d.setRbw(rbw)
          lastRbw = rbw
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
