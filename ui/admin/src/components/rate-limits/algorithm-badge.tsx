import { Badge } from '@/components/ui/badge'
import { Droplets, Activity, LayoutGrid } from 'lucide-react'
import type { RateLimitPolicy } from '@/api/client'

type Algorithm = RateLimitPolicy['algorithm']

interface AlgorithmBadgeProps {
  algorithm: Algorithm
  className?: string
}

const ALGORITHM_CONFIG: Record<Algorithm, {
  variant: 'info' | 'warning' | 'success'
  label: string
  icon: typeof Activity
}> = {
  token_bucket:    { variant: 'info',    label: 'Token Bucket',    icon: Droplets   },
  sliding_window:  { variant: 'warning', label: 'Sliding Window',  icon: Activity   },
  fixed_window:    { variant: 'success', label: 'Fixed Window',    icon: LayoutGrid },
}

export function AlgorithmBadge({ algorithm, className }: AlgorithmBadgeProps) {
  const { variant, label, icon: Icon } = ALGORITHM_CONFIG[algorithm] ?? {
    variant: 'ghost',
    label: algorithm,
    icon: Activity,
  }

  return (
    <Badge variant={variant} className={className}>
      <Icon size={10} />
      {label}
    </Badge>
  )
}
