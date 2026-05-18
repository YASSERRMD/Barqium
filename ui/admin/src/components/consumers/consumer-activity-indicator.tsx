import { Clock } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

interface ConsumerActivityIndicatorProps {
  createdAt: string
  className?: string
}

function getAgeVariant(createdAt: string): 'new' | 'recent' | 'old' {
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = ms / (1000 * 60 * 60 * 24)
  if (days < 1)  return 'new'
  if (days < 30) return 'recent'
  return 'old'
}

const AGE_STYLES = {
  new:    'text-emerald-500',
  recent: 'text-amber-500',
  old:    'text-gray-400',
}

export function ConsumerActivityIndicator({ createdAt, className }: ConsumerActivityIndicatorProps) {
  const variant = getAgeVariant(createdAt)

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', AGE_STYLES[variant], className)}>
      <Clock size={11} />
      <span>{formatDistanceToNow(createdAt)} ago</span>
    </span>
  )
}
