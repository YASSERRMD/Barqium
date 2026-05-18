import { useEffect, useRef, useState } from 'react'

interface MetricsTickerProps {
  value: number
  duration?: number
  className?: string
}

export function MetricsTicker({ value, duration = 600, className }: MetricsTickerProps) {
  const [displayed, setDisplayed] = useState(value)
  const from = useRef(value)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const startVal = from.current

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(startVal + (value - startVal) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
      else from.current = value
    }

    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])

  return (
    <span className={className}>
      {displayed.toLocaleString()}
    </span>
  )
}
