import { ProtocolError } from './errors'
import type { AttenuatorSetting, InputMode, SweepConfig } from '../types/protocol'

const encoder = new TextEncoder()
const decoder = new TextDecoder('ascii')

export const PROMPT = encoder.encode('ch> ')
export const OPEN_BRACE = encoder.encode('{')
export const CLOSE_BRACE_PROMPT = encoder.encode('}ch> ')

/** Bytes-per-sample in a `scanraw` binary payload: 1 filler byte + little-endian uint16. */
export const SCANRAW_BYTES_PER_POINT = 3

export function encodeCommand(cmd: string): Uint8Array {
  return encoder.encode(`${cmd}\r`)
}

/** True if text is plain printable ASCII (+ whitespace) — used to detect a garbled version response. */
export function isPrintableAsciiText(text: string): boolean {
  return text.length > 0 && /^[\x20-\x7E\r\n\t]*$/.test(text)
}

export function sweepCommand(cfg: SweepConfig): string {
  return `sweep ${cfg.startHz} ${cfg.stopHz} ${cfg.points}`
}

export function scanRawCommand(cfg: SweepConfig): string {
  return `scanraw ${cfg.startHz} ${cfg.stopHz} ${cfg.points}`
}

export function rbwCommand(khzOrAuto: number | 'auto'): string {
  return `rbw ${khzOrAuto}`
}

export function modeCommand(target: InputMode, io: 'input' | 'output' = 'input'): string {
  return `mode ${target} ${io}`
}

export function attenuateCommand(setting: AttenuatorSetting): string {
  return `attenuate ${setting}`
}

// tinySA Basic only accepts on|off (no "auto" — that's Ultra-only).
export function spurCommand(enabled: boolean): string {
  return `spur ${enabled ? 'on' : 'off'}`
}

// Querying `attenuate` with no argument always echoes a resolved dB value, even in
// "auto" mode, on its own trailing line (after a repeated usage-hint line).
export function parseAttenuateResponse(text: string): number {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
  const value = Number(lines[lines.length - 1])
  if (Number.isNaN(value)) {
    throw new ProtocolError(`unexpected attenuate response: ${JSON.stringify(text)}`)
  }
  return value
}

// Strips the echoed command line and trailing `ch> ` prompt, returning just the command's output.
export function stripEchoAndPrompt(raw: Uint8Array): string {
  const text = decoder.decode(raw)
  const withoutPrompt = text.endsWith('ch> ') ? text.slice(0, -'ch> '.length) : text
  const newlineIdx = withoutPrompt.indexOf('\n')
  const body = newlineIdx >= 0 ? withoutPrompt.slice(newlineIdx + 1) : ''
  return body.trim()
}

export function parseSweepResponse(text: string): SweepConfig {
  const parts = text.trim().split(/\s+/).map(Number)
  if (parts.length < 2 || parts.some(Number.isNaN)) {
    throw new ProtocolError(`unexpected sweep response: ${JSON.stringify(text)}`)
  }
  const [startHz, stopHz, points] = parts
  return { startHz, stopHz, points: points ?? 0 }
}

export function parseFrequenciesResponse(text: string): Float64Array {
  const values = text
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map(Number)
  if (values.some(Number.isNaN)) {
    throw new ProtocolError(`unexpected frequencies response: ${JSON.stringify(text)}`)
  }
  return Float64Array.from(values)
}

// Decodes a scanraw payload into raw uint16 samples: 1 filler byte + little-endian uint16 per point.
export function decodeScanRawSamples(payload: Uint8Array, points: number): Uint16Array {
  if (payload.length !== points * SCANRAW_BYTES_PER_POINT) {
    throw new ProtocolError(
      `scanraw payload length ${payload.length} does not match expected ${points * SCANRAW_BYTES_PER_POINT} for ${points} points`,
    )
  }
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  const out = new Uint16Array(points)
  for (let i = 0; i < points; i++) {
    const offset = i * SCANRAW_BYTES_PER_POINT + 1
    out[i] = view.getUint16(offset, true)
  }
  return out
}

export function assertClosingMarker(bytes: Uint8Array): void {
  if (bytes.length !== CLOSE_BRACE_PROMPT.length || !bytes.every((b, i) => b === CLOSE_BRACE_PROMPT[i])) {
    throw new ProtocolError(
      `scanraw frame desync: expected trailing '}ch> ', got ${JSON.stringify(decoder.decode(bytes))}`,
    )
  }
}
