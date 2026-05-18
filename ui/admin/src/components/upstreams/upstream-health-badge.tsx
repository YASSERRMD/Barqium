import { Badge } from '@/components/ui/badge'
import type { Upstream } from '@/api/client'

type HealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unknown'

interface UpstreamHealthBadgeProps {
  upstream: Upstream
  status?: HealthStatus
}

const healthConfig: Record<HealthStatus, { variant: 'success' | 'warning' | 'destructive' | 'ghost'; label: string }> = {
  healthy:     { variant: 'success',     label: 'Healthy' },
  degraded:    { variant: 'warning',     label: 'Degraded' },
  unreachable: { variant: 'destructive', label: 'Unreachable' },
  unknown:     { variant: 'ghost',       label: 'Unknown' },
}

export function UpstreamHealthBadge({ upstream, status }: UpstreamHealthBadgeProps) {
  const effectiveStatus: HealthStatus = !upstream.enabled ? 'unknown' : (status ?? 'unknown')
  const { variant, label } = healthConfig[effectiveStatus]

  return (
    <Badge variant={variant} dot>
      {upstream.enabled ? label : 'Disabled'}
    </Badge>
  )
}
