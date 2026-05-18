import { Badge } from '@/components/ui/badge'
import { Building2, User, GitBranch, Globe } from 'lucide-react'
import type { RateLimitPolicy } from '@/api/client'

type Scope = RateLimitPolicy['scope']

interface ScopeBadgeProps {
  scope: Scope
  className?: string
}

const SCOPE_CONFIG: Record<Scope, {
  variant: 'default' | 'info' | 'warning' | 'gold'
  label: string
  icon: typeof Building2
}> = {
  tenant:   { variant: 'default', label: 'Tenant',   icon: Building2 },
  consumer: { variant: 'info',    label: 'Consumer',  icon: User      },
  route:    { variant: 'warning', label: 'Route',     icon: GitBranch },
  ip:       { variant: 'gold',    label: 'IP',        icon: Globe     },
}

export function ScopeBadge({ scope, className }: ScopeBadgeProps) {
  const config = SCOPE_CONFIG[scope]
  if (!config) {
    return <Badge variant="ghost" className={className}>{scope}</Badge>
  }
  const { variant, label, icon: Icon } = config

  return (
    <Badge variant={variant as 'default' | 'info' | 'warning'} className={className}>
      <Icon size={10} />
      {label}
    </Badge>
  )
}
