export {}

// Minimal ambient Web Serial API types (not yet shipped in lib.dom.d.ts),
// scoped to exactly what this app's transport layer needs.
declare global {
  interface SerialPortInfo {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialOptions {
    baudRate: number
    dataBits?: number
    stopBits?: number
    parity?: 'none' | 'even' | 'odd'
    bufferSize?: number
    flowControl?: 'none' | 'hardware'
  }

  interface SerialPort extends EventTarget {
    readonly readable: ReadableStream<Uint8Array> | null
    readonly writable: WritableStream<Uint8Array> | null
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    getInfo(): SerialPortInfo
    addEventListener(type: 'connect' | 'disconnect', listener: (ev: Event) => void): void
    removeEventListener(type: 'connect' | 'disconnect', listener: (ev: Event) => void): void
  }

  interface SerialPortFilter {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[]
  }

  interface Serial extends EventTarget {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
    addEventListener(type: 'connect' | 'disconnect', listener: (ev: Event) => void): void
    removeEventListener(type: 'connect' | 'disconnect', listener: (ev: Event) => void): void
  }

  interface Navigator {
    readonly serial?: Serial
  }
}
