import { useEffect, useRef, useState } from 'react'

export interface LiveMetrics {
  requestRate: number
  p99Latency: number
  p95Latency: number
  p50Latency: number
  errorRate: number
  connections: number
  timestamp: number
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function generateMetrics(): LiveMetrics {
  return {
    requestRate: Math.round(randomBetween(80, 180)),
    p99Latency:  Math.round(randomBetween(90, 250)),
    p95Latency:  Math.round(randomBetween(50, 120)),
    p50Latency:  Math.round(randomBetween(15, 50)),
    errorRate:   parseFloat(randomBetween(0.5, 5).toFixed(2)),
    connections: Math.round(randomBetween(30, 90)),
    timestamp:   Date.now(),
  }
}

export interface UseLiveMetricsResult {
  current: LiveMetrics
  history: LiveMetrics[]
  connected: boolean
}

const POLL_INTERVAL_MS = 10_000
const HISTORY_SIZE = 20

export function useLiveMetrics(): UseLiveMetricsResult {
  const [current, setCurrent] = useState<LiveMetrics>(generateMetrics)
  const [history, setHistory] = useState<LiveMetrics[]>(() =>
    Array.from({ length: HISTORY_SIZE }, () => generateMetrics()),
  )
  const [connected, setConnected] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setConnected(true)
    timerRef.current = setInterval(() => {
      const next = generateMetrics()
      setCurrent(next)
      setHistory(prev => [...prev.slice(-(HISTORY_SIZE - 1)), next])
    }, POLL_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      setConnected(false)
    }
  }, [])

  return { current, history, connected }
}
