import { ProtocolError } from './errors'

export type PullChunk = () => Promise<{ value: Uint8Array | undefined; done: boolean }>

// Byte-level (not TextDecoderStream) since tinySA responses mix ASCII shell text
// with raw binary payloads (scanraw) in the same stream.
export class ByteStreamReader {
  private buffer = new Uint8Array(0)
  private closed = false
  private readonly pullChunk: PullChunk

  constructor(pullChunk: PullChunk) {
    this.pullChunk = pullChunk
  }

  async readUntil(marker: Uint8Array, maxBytes: number): Promise<Uint8Array> {
    for (;;) {
      const idx = this.findMarker(marker)
      if (idx >= 0) {
        return this.consume(idx + marker.length)
      }
      if (this.buffer.length > maxBytes) {
        throw new ProtocolError(`readUntil: marker not found within ${maxBytes} bytes`)
      }
      await this.pullOnce()
    }
  }

  async readExactly(n: number): Promise<Uint8Array> {
    while (this.buffer.length < n) {
      await this.pullOnce()
    }
    return this.consume(n)
  }

  dispose(): void {
    this.closed = true
  }

  private async pullOnce(): Promise<void> {
    if (this.closed) {
      throw new ProtocolError('byte stream closed before enough data arrived')
    }
    const { value, done } = await this.pullChunk()
    if (done) {
      this.closed = true
      throw new ProtocolError('byte stream closed before enough data arrived')
    }
    if (value && value.length > 0) {
      this.append(value)
    }
  }

  private append(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.buffer.length + chunk.length)
    merged.set(this.buffer, 0)
    merged.set(chunk, this.buffer.length)
    this.buffer = merged
  }

  private consume(n: number): Uint8Array {
    const out = this.buffer.slice(0, n)
    this.buffer = this.buffer.slice(n)
    return out
  }

  private findMarker(marker: Uint8Array): number {
    if (marker.length === 0 || this.buffer.length < marker.length) return -1
    outer: for (let i = 0; i <= this.buffer.length - marker.length; i++) {
      for (let j = 0; j < marker.length; j++) {
        if (this.buffer[i + j] !== marker[j]) continue outer
      }
      return i
    }
    return -1
  }
}
