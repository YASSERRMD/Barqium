import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { EventTypeBadge } from '@/components/audit/event-type-badge'
import { ActorDisplay } from '@/components/audit/actor-display'
import { AuditLogDetailPanel } from '@/components/audit/audit-log-detail-panel'
import { AuditFilters } from '@/components/audit/audit-filters'
import { LogExportButton } from '@/components/audit/log-export-button'
import { EventIcon } from '@/components/audit/event-icon'
import { useAuditLog, type AuditLogEntry } from '@/hooks/use-audit-log'
import { formatDateTime, formatDistanceToNow } from '@/lib/date-utils'

const PAGE_SIZE = 20

export function AuditLogPage() {
  const [search, setSearch]         = useState('')
  const [eventType, setEventType]   = useState('')
  const [actor, setActor]           = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [page, setPage]             = useState(1)
  const [selected, setSelected]     = useState<AuditLogEntry | null>(null)

  const { data = [], isLoading, isError } = useAuditLog({
    limit: 200,
    event_type: eventType || undefined,
    actor: actor || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  })

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(e =>
      e.resource_type.toLowerCase().includes(q) ||
      e.resource_id?.toLowerCase().includes(q) ||
      e.event_type.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q),
    )
  }, [data, search])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'event',
      header: 'Event',
      cell: e => (
        <button
          className="flex items-center gap-2 text-left hover:text-gold transition-colors"
          onClick={() => setSelected(e)}
        >
          <EventIcon eventType={e.event_type} />
          <div>
            <EventTypeBadge eventType={e.event_type} />
            <p className="text-xs text-gray-400 mt-0.5">{e.resource_type}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      cell: e => <ActorDisplay actor={e.actor} actorType={e.actor_type} />,
    },
    {
      key: 'resource',
      header: 'Resource',
      cell: e => (
        <span className="text-xs font-code text-gray-600 dark:text-gray-400">
          {e.resource_id ? `${e.resource_id.slice(0, 8)}…` : '—'}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      width: '160px',
      cell: e => (
        <span className="text-xs text-gray-500" title={formatDateTime(e.created_at)}>
          {formatDistanceToNow(e.created_at)} ago
        </span>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="Audit Log"
        subtitle="Track all changes and actions across the gateway."
        action={<LogExportButton entries={filtered} />}
      />

      <div className="mb-6">
        <AuditFilters
          search={search}
          eventType={eventType}
          actor={actor}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSearchChange={v => { setSearch(v); setPage(1) }}
          onEventTypeChange={v => { setEventType(v); setPage(1) }}
          onActorChange={v => { setActor(v); setPage(1) }}
          onDateFromChange={v => { setDateFrom(v); setPage(1) }}
          onDateToChange={v => { setDateTo(v); setPage(1) }}
        />
      </div>

      {isError && (
        <div className="card p-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 mb-4">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Audit log endpoint not available yet. This feature requires the audit API to be implemented.
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginated}
        keyFn={e => e.id}
        loading={isLoading}
        emptyTitle={search || eventType || actor || dateFrom || dateTo ? 'No entries match your filters' : 'No audit entries'}
        emptyDescription={!search && !eventType && !actor ? 'Audit entries will appear here as actions are performed.' : undefined}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <AuditLogDetailPanel entry={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
