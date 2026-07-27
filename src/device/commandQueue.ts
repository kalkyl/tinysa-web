import { TimeoutError } from './errors'
import { asciiCommandTimeoutMs } from './timeouts'

// Serializes commands (device is half-duplex, one in flight at a time) with a per-command timeout.
// Doesn't cancel an in-flight read on timeout; the caller must treat a timeout as a desync.
export class CommandQueue {
  private tail: Promise<unknown> = Promise.resolve()

  run<T>(task: () => Promise<T>, timeoutMs: number = asciiCommandTimeoutMs()): Promise<T> {
    const result = this.tail.then(() => this.withTimeout(task, timeoutMs))
    this.tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  private async withTimeout<T>(task: () => Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(`command timed out after ${timeoutMs}ms`)), timeoutMs)
    })
    try {
      return await Promise.race([task(), timeout])
    } finally {
      clearTimeout(timer)
    }
  }
}
