import { describe, expect, it } from 'vitest'
import { detectModel } from './registry'

describe('detectModel', () => {
  it('recognizes tinySA Basic version strings', () => {
    const result = detectModel('tinySA v1.4-143-g12345\r\nHW Version:V0.4.5.1\r\n')
    expect(result).toEqual({ profile: expect.objectContaining({ id: 'tinysa-basic' }), recognized: true })
  })

  it('recognizes tinySA Ultra (tinySA4) version strings', () => {
    const result = detectModel('tinySA4_v1.4-160-abcdef')
    expect(result.profile.id).toBe('tinysa-ultra')
    expect(result.recognized).toBe(true)
  })

  it('recognizes "Ultra" wording even without the tinysa4 token', () => {
    const result = detectModel('tinySA Ultra firmware 1.4')
    expect(result.profile.id).toBe('tinysa-ultra')
  })

  it('falls back to Basic but flags unrecognized strings rather than guessing silently', () => {
    const result = detectModel('some unexpected banner')
    expect(result.profile.id).toBe('tinysa-basic')
    expect(result.recognized).toBe(false)
  })
})
