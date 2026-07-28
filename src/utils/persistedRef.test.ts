import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { persistedRef } from './persistedRef'

describe('persistedRef', () => {
  it('falls back to the default when nothing is stored yet', () => {
    const value = persistedRef(`test-${Math.random()}`, 42)
    expect(value.value).toBe(42)
  })

  it('persists a change and a fresh persistedRef() call picks it up', async () => {
    const key = `test-${Math.random()}`
    const first = persistedRef(key, 'a')
    first.value = 'b'
    await nextTick()

    const second = persistedRef(key, 'a')
    expect(second.value).toBe('b')
  })

  it('round-trips objects and arrays via JSON', async () => {
    const key = `test-${Math.random()}`
    const first = persistedRef(key, { x: 1, list: [1, 2, 3] })
    first.value = { x: 2, list: [4, 5] }
    await nextTick()

    const second = persistedRef(key, { x: 1, list: [] as number[] })
    expect(second.value).toEqual({ x: 2, list: [4, 5] })
  })

  it('falls back to the default on malformed stored JSON', () => {
    const key = `test-${Math.random()}`
    localStorage.setItem(`tinysa-web:${key}`, '{not valid json')
    const value = persistedRef(key, 'fallback')
    expect(value.value).toBe('fallback')
  })
})
