import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type PingStatus = 'online' | 'offline' | 'checking' | 'unknown'

interface ProviderHealthStatusProps {
  enabled: boolean
  pingStatus?: PingStatus
  className?: string
}

const STATUS_CONFIG: Record<PingStatus, { icon: typeof Wifi; label: string; color: string; pulse: boolean }> = {
  online:   { icon: Wifi,     label: 'Online',   color: 'text-emerald-500', pulse: true  },
  offline:  { icon: WifiOff,  label: 'Offline',  color: 'text-red-400',     pulse: false },
  checking: { icon: Loader2,  label: 'Checking', color: 'text-amber-400',   pulse: false },
  unknown:  { icon: WifiOff,  label: 'Unknown',  color: 'text-gray-300',    pulse: false },
}

export function ProviderHealthStatus({ enabled, pingStatus, className }: ProviderHealthStatusProps) {
  const effectiveStatus: PingStatus = !enabled ? 'offline' : (pingStatus ?? 'unknown')
  const { icon: Icon, label, color, pulse } = STATUS_CONFIG[effectiveStatus]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Icon
        size={12}
        className={cn(color, effectiveStatus === 'checking' && 'animate-spin')}
      />
      <span className={cn('text-xs', color)}>
        {label}
      </span>
      {pulse && enabled && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
    </div>
  )
}
