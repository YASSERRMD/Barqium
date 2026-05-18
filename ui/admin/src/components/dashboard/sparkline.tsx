import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fill?: boolean
  className?: string
}

export function Sparkline({ data, width = 80, height = 32, color = '#C5A55A', fill = true, className }: SparklineProps) {
  if (!data.length) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 2

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + ((max - v) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  const polyline = points.join(' ')
  const area = `${pad},${height - pad} ${polyline} ${width - pad},${height - pad}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
    >
      {fill && (
        <polygon
          points={area}
          fill={color}
          fillOpacity={0.15}
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {points.length > 0 && (() => {
        const last = points[points.length - 1].split(',')
        return (
          <circle
            cx={parseFloat(last[0])}
            cy={parseFloat(last[1])}
            r={2.5}
            fill={color}
          />
        )
      })()}
    </svg>
  )
}

interface MiniBarChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export function MiniBarChart({ data, width = 80, height = 32, color = '#1B2A4A', className }: MiniBarChartProps) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const barW = (width - (data.length - 1) * 2) / data.length

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={cn('overflow-visible', className)}>
      {data.map((v, i) => {
        const barH = (v / max) * height
        const x = i * (barW + 2)
        const y = height - barH
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            fill={color}
            fillOpacity={i === data.length - 1 ? 1 : 0.4}
            rx={1}
          />
        )
      })}
    </svg>
  )
}
