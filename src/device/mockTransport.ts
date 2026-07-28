import type { Transport } from './transport'
import type { PullChunk } from './byteStreamReader'

// Firmware's auto-attenuation always resolves to a real dB value; this stands in for
// whatever it would have picked based on input level.
const MOCK_AUTO_ATTENUATION_DB = 8

interface MockState {
  startHz: number
  stopHz: number
  points: number
  rbwKHz: number | 'auto'
  paused: boolean
  inputMode: 'low' | 'high'
  attenuatorAuto: boolean
  attenuatorDb: number
  spurReduction: boolean
}

// In-memory simulated tinySA Basic using the same byte framing real hardware uses.
export class MockTransport implements Transport {
  private state: MockState = {
    startHz: 0,
    stopHz: 800_000_000,
    points: 450,
    rbwKHz: 'auto',
    paused: false,
    inputMode: 'low',
    attenuatorAuto: true,
    attenuatorDb: MOCK_AUTO_ATTENUATION_DB,
    spurReduction: true,
  }
  private incoming = ''
  private outQueue: Uint8Array[] = []
  private waiters: Array<(chunk: Uint8Array) => void> = []
  private disconnectCbs: Array<() => void> = []
  private closed = false
  private versionText = 'tinySA v1.4-143-g12345\r\nHW Version:V0.4.5.1'

  async write(bytes: Uint8Array): Promise<void> {
    this.incoming += new TextDecoder().decode(bytes)
    let idx: number
    while ((idx = this.incoming.indexOf('\r')) >= 0) {
      const line = this.incoming.slice(0, idx)
      this.incoming = this.incoming.slice(idx + 1)
      this.handleCommand(line)
    }
  }

  read: PullChunk = () => {
    if (this.closed) return Promise.resolve({ value: undefined, done: true })
    const chunk = this.outQueue.shift()
    if (chunk) return Promise.resolve({ value: chunk, done: false })
    return new Promise((resolve) => {
      this.waiters.push((c) => resolve({ value: c, done: false }))
    })
  }

  async close(): Promise<void> {
    this.closed = true
    for (const cb of this.disconnectCbs) cb()
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCbs.push(cb)
  }

  /** Test/dev hook: force the simulated version string (e.g. to test Ultra detection). */
  setVersionText(text: string): void {
    this.versionText = text
  }

  private handleCommand(line: string): void {
    const [cmd, ...args] = line.trim().split(/\s+/)
    switch (cmd) {
      case 'sweep':
        this.handleSweep(args)
        return
      case 'rbw':
        this.handleRbw(args)
        return
      case 'mode':
        this.handleMode(args)
        return
      case 'attenuate':
        this.handleAttenuate(args)
        return
      case 'spur':
        this.handleSpur(args)
        return
      case 'pause':
        this.state.paused = true
        this.respond(line, '')
        return
      case 'resume':
        this.state.paused = false
        this.respond(line, '')
        return
      case 'version':
      case 'info':
        this.respond(line, this.versionText)
        return
      case 'frequencies':
        this.respond(line, this.frequenciesLine(this.state.startHz, this.state.stopHz, this.state.points))
        return
      case 'scanraw':
        this.handleScanRaw(args)
        return
      default:
        this.respond(line, '-unknown command-')
    }
  }

  private handleSweep(args: string[]): void {
    if (args.length === 0) {
      this.respond('sweep', `${this.state.startHz} ${this.state.stopHz} ${this.state.points}`)
      return
    }
    const [startHz, stopHz, points] = args.map(Number)
    this.state.startHz = startHz
    this.state.stopHz = stopHz
    if (points !== undefined && !Number.isNaN(points)) this.state.points = points
    this.respond(`sweep ${args.join(' ')}`, '')
  }

  private handleRbw(args: string[]): void {
    if (args.length === 0) {
      this.respond('rbw', String(this.state.rbwKHz))
      return
    }
    this.state.rbwKHz = args[0] === 'auto' ? 'auto' : Number(args[0])
    this.respond(`rbw ${args.join(' ')}`, '')
  }

  private handleMode(args: string[]): void {
    if (args.length === 0) {
      this.respond('mode', this.state.inputMode)
      return
    }
    const [target] = args
    if (target === 'low' || target === 'high') this.state.inputMode = target
    this.respond(`mode ${args.join(' ')}`, '')
  }

  private handleAttenuate(args: string[]): void {
    if (args.length === 0) {
      // Real firmware always echoes a resolved dB value on query, even in "auto" mode.
      this.respond('attenuate', `attenuate 0..31|auto\r\n${this.state.attenuatorDb.toFixed(2)}`)
      return
    }
    if (args[0] === 'auto') {
      this.state.attenuatorAuto = true
      this.state.attenuatorDb = MOCK_AUTO_ATTENUATION_DB
    } else {
      this.state.attenuatorAuto = false
      this.state.attenuatorDb = Number(args[0])
    }
    this.respond(`attenuate ${args.join(' ')}`, '')
  }

  private handleSpur(args: string[]): void {
    if (args.length === 0) {
      this.respond('spur', this.state.spurReduction ? 'on' : 'off')
      return
    }
    if (args[0] === 'on' || args[0] === 'off') this.state.spurReduction = args[0] === 'on'
    this.respond(`spur ${args.join(' ')}`, '')
  }

  private handleScanRaw(args: string[]): void {
    const [startHz, stopHz, pointsArg] = args.map(Number)
    const points = Number.isNaN(pointsArg) ? this.state.points : pointsArg
    const line = `scanraw ${args.join(' ')}`
    // A real sweep takes real time; without an artificial delay here, a
    // streaming loop of back-to-back scanraw calls against this mock would
    // resolve purely through chained microtasks and never yield a macrotask
    // turn to the browser, freezing rendering and input indefinitely.
    const delayMs = Math.min(200, Math.max(15, points * 0.3))
    setTimeout(() => {
      if (this.closed) return
      this.emitText(`${line}\r\n{`)
      this.emitBytes(this.synthesizeScanRawPayload(startHz, stopHz, points))
      this.emitText('}ch> ')
    }, delayMs)
  }

  private synthesizeScanRawPayload(startHz: number, stopHz: number, points: number): Uint8Array {
    const bytes = new Uint8Array(points * 3)
    const view = new DataView(bytes.buffer)
    const peakBin = Math.floor(points / 2)
    for (let i = 0; i < points; i++) {
      const noiseDbm = -90 + 5 * Math.sin(i / 7)
      const amplitudeDbm = i === peakBin ? -30 : noiseDbm
      const raw = Math.max(0, Math.min(65535, Math.round((amplitudeDbm + 128) * 32)))
      bytes[i * 3] = 0x7f
      view.setUint16(i * 3 + 1, raw, true)
    }
    void startHz
    void stopHz
    return bytes
  }

  private frequenciesLine(startHz: number, stopHz: number, points: number): string {
    const step = points > 1 ? (stopHz - startHz) / (points - 1) : 0
    const values: string[] = []
    for (let i = 0; i < points; i++) values.push(String(Math.round(startHz + step * i)))
    return values.join(' ')
  }

  private respond(echoLine: string, resultBody: string): void {
    const text = resultBody.length > 0 ? `${echoLine}\r\n${resultBody}\r\nch> ` : `${echoLine}\r\nch> `
    this.emitText(text)
  }

  private emitText(text: string): void {
    this.emitBytes(new TextEncoder().encode(text))
  }

  private emitBytes(bytes: Uint8Array): void {
    const waiter = this.waiters.shift()
    if (waiter) waiter(bytes)
    else this.outQueue.push(bytes)
  }
}
