import { useCallback, useEffect, useState } from 'react'

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  const openPalette  = useCallback(() => setOpen(true),  [])
  const closePalette = useCallback(() => setOpen(false), [])
  const toggle       = useCallback(() => setOpen(v => !v), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  return { open, openPalette, closePalette }
}
