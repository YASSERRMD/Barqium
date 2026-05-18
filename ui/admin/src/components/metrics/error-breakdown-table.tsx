interface ErrorEntry {
  status: number
  label: string
  count: number
}

interface ErrorBreakdownTableProps {
  errors: ErrorEntry[]
}

const STATUS_COLORS: Record<string, string> = {
  '4': 'bg-amber-400',
  '5': 'bg-red-500',
}

function statusColorClass(status: number): string {
  const prefix = String(status)[0]
  return STATUS_COLORS[prefix] ?? 'bg-gray-400'
}

export function ErrorBreakdownTable({ errors }: ErrorBreakdownTableProps) {
  const total = errors.reduce((sum, e) => sum + e.count, 0)

  if (errors.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">No errors recorded in this window.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="pb-2 text-left text-xs font-semibold text-gray-500 w-16">Status</th>
            <th className="pb-2 text-left text-xs font-semibold text-gray-500">Label</th>
            <th className="pb-2 text-xs font-semibold text-gray-500 w-32">Distribution</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-500 w-16">Count</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-500 w-14">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {errors.sort((a, b) => b.count - a.count).map(err => {
            const pct = total > 0 ? ((err.count / total) * 100).toFixed(1) : '0'
            return (
              <tr key={err.status} className="group">
                <td className="py-2">
                  <span className="font-code font-bold text-xs text-gray-800 dark:text-gray-200">
                    {err.status}
                  </span>
                </td>
                <td className="py-2 text-xs text-gray-600 dark:text-gray-300">{err.label}</td>
                <td className="py-2 px-2">
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${statusColorClass(err.status)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
                <td className="py-2 text-right font-code text-xs text-gray-600 dark:text-gray-300">
                  {err.count.toLocaleString()}
                </td>
                <td className="py-2 text-right font-code text-xs text-gray-500">{pct}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
