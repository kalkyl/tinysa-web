import { ref, shallowRef } from 'vue'
import { TinySADevice } from '../device/tinySADevice'
import { SerialTransport } from '../device/serialTransport'

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'

// Module-scoped: every caller shares the same connection.
const state = ref<ConnectionState>('idle')
const device = shallowRef<TinySADevice | null>(null)
const errorMessage = ref<string | null>(null)

export function useSerialPort() {
  async function connect(): Promise<void> {
    state.value = 'connecting'
    errorMessage.value = null
    try {
      const transport = await SerialTransport.requestAndOpen()
      const connected = await TinySADevice.connect(transport)
      transport.onDisconnect(() => {
        state.value = 'disconnected'
        device.value = null
      })
      device.value = connected
      state.value = 'connected'
    } catch (err) {
      state.value = 'error'
      errorMessage.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  async function disconnect(): Promise<void> {
    const current = device.value
    device.value = null
    state.value = 'idle'
    if (current) {
      await current.disconnect()
    }
  }

  return { state, device, errorMessage, connect, disconnect }
}
