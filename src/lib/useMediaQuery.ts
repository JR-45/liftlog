import { useCallback, useSyncExternalStore } from 'react'

/** Gleiche Grenze wie Tailwinds `lg:`. Ab hier zeigt die App die Laptop-Ansicht. */
export const DESKTOP_QUERY = '(min-width: 64rem)'

/** true, solange die Media Query zutrifft. Aktualisiert sich beim Ändern der Fenstergröße. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
