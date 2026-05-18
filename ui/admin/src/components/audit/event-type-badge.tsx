import { Badge } from '@/components/ui/badge'

interface EventTypeBadgeProps {
  eventType: string
  className?: string
}

function getVariant(eventType: string): 'success' | 'destructive' | 'warning' | 'info' | 'ghost' {
  const lower = eventType.toLowerCase()
  if (lower.includes('create') || lower.includes('add'))    return 'success'
  if (lower.includes('delete') || lower.includes('remove')) return 'destructive'
  if (lower.includes('update') || lower.includes('edit'))   return 'warning'
  if (lower.includes('login')  || lower.includes('auth'))   return 'info'
  return 'ghost'
}

function formatLabel(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function EventTypeBadge({ eventType, className }: EventTypeBadgeProps) {
  const variant = getVariant(eventType)

  return (
    <Badge variant={variant} className={className}>
      {formatLabel(eventType)}
    </Badge>
  )
}
