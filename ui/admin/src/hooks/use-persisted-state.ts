import { useCallback, useState } from 'react'

/**
 * useState variant that persists the value to localStorage.
 * Falls back gracefully when localStorage is unavailable.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  serialize: (v: T) => string = JSON.stringify,
  deserialize: (raw: string) => T = JSON.parse,
): [T, (value: T) => void] {
  const [state, setStateRaw] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) return deserialize(raw)
    } catch {
      // ignore
    }
    return defaultValue
  })

  const setState = useCallback(
    (value: T) => {
      try {
        localStorage.setItem(key, serialize(value))
      } catch {
        // ignore
      }
      setStateRaw(value)
    },
    [key, serialize],
  )

  return [state, setState]
}
