import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from '@/lib/date-utils'

export interface ActivityEvent {
  id: string
  action: string
  resourceType: string
  resourceId: string
  actor: string
  occurredAt: string
  status: 'success' | 'failure'
}

interface RecentActivityProps {
  events?: ActivityEvent[]
  loading?: boolean
  maxItems?: number
}

const resourceColors: Record<string, string> = {
  tenant:   'bg-navy/8 text-navy dark:bg-white/8 dark:text-white',
  upstream: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  route:    'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  policy:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  default:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const colorClass = resourceColors[event.resourceType] ?? resourceColors.default

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5', colorClass)}>
        {event.resourceType.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
          <span className="font-semibold">{event.actor}</span>{' '}
          <span className="text-gray-500">{event.action}</span>{' '}
          <span className="font-medium text-navy dark:text-gold">{event.resourceType}</span>
          {' '}<span className="text-gray-400 font-code text-xs">{event.resourceId.slice(0, 8)}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(event.occurredAt)}</p>
      </div>
      <Badge variant={event.status === 'success' ? 'success' : 'destructive'} className="flex-shrink-0 mt-0.5">
        {event.status}
      </Badge>
    </div>
  )
}

const PLACEHOLDER_EVENTS: ActivityEvent[] = [
  { id: '1', action: 'created', resourceType: 'tenant', resourceId: 'a1b2c3d4', actor: 'admin', occurredAt: new Date(Date.now() - 60_000).toISOString(), status: 'success' },
  { id: '2', action: 'updated', resourceType: 'upstream', resourceId: 'e5f6a7b8', actor: 'admin', occurredAt: new Date(Date.now() - 5 * 60_000).toISOString(), status: 'success' },
  { id: '3', action: 'deleted', resourceType: 'route', resourceId: 'c9d0e1f2', actor: 'admin', occurredAt: new Date(Date.now() - 15 * 60_000).toISOString(), status: 'failure' },
]

export function RecentActivity({ events = PLACEHOLDER_EVENTS, loading, maxItems = 5 }: RecentActivityProps) {
  return (
    <div className="card p-5">
      <h3 className="section-title mb-4">Recent Activity</h3>
      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <Skeleton variant="rectangular" className="w-7 h-7 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="text" className="w-3/4" />
                <Skeleton variant="text" className="w-1/4 h-3" />
              </div>
            </div>
          ))
        : events.slice(0, maxItems).map(e => <ActivityRow key={e.id} event={e} />)
      }
    </div>
  )
}
