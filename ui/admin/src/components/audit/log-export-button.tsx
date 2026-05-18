import { Download } from 'lucide-react'
import type { AuditLogEntry } from '@/hooks/use-audit-log'

interface LogExportButtonProps {
  entries: AuditLogEntry[]
  filename?: string
}

function toCsv(entries: AuditLogEntry[]): string {
  const headers = ['id', 'event_type', 'resource_type', 'resource_id', 'actor', 'actor_type', 'created_at']
  const rows = entries.map(e =>
    headers.map(h => {
      const val = (e as Record<string, unknown>)[h]
      const str = val == null ? '' : String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

export function LogExportButton({ entries, filename = 'audit-log.csv' }: LogExportButtonProps) {
  const handleExport = () => {
    const csv = toCsv(entries)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      className="btn-secondary"
      onClick={handleExport}
      disabled={entries.length === 0}
      title={entries.length === 0 ? 'No entries to export' : `Export ${entries.length} entries as CSV`}
    >
      <Download size={14} />
      Export CSV
    </button>
  )
}
