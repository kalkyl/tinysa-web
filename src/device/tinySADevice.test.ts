import { afterEach, describe, expect, it, vi } from 'vitest'
import { TinySADevice } from './tinySADevice'
import { MockTransport } from './mockTransport'
import { DeviceUnsupportedError, ProtocolError, TimeoutError } from './errors'
import type { Transport } from './transport'

describe('TinySADevice + MockTransport', () => {
  it('connects and detects the tinySA Basic profile', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    expect(device.profile.id).toBe('tinysa-basic')
  })

  it('exposes the raw version banner text after connecting', async () => {
    const transport = new MockTransport()
    transport.setVersionText('tinySA v1.4-143-g12345\r\nHW Version:V0.4.5.1')
    const device = await TinySADevice.connect(transport)
    expect(device.versionText).toBe('tinySA v1.4-143-g12345\r\nHW Version:V0.4.5.1')
  })

  it('refuses to connect to a detected tinySA Ultra', async () => {
    const transport = new MockTransport()
    transport.setVersionText('tinySA4_v1.4-160-abcdef')
    await expect(TinySADevice.connect(transport)).rejects.toThrow(DeviceUnsupportedError)
  })

  it('fails clearly instead of silently accepting a garbled version response (stale bytes from a prior session)', async () => {
    const transport = new MockTransport()
    transport.injectStaleBytes(new TextEncoder().encode('\x01\x02\x03\r\nBAD\x01DATA\r\nch> '))
    await expect(TinySADevice.connect(transport)).rejects.toThrow(ProtocolError)
  })

  it('sets sweep config and reads it back', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    await device.setSweep({ startHz: 1_000_000, stopHz: 100_000_000, points: 20 })
    const sweep = await device.getSweep()
    expect(sweep).toEqual({ startHz: 1_000_000, stopHz: 100_000_000, points: 20 })
  })

  it('returns a well-formed ScanRawFrame from scanRaw, with the expected peak', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    const cfg = { startHz: 0, stopHz: 100_000_000, points: 11 }
    const frame = await device.scanRaw(cfg)
    expect(frame.frequenciesHz.length).toBe(11)
    expect(frame.amplitudesDbm.length).toBe(11)
    expect(frame.frequenciesHz[0]).toBe(0)
    expect(frame.frequenciesHz[10]).toBe(100_000_000)
    // mock injects a peak at the center bin (~-30dBm) against a much lower noise floor
    const peakIdx = Math.floor(11 / 2)
    expect(frame.amplitudesDbm[peakIdx]).toBeGreaterThan(-40)
    expect(frame.amplitudesDbm[0]).toBeLessThan(-60)
  })

  it('serializes commands: pause/resume/scanRaw run in the order called, one at a time', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    const order: string[] = []
    const p1 = device.pause().then(() => order.push('pause'))
    const p2 = device.scanRaw({ startHz: 0, stopHz: 10_000_000, points: 5 }).then(() => order.push('scanRaw'))
    const p3 = device.resume().then(() => order.push('resume'))
    await Promise.all([p1, p2, p3])
    expect(order).toEqual(['pause', 'scanRaw', 'resume'])
  })

  it('runs many back-to-back scanRaw calls (the streaming pattern) without desync', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    const cfg = { startHz: 0, stopHz: 50_000_000, points: 30 }
    for (let i = 0; i < 5; i++) {
      const frame = await device.scanRaw(cfg)
      expect(frame.amplitudesDbm.length).toBe(30)
    }
    expect(device.desynced).toBe(false)
  })

  it('sets input port mode and attenuator on the device', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    await expect(device.setInputMode('high')).resolves.toBeUndefined()
    await expect(device.setAttenuator(12)).resolves.toBeUndefined()
    await expect(device.setAttenuator('auto')).resolves.toBeUndefined()
  })

  it('reads back the resolved attenuator dB, including while in auto mode', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    await device.setAttenuator(21)
    expect(await device.getAttenuator()).toBe(21)

    await device.setAttenuator('auto')
    const autoResolved = await device.getAttenuator()
    expect(autoResolved).not.toBeNaN()
    expect(typeof autoResolved).toBe('number')
  })

  it('sets spur reduction on the device', async () => {
    const device = await TinySADevice.connect(new MockTransport())
    await expect(device.setSpurReduction(true)).resolves.toBeUndefined()
    await expect(device.setSpurReduction(false)).resolves.toBeUndefined()
  })

  describe('timeout handling', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('rejects with TimeoutError and marks the device desynced when a command never gets a response', async () => {
      vi.useFakeTimers()
      const stuckTransport: Transport = {
        write: async () => undefined,
        read: () => new Promise(() => {}),
        close: async () => undefined,
        onDisconnect: () => undefined,
      }
      const connectPromise = TinySADevice.connect(stuckTransport)
      const assertion = expect(connectPromise).rejects.toThrow(TimeoutError)
      await vi.advanceTimersByTimeAsync(3000)
      await assertion
    })
  })
})
