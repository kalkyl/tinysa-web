import { ref, watch, type Ref } from 'vue'

const PREFIX = 'tinysa-web:'

/** A ref that loads its initial value from localStorage and persists on every change, so UI settings survive a page reload. Falls back to `defaultValue` if unset, malformed, or localStorage is unavailable. */
export function persistedRef<T>(key: string, defaultValue: T): Ref<T> {
  const storageKey = `${PREFIX}${key}`
  let initial = defaultValue
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw !== null) initial = JSON.parse(raw) as T
  } catch {
    // malformed storage or localStorage unavailable — keep the default
  }

  const value = ref(initial) as Ref<T>
  watch(value, (next) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // quota exceeded or localStorage unavailable — setting just won't persist
    }
  })
  return value
}
