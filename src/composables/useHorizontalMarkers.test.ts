import { describe, expect, it } from 'vitest'
import { useHorizontalMarkers } from './useHorizontalMarkers'

describe('useHorizontalMarkers', () => {
  it('starts empty and adds markers', () => {
    const { markers, add, clear } = useHorizontalMarkers()
    clear()
    expect(markers.value).toEqual([])
    add(-40)
    add(-60)
    expect(markers.value.map((m) => m.valueDbm)).toEqual([-40, -60])
  })

  it('assigns each marker a unique id, and add() returns it', () => {
    const { markers, add, clear } = useHorizontalMarkers()
    clear()
    const idA = add(-40)
    const idB = add(-40)
    expect(idA).not.toBe(idB)
    expect(markers.value.map((m) => m.id)).toEqual([idA, idB])
  })

  it('setValue() updates only the matching marker, for drag-to-reposition', () => {
    const { markers, add, setValue, clear } = useHorizontalMarkers()
    clear()
    const idA = add(-40)
    add(-60)
    setValue(idA, -35)
    expect(markers.value.find((m) => m.id === idA)?.valueDbm).toBe(-35)
    expect(markers.value.find((m) => m.id !== idA)?.valueDbm).toBe(-60)
  })

  it('remove() drops only the matching marker', () => {
    const { markers, add, remove, clear } = useHorizontalMarkers()
    clear()
    add(-40)
    add(-60)
    const idToRemove = markers.value[0].id
    remove(idToRemove)
    expect(markers.value.length).toBe(1)
    expect(markers.value[0].valueDbm).toBe(-60)
  })

  it('clear() empties all markers', () => {
    const { markers, add, clear } = useHorizontalMarkers()
    add(-40)
    add(-60)
    clear()
    expect(markers.value).toEqual([])
  })
})
