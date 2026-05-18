import { X } from 'lucide-react'
import { ActorDisplay } from './actor-display'
import { EventTypeBadge } from './event-type-badge'
import { formatDateTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { AuditLogEntry } from '@/hooks/use-audit-log'

interface AuditLogDetailPanelProps {
  entry: AuditLogEntry | null
  onClose: () => void
}

interface JsonDiffProps {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

function JsonDiff({ before, after }: JsonDiffProps) {
  if (!before && !after) return null

  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]))

  return (
    <div className="space-y-1">
      {allKeys.map(key => {
        const bVal = before?.[key]
        const aVal = after?.[key]
        const changed = JSON.stringify(bVal) !== JSON.stringify(aVal)

        return (
          <div key={key} className={cn(
            'rounded px-2 py-1 text-xs font-code',
            changed ? 'bg-amber-50 dark:bg-amber-950/50' : '',
          )}>
            <span className="text-gray-500">{key}:</span>{' '}
            {changed ? (
              <span>
                <span className="text-red-500 line-through mr-1">{JSON.stringify(bVal)}</span>
                <span className="text-emerald-600">{JSON.stringify(aVal)}</span>
              </span>
            ) : (
              <span className="text-gray-700 dark:text-gray-300">{JSON.stringify(aVal ?? bVal)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function AuditLogDetailPanel({ entry, onClose }: AuditLogDetailPanelProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity',
          entry ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-250',
          entry ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 1150 }}
      >
        {entry && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <EventTypeBadge eventType={entry.event_type} />
                <p className="text-xs text-gray-500 mt-1">{entry.resource_type}</p>
              </div>
              <button className="btn-icon btn-ghost" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="label mb-2">Actor</p>
                <ActorDisplay actor={entry.actor} actorType={entry.actor_type} />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="label">Entry ID</p>
                  <p className="text-xs font-code text-gray-600 dark:text-gray-400">{entry.id}</p>
                </div>
                {entry.resource_id && (
                  <div>
                    <p className="label">Resource ID</p>
                    <p className="text-xs font-code text-gray-600 dark:text-gray-400">{entry.resource_id}</p>
                  </div>
                )}
                <div>
                  <p className="label">Timestamp</p>
                  <p className="text-sm text-navy dark:text-white">{formatDateTime(entry.created_at)}</p>
                </div>
              </div>

              {(entry.before || entry.after) && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="label mb-3">Changes</p>
                  <JsonDiff before={entry.before} after={entry.after} />
                </div>
              )}

              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="label mb-2">Metadata</p>
                  <pre className="text-xs font-code bg-gray-50 dark:bg-gray-800 rounded-lg p-3 overflow-auto text-gray-700 dark:text-gray-300">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
