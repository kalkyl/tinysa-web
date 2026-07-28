import { describe, expect, it } from 'vitest'
import {
  assertClosingMarker,
  attenuateCommand,
  CLOSE_BRACE_PROMPT,
  decodeScanRawSamples,
  modeCommand,
  parseAttenuateResponse,
  parseFrequenciesResponse,
  parseSweepResponse,
  stripEchoAndPrompt,
} from './protocolCodec'
import { ProtocolError } from './errors'

const enc = (s: string) => new TextEncoder().encode(s)

describe('stripEchoAndPrompt', () => {
  it('removes the echoed command line and trailing prompt', () => {
    const raw = enc('sweep\r\n0 800000000 450\r\nch> ')
    expect(stripEchoAndPrompt(raw)).toBe('0 800000000 450')
  })

  it('handles a response with no body text', () => {
    const raw = enc('pause\r\nch> ')
    expect(stripEchoAndPrompt(raw)).toBe('')
  })
})

describe('parseSweepResponse', () => {
  it('parses start/stop/points', () => {
    expect(parseSweepResponse('0 800000000 450')).toEqual({ startHz: 0, stopHz: 800000000, points: 450 })
  })

  it('throws ProtocolError on garbage', () => {
    expect(() => parseSweepResponse('not a number')).toThrow(ProtocolError)
  })
})

describe('parseFrequenciesResponse', () => {
  it('parses whitespace-separated frequencies', () => {
    const result = parseFrequenciesResponse('1781737 3563474 5345211')
    expect(Array.from(result)).toEqual([1781737, 3563474, 5345211])
  })
})

function buildScanRawFixture(samples: number[]): Uint8Array {
  const bytes = new Uint8Array(samples.length * 3)
  const view = new DataView(bytes.buffer)
  samples.forEach((sample, i) => {
    bytes[i * 3] = 0x7f // filler byte
    view.setUint16(i * 3 + 1, sample, true)
  })
  return bytes
}

describe('decodeScanRawSamples', () => {
  it('decodes a byte-exact fixture into raw uint16 samples', () => {
    const samples = [0, 1234, 4095, 65535]
    const payload = buildScanRawFixture(samples)
    const decoded = decodeScanRawSamples(payload, samples.length)
    expect(Array.from(decoded)).toEqual(samples)
  })

  it('throws ProtocolError when payload length does not match expected point count', () => {
    const payload = buildScanRawFixture([1, 2, 3])
    expect(() => decodeScanRawSamples(payload, 4)).toThrow(ProtocolError)
  })
})

describe('modeCommand', () => {
  it('defaults to the input port', () => {
    expect(modeCommand('low')).toBe('mode low input')
  })

  it('accepts an explicit output target', () => {
    expect(modeCommand('high', 'output')).toBe('mode high output')
  })
})

describe('attenuateCommand', () => {
  it('formats a fixed dB value', () => {
    expect(attenuateCommand(12)).toBe('attenuate 12')
  })

  it('formats auto', () => {
    expect(attenuateCommand('auto')).toBe('attenuate auto')
  })
})

describe('parseAttenuateResponse', () => {
  it('takes the resolved dB value from the trailing line, ignoring the usage-hint line', () => {
    expect(parseAttenuateResponse('attenuate 0..31|auto\r\n8.00')).toBe(8)
  })

  it('throws ProtocolError on garbage', () => {
    expect(() => parseAttenuateResponse('not a number')).toThrow(ProtocolError)
  })
})

describe('assertClosingMarker', () => {
  it('accepts the exact closing marker', () => {
    expect(() => assertClosingMarker(CLOSE_BRACE_PROMPT)).not.toThrow()
  })

  it('throws ProtocolError on a corrupted/desynced trailing marker', () => {
    const corrupted = enc('}xh> ')
    expect(() => assertClosingMarker(corrupted)).toThrow(ProtocolError)
  })
})
