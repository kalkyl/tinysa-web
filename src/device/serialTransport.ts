import type { PullChunk } from './byteStreamReader'
import type { Transport } from './transport'

const DEFAULT_BAUD_RATE = 115200

// STMicroelectronics VID, which the tinySA's CDC-ACM VCP enumerates under — just narrows the port picker.
const TINYSA_USB_FILTERS: SerialPortFilter[] = [{ usbVendorId: 0x0483 }]

export class SerialTransport implements Transport {
  private readonly port: SerialPort
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readonly disconnectCbs: Array<() => void> = []

  private constructor(port: SerialPort) {
    this.port = port
  }

  static async requestAndOpen(baudRate: number = DEFAULT_BAUD_RATE): Promise<SerialTransport> {
    if (!navigator.serial) {
      throw new Error(
        'Web Serial API is not available in this browser. Use Chrome, Edge, or Opera, served over https or localhost.',
      )
    }
    const port = await navigator.serial.requestPort({ filters: TINYSA_USB_FILTERS })
    await port.open({ baudRate })
    const transport = new SerialTransport(port)
    transport.attach()
    return transport
  }

  read: PullChunk = async () => {
    if (!this.reader) throw new Error('serial port is not open')
    const { value, done } = await this.reader.read()
    return { value, done }
  }

  write = async (bytes: Uint8Array): Promise<void> => {
    if (!this.writer) throw new Error('serial port is not open')
    await this.writer.write(bytes)
  }

  async close(): Promise<void> {
    this.port.removeEventListener('disconnect', this.handleDisconnect)
    try {
      await this.reader?.cancel()
    } catch {
      // best-effort: the port may already be gone
    }
    this.reader?.releaseLock()
    this.writer?.releaseLock()
    try {
      await this.port.close()
    } catch {
      // best-effort: closing an already-disconnected port throws
    }
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCbs.push(cb)
  }

  private attach(): void {
    if (!this.port.readable || !this.port.writable) {
      throw new Error('serial port has no readable/writable stream after open()')
    }
    this.reader = this.port.readable.getReader()
    this.writer = this.port.writable.getWriter()
    this.port.addEventListener('disconnect', this.handleDisconnect)
  }

  private handleDisconnect = (): void => {
    for (const cb of this.disconnectCbs) cb()
  }
}
