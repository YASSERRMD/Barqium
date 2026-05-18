import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

interface TimeoutBadgeProps {
  timeoutMs: number
}

function formatTimeout(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`
  return `${ms}ms`
}

export function TimeoutBadge({ timeoutMs }: TimeoutBadgeProps) {
  const variant =
    timeoutMs < 1000  ? 'success' :
    timeoutMs < 5000  ? 'warning' :
                        'destructive'

  return (
    <Badge variant={variant} className="gap-1 font-code text-xs">
      <Clock size={10} />
      {formatTimeout(timeoutMs)}
    </Badge>
  )
}
