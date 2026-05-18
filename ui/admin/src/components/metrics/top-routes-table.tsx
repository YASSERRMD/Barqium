interface RouteEntry {
  path: string
  method: string
  requests: number
  p99: number
}

interface TopRoutesTableProps {
  routes: RouteEntry[]
}

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  POST:   'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  PUT:    'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  PATCH:  'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  DELETE: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
}

export function TopRoutesTable({ routes }: TopRoutesTableProps) {
  const maxReqs = Math.max(...routes.map(r => r.requests), 1)

  if (routes.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No route data available.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="pb-2 text-left text-xs font-semibold text-gray-500 w-16">Method</th>
            <th className="pb-2 text-left text-xs font-semibold text-gray-500">Path</th>
            <th className="pb-2 text-xs font-semibold text-gray-500 w-32">Volume</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-500 w-20">Requests</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-500 w-20">p99 (ms)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {routes.map((route, idx) => (
            <tr key={idx}>
              <td className="py-2">
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold font-code ${METHOD_COLORS[route.method] ?? 'bg-gray-100 text-gray-600'}`}>
                  {route.method}
                </span>
              </td>
              <td className="py-2 font-code text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                {route.path}
              </td>
              <td className="py-2 px-2">
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-navy/40 dark:bg-gold/40 transition-all duration-300"
                    style={{ width: `${(route.requests / maxReqs) * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-2 text-right font-code text-xs text-gray-600 dark:text-gray-300">
                {route.requests.toLocaleString()}
              </td>
              <td className="py-2 text-right font-code text-xs text-gray-500">
                {route.p99}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
