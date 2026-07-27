export class ProtocolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProtocolError'
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class DeviceUnsupportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeviceUnsupportedError'
  }
}
