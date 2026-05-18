import { cn } from '@/lib/utils'

interface GaugeChartProps {
  value: number
  min?: number
  max: number
  label: string
  unit?: string
  size?: number
  colorClass?: string
  className?: string
}

export function GaugeChart({
  value,
  min = 0,
  max,
  label,
  unit = '',
  size = 120,
  colorClass = 'stroke-navy dark:stroke-gold',
  className,
}: GaugeChartProps) {
  const radius = (size / 2) * 0.8
  const cx = size / 2
  const cy = size / 2

  // Arc spans 180° (semicircle), from 180° to 0° (left to right)
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)))

  // Convert percentage to angle (180° to 0° mapped to 0→180)
  const startAngle = Math.PI
  const endAngle = Math.PI - pct * Math.PI

  function polarToCartesian(angle: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy - radius * Math.sin(angle),
    }
  }

  const startPt = polarToCartesian(startAngle)
  const endPt = polarToCartesian(endAngle)
  const largeArc = pct > 0.5 ? 1 : 0

  const bgStart = polarToCartesian(startAngle)
  const bgEnd   = polarToCartesian(0)

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`} aria-label={label}>
        {/* Background arc */}
        <path
          d={`M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 0 0 ${bgEnd.x} ${bgEnd.y}`}
          fill="none"
          strokeWidth={10}
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={`M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArc} 0 ${endPt.x} ${endPt.y}`}
            fill="none"
            strokeWidth={10}
            className={colorClass}
            strokeLinecap="round"
          />
        )}
      </svg>
      <p className="text-lg font-bold font-code text-navy dark:text-white leading-none">
        {value.toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
