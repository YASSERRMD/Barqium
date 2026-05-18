import { Bot, User, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditLogEntry } from '@/hooks/use-audit-log'

interface ActorDisplayProps {
  actor: string
  actorType?: AuditLogEntry['actor_type']
  className?: string
}

function getInitials(actor: string): string {
  return actor
    .split(/[\s._@-]/)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase())
    .join('')
    || actor.slice(0, 2).toUpperCase()
}

const ACTOR_TYPE_ICON = {
  user:    User,
  api_key: Key,
  system:  Bot,
}

const ACTOR_TYPE_BG = {
  user:    'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  api_key: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  system:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function ActorDisplay({ actor, actorType = 'user', className }: ActorDisplayProps) {
  const Icon = ACTOR_TYPE_ICON[actorType]
  const bg   = ACTOR_TYPE_BG[actorType]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', bg)}>
        {actorType === 'system' ? <Icon size={10} /> : getInitials(actor)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-navy dark:text-white truncate max-w-[120px]">{actor}</p>
        <p className="text-xs text-gray-400 capitalize flex items-center gap-0.5">
          <Icon size={9} />
          {actorType.replace('_', ' ')}
        </p>
      </div>
    </div>
  )
}
