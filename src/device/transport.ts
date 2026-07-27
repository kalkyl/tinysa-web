import type { PullChunk } from './byteStreamReader'

// Implemented identically by the real Web Serial transport and the in-memory mock.
export interface Transport {
  write(bytes: Uint8Array): Promise<void>
  read: PullChunk
  close(): Promise<void>
  onDisconnect(cb: () => void): void
}
