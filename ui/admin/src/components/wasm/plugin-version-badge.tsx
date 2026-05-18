import { Badge } from '@/components/ui/badge'
import { Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PluginVersionBadgeProps {
  version: string
  className?: string
}

function getSemverVariant(version: string): 'success' | 'warning' | 'info' | 'ghost' {
  const major = parseInt(version.split('.')[0] ?? '0', 10)
  if (major === 0) return 'warning'  // pre-release
  if (major >= 2)  return 'success'  // stable
  return 'info'                       // 1.x
}

export function PluginVersionBadge({ version, className }: PluginVersionBadgeProps) {
  const variant = getSemverVariant(version)

  return (
    <Badge variant={variant} className={cn('font-code text-xs', className)}>
      <Tag size={10} />
      v{version}
    </Badge>
  )
}
