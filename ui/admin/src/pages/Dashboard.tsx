import { useQuery } from '@tanstack/react-query'
import { Activity, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Honour VITE_API_URL when set (e.g. staging/prod deployments behind a CDN
// where the API lives on a different origin or sub-path).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

interface HealthResponse {
  status: string
  db: string
  uptime_seconds?: number
}

interface MetricCard {
  label: string
  value: string | number
  unit?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
}

function StatCard({ label, value, unit, icon: Icon, trend }: MetricCard) {
  return (
    <div className="bg-white rounded-lg border p-5 flex items-start gap-4">
      <div className="p-2.5 bg-navy/5 rounded-md">
        <Icon size={18} className="text-navy" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-navy mt-0.5">
          {value}
          {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
        </p>
        {trend && (
          <p
            className={cn(
              'text-xs mt-1',
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400',
            )}
          >
            {trend === 'up' ? 'trending up' : trend === 'down' ? 'trending down' : 'stable'}
          </p>
        )}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: health, isError: healthError } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`)
      if (!res.ok) throw new Error('health check failed')
      return res.json()
    },
    refetchInterval: 10_000,
    retry: false,
  })

  const isHealthy = !healthError && health?.status === 'ok'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gateway health and live request metrics.</p>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Gateway Status
        </h2>
        <div className="bg-white rounded-lg border p-5 flex items-center gap-4">
          {isHealthy ? (
            <>
              <CheckCircle2 size={22} className="text-emerald-500" />
              <div>
                <p className="font-semibold text-navy">Control API healthy</p>
                <p className="text-xs text-gray-500">
                  DB: <span className="text-emerald-600">{health?.db}</span>
                  {health?.uptime_seconds !== undefined && (
                    <> &middot; uptime {Math.round(health.uptime_seconds)}s</>
                  )}
                </p>
              </div>
              <Badge variant="success" className="ml-auto">
                healthy
              </Badge>
            </>
          ) : (
            <>
              <XCircle size={22} className="text-red-500" />
              <div>
                <p className="font-semibold text-navy">Control API unreachable</p>
                <p className="text-xs text-gray-500">
                  Check that the service is running and the proxy is configured.
                </p>
              </div>
              <Badge variant="destructive" className="ml-auto">
                unhealthy
              </Badge>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Data Plane Metrics
          <span className="ml-2 text-gray-300 normal-case font-normal tracking-normal">
            (live metrics available once OTLP pipeline is connected)
          </span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Requests / sec" value="..." icon={Zap} />
          <StatCard label="P99 Latency" value="..." unit="ms" icon={Clock} />
          <StatCard label="Active Connections" value="..." icon={Activity} />
          <StatCard label="Error Rate" value="..." unit="%" icon={XCircle} />
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Connect the OTLP endpoint to populate live metrics. See deploy/docker-compose.dev.yml
          for the Jaeger + OTLP collector setup.
        </p>
      </section>
    </div>
  )
}
