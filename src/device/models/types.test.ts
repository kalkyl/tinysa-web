import { describe, expect, it } from 'vitest'
import { estimateAutoRbwKHz } from './types'
import { tinySABasicProfile } from './basic'

describe('estimateAutoRbwKHz', () => {
  it('picks a wide (coarse) RBW for a wide span, clamped to the profile max', () => {
    const rbw = estimateAutoRbwKHz(tinySABasicProfile, 930_000_000, 450)
    expect(rbw).toBe(850)
  })

  it('picks a narrower RBW for a narrow span', () => {
    const narrow = estimateAutoRbwKHz(tinySABasicProfile, 20_000_000, 450)
    const wide = estimateAutoRbwKHz(tinySABasicProfile, 930_000_000, 450)
    expect(narrow).toBeLessThan(wide)
  })

  it('never goes outside the profile rbw range', () => {
    const rbw = estimateAutoRbwKHz(tinySABasicProfile, 1000, 450)
    expect(rbw).toBeGreaterThanOrEqual(0.2)
    expect(rbw).toBeLessThanOrEqual(850)
  })
})
