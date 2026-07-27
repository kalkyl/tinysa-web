import { describe, expect, it } from 'vitest'
import { ByteStreamReader } from './byteStreamReader'
import { ProtocolError } from './errors'

function chunkFeeder(chunks: Uint8Array[]) {
  let i = 0
  return async () => {
    if (i >= chunks.length) return { value: undefined, done: true }
    return { value: chunks[i++], done: false }
  }
}

const enc = (s: string) => new TextEncoder().encode(s)

describe('ByteStreamReader', () => {
  it('readUntil reassembles a marker split across many small chunks', async () => {
    const text = 'sweep 0 800000000 450\r\nch> '
    const chunks: Uint8Array[] = []
    for (const ch of text) chunks.push(enc(ch))
    const reader = new ByteStreamReader(chunkFeeder(chunks))
    const result = await reader.readUntil(enc('ch> '), 4096)
    expect(new TextDecoder().decode(result)).toBe(text)
  })

  it('readExactly reassembles N bytes split across chunk boundaries', async () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const chunks = [payload.slice(0, 3), payload.slice(3, 4), payload.slice(4)]
    const reader = new ByteStreamReader(chunkFeeder(chunks))
    const result = await reader.readExactly(10)
    expect(Array.from(result)).toEqual(Array.from(payload))
  })

  it('leaves leftover bytes buffered for the next read', async () => {
    const chunks = [enc('abc{def')]
    const reader = new ByteStreamReader(chunkFeeder(chunks))
    const before = await reader.readUntil(enc('{'), 4096)
    expect(new TextDecoder().decode(before)).toBe('abc{')
    const after = await reader.readExactly(3)
    expect(new TextDecoder().decode(after)).toBe('def')
  })

  it('throws ProtocolError when marker never arrives within maxBytes', async () => {
    const chunks = [enc('a'.repeat(20))]
    const reader = new ByteStreamReader(chunkFeeder(chunks))
    await expect(reader.readUntil(enc('ch> '), 5)).rejects.toThrow(ProtocolError)
  })

  it('throws ProtocolError when the stream closes before enough data arrives', async () => {
    const reader = new ByteStreamReader(chunkFeeder([enc('ab')]))
    await expect(reader.readExactly(10)).rejects.toThrow(ProtocolError)
  })
})
