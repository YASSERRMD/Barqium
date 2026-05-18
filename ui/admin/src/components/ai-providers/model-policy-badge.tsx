import { Badge } from '@/components/ui/badge'
import { Cpu } from 'lucide-react'

interface ModelPolicyBadgeProps {
  models?: string[]
  maxTokens?: number
  className?: string
}

export function ModelPolicyBadge({ models, maxTokens, className }: ModelPolicyBadgeProps) {
  if (!models?.length && !maxTokens) {
    return (
      <Badge variant="ghost" className={className}>
        <Cpu size={10} />
        No limits
      </Badge>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {models?.slice(0, 2).map(m => (
        <Badge key={m} variant="info" className={`font-code text-xs ${className ?? ''}`}>
          <Cpu size={10} />
          {m}
        </Badge>
      ))}
      {(models?.length ?? 0) > 2 && (
        <Badge variant="ghost" className={className}>+{(models?.length ?? 0) - 2}</Badge>
      )}
      {maxTokens && (
        <Badge variant="warning" className={className}>
          {(maxTokens / 1000).toFixed(0)}k max
        </Badge>
      )}
    </div>
  )
}
