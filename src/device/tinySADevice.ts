import type { Transport } from './transport'
import { ByteStreamReader } from './byteStreamReader'
import { CommandQueue } from './commandQueue'
import { DeviceUnsupportedError, TimeoutError } from './errors'
import { asciiCommandTimeoutMs, computeScanTimeoutMs } from './timeouts'
import {
  assertClosingMarker,
  attenuateCommand,
  CLOSE_BRACE_PROMPT,
  decodeScanRawSamples,
  encodeCommand,
  modeCommand,
  OPEN_BRACE,
  parseAttenuateResponse,
  parseFrequenciesResponse,
  parseSweepResponse,
  PROMPT,
  rbwCommand,
  scanRawCommand,
  SCANRAW_BYTES_PER_POINT,
  spurCommand,
  stripEchoAndPrompt,
  sweepCommand,
} from './protocolCodec'
import { tinySABasicProfile } from './models/basic'
import { detectModel } from './models/registry'
import { estimateAutoRbwKHz, type DeviceProfile } from './models/types'
import { computeFrequencyList } from '../utils/frequencyList'
import type { AttenuatorSetting, InputMode, RbwSetting, ScanRawFrame, SweepConfig } from '../types/protocol'

const MAX_ASCII_RESPONSE_BYTES = 8192

export class TinySADevice {
  private readonly transport: Transport
  private readonly byteReader: ByteStreamReader
  private readonly queue = new CommandQueue()
  private _profile: DeviceProfile
  private _rbwSetting: RbwSetting = 'auto'
  private _desynced = false
  private _versionText = ''

  private constructor(transport: Transport, initialProfile: DeviceProfile) {
    this.transport = transport
    this.byteReader = new ByteStreamReader(transport.read)
    this._profile = initialProfile
  }

  get profile(): DeviceProfile {
    return this._profile
  }

  /** Raw response text from the device's `version` command (firmware/HW version banner). */
  get versionText(): string {
    return this._versionText
  }

  /** True once a timeout/frame-desync has occurred; caller should disconnect/reconnect. */
  get desynced(): boolean {
    return this._desynced
  }

  static async connect(transport: Transport): Promise<TinySADevice> {
    const device = new TinySADevice(transport, tinySABasicProfile)
    const infoText = await device.runAscii('version')
    device._versionText = infoText
    const detection = detectModel(infoText)
    if (detection.profile.id === 'tinysa-ultra') {
      throw new DeviceUnsupportedError('tinySA Ultra detected — not yet supported by this app')
    }
    if (!detection.recognized) {
      console.warn(`tinySA model not recognized from version string ${JSON.stringify(infoText)}; assuming tinySA Basic`)
    }
    device._profile = detection.profile
    return device
  }

  async setSweep(cfg: SweepConfig): Promise<void> {
    await this.runAscii(sweepCommand(cfg))
  }

  async getSweep(): Promise<SweepConfig> {
    const text = await this.runAscii('sweep')
    return parseSweepResponse(text)
  }

  async setRbw(khzOrAuto: RbwSetting): Promise<void> {
    await this.runAscii(rbwCommand(khzOrAuto))
    this._rbwSetting = khzOrAuto
  }

  async getFrequencies(cfg: SweepConfig): Promise<Float64Array> {
    await this.setSweep(cfg)
    const text = await this.runAscii('frequencies')
    return parseFrequenciesResponse(text)
  }

  /** Selects Basic's single RF port's direct-sampling ("low") vs harmonic-mixing ("high") path. */
  async setInputMode(mode: InputMode): Promise<void> {
    await this.runAscii(modeCommand(mode))
  }

  async setAttenuator(setting: AttenuatorSetting): Promise<void> {
    await this.runAscii(attenuateCommand(setting))
  }

  /** Reads back the currently active attenuation in dB — resolved to a real value by the firmware even when set to "auto". */
  async getAttenuator(): Promise<number> {
    const text = await this.runAscii('attenuate')
    return parseAttenuateResponse(text)
  }

  /** Shifts the IF to reduce spurious mixer products/images in the display. Basic only accepts on/off (no "auto" — that's Ultra-only). */
  async setSpurReduction(enabled: boolean): Promise<void> {
    await this.runAscii(spurCommand(enabled))
  }

  async pause(): Promise<void> {
    await this.runAscii('pause')
  }

  async resume(): Promise<void> {
    await this.runAscii('resume')
  }

  async scanRaw(cfg: SweepConfig): Promise<ScanRawFrame> {
    const effectiveRbwKHz =
      this._rbwSetting === 'auto'
        ? estimateAutoRbwKHz(this._profile, cfg.stopHz - cfg.startHz, cfg.points)
        : this._rbwSetting
    const timeoutMs = computeScanTimeoutMs(cfg.startHz, cfg.stopHz, effectiveRbwKHz, cfg.points)
    try {
      return await this.queue.run(async () => {
        await this.transport.write(encodeCommand(scanRawCommand(cfg)))
        await this.byteReader.readUntil(OPEN_BRACE, MAX_ASCII_RESPONSE_BYTES)
        const payload = await this.byteReader.readExactly(cfg.points * SCANRAW_BYTES_PER_POINT)
        const closing = await this.byteReader.readExactly(CLOSE_BRACE_PROMPT.length)
        assertClosingMarker(closing)

        const rawSamples = decodeScanRawSamples(payload, cfg.points)
        const amplitudesDbm = Float64Array.from(rawSamples, (raw) => this._profile.toDbm(raw))
        const frequenciesHz = computeFrequencyList(cfg.startHz, cfg.stopHz, cfg.points)
        return { frequenciesHz, amplitudesDbm, timestampMs: Date.now() }
      }, timeoutMs)
    } catch (err) {
      if (err instanceof TimeoutError) this._desynced = true
      throw err
    }
  }

  async disconnect(): Promise<void> {
    this.byteReader.dispose()
    await this.transport.close()
  }

  private async runAscii(cmd: string): Promise<string> {
    try {
      return await this.queue.run(async () => {
        await this.transport.write(encodeCommand(cmd))
        const raw = await this.byteReader.readUntil(PROMPT, MAX_ASCII_RESPONSE_BYTES)
        return stripEchoAndPrompt(raw)
      }, asciiCommandTimeoutMs())
    } catch (err) {
      if (err instanceof TimeoutError) this._desynced = true
      throw err
    }
  }
}
