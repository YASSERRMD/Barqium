import { useState, useEffect } from 'react'
import { Activity, Zap, Clock, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { StatCard } from '@/components/dashboard/stat-card'
import { Sparkline } from '@/components/dashboard/sparkline'
import { LiveIndicator } from '@/components/metrics/live-indicator'
import { GaugeChart } from '@/components/metrics/gauge-chart'
import { LatencyHistogram } from '@/components/metrics/latency-histogram'
import { ErrorBreakdownTable } from '@/components/metrics/error-breakdown-table'
import { TopRoutesTable } from '@/components/metrics/top-routes-table'
import { ProviderCostSummary } from '@/components/metrics/provider-cost-summary'
import { CacheHitRate } from '@/components/metrics/cache-hit-rate'
import { useLiveMetrics } from '@/hooks/use-live-metrics'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'latency' | 'errors' | 'ai-cost'
type Window = '1h' | '6h' | '24h' | '7d'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'latency',   label: 'Latency'   },
  { key: 'errors',    label: 'Errors'    },
  { key: 'ai-cost',   label: 'AI Cost'   },
]

const WINDOWS: Window[] = ['1h', '6h', '24h', '7d']

const STORAGE_KEY = 'metrics:timeWindow'

const FAKE_ERRORS = [
  { status: 429, label: 'Too Many Requests',    count: 1230 },
  { status: 502, label: 'Bad Gateway',           count: 87  },
  { status: 500, label: 'Internal Server Error', count: 42  },
  { status: 404, label: 'Not Found',             count: 318 },
  { status: 401, label: 'Unauthorized',          count: 204 },
]

const FAKE_ROUTES = [
  { path: '/api/v1/chat/completions', method: 'POST', requests: 8420, p99: 184 },
  { path: '/api/v1/embeddings',       method: 'POST', requests: 3210, p99: 42  },
  { path: '/api/v1/tenants',          method: 'GET',  requests: 1830, p99: 12  },
  { path: '/api/v1/tenants/:id',      method: 'PATCH',requests: 620,  p99: 28  },
  { path: '/api/v1/routes',           method: 'GET',  requests: 570,  p99: 9   },
]

const FAKE_PROVIDERS = [
  { provider: 'OpenAI GPT-4o',     estimatedCost: 1.2834, tokens: 124_800, deltaPercent:  8.2 },
  { provider: 'Anthropic Claude',  estimatedCost: 0.7621, tokens:  98_200, deltaPercent: -3.1 },
  { provider: 'Cohere Command R+', estimatedCost: 0.1204, tokens:  48_000, deltaPercent:  1.7 },
]

export function MetricsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [window, setWindow] = useState<Window>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (WINDOWS as string[]).includes(stored ?? '') ? (stored as Window) : '1h'
  })

  const { current, history, connected } = useLiveMetrics()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, window)
  }, [window])

  const reqHistory  = history.map(m => m.requestRate)
  const errHistory  = history.map(m => m.errorRate)
  const latHistory  = history.map(m => m.p99Latency)
  const connHistory = history.map(m => m.connections)

  const cacheHitRate   = 73.4
  const totalRequests  = 14250
  const cacheHits      = Math.round(totalRequests * (cacheHitRate / 100))

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        title="Metrics"
        subtitle="Data plane telemetry and request analytics."
        action={
          <div className="flex items-center gap-3">
            <LiveIndicator connected={connected} />
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              {WINDOWS.map(w => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    window === w
                      ? 'bg-navy text-white'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-gold text-navy dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- Overview Tab ---- */}
      {tab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Gauge row */}
          <section>
            <h2 className="section-title mb-4">Live Snapshot</h2>
            <div className="card p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                <GaugeChart value={current.requestRate} max={200} label="Requests/s" unit=" rps" />
                <GaugeChart value={current.p99Latency}  max={300} label="P99 Latency" unit="ms" colorClass="stroke-amber-500" />
                <GaugeChart value={current.connections} max={120} label="Connections" colorClass="stroke-blue-500" />
                <GaugeChart value={current.errorRate}   max={10}  label="Error Rate" unit="%" colorClass="stroke-red-500" />
              </div>
            </div>
          </section>

          {/* Stat cards with sparklines */}
          <section>
            <h2 className="section-title mb-4">Trends</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Requests / sec', icon: Zap,      data: reqHistory,  unit: 'rps', color: 'info'    as const },
                { label: 'P99 Latency',    icon: Clock,     data: latHistory,  unit: 'ms',  color: 'warning' as const },
                { label: 'Connections',    icon: Activity,  data: connHistory, unit: '',    color: 'default' as const },
                { label: 'Error Rate',     icon: XCircle,   data: errHistory,  unit: '%',   color: 'danger'  as const },
              ].map(({ label, icon, data, unit, color }) => (
                <div key={label} className="card p-5 hover:shadow-md transition-shadow">
                  <StatCard label={label} value="—" unit={unit} icon={icon} color={color} />
                  <div className="mt-3 flex justify-end">
                    <Sparkline data={data} width={80} height={28} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top routes */}
          <section>
            <h2 className="section-title mb-4">Top Routes</h2>
            <div className="card p-5">
              <TopRoutesTable routes={FAKE_ROUTES} />
            </div>
          </section>
        </div>
      )}

      {/* ---- Latency Tab ---- */}
      {tab === 'latency' && (
        <div className="space-y-6 animate-fade-in">
          <section>
            <h2 className="section-title mb-4">Latency Percentiles</h2>
            <div className="card p-6">
              <LatencyHistogram
                p50={current.p50Latency}
                p95={current.p95Latency}
                p99={current.p99Latency}
              />
            </div>
          </section>
          <section>
            <h2 className="section-title mb-4">Cache Performance</h2>
            <div className="card p-6">
              <CacheHitRate
                hitRate={cacheHitRate}
                totalRequests={totalRequests}
                cacheHits={cacheHits}
              />
            </div>
          </section>
        </div>
      )}

      {/* ---- Errors Tab ---- */}
      {tab === 'errors' && (
        <div className="space-y-6 animate-fade-in">
          <section>
            <h2 className="section-title mb-4">Error Breakdown</h2>
            <div className="card p-5">
              <ErrorBreakdownTable errors={FAKE_ERRORS} />
            </div>
          </section>
        </div>
      )}

      {/* ---- AI Cost Tab ---- */}
      {tab === 'ai-cost' && (
        <div className="space-y-6 animate-fade-in">
          <section>
            <h2 className="section-title mb-4">Provider Cost Estimate</h2>
            <div className="card p-5 max-w-xl">
              <ProviderCostSummary providers={FAKE_PROVIDERS} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
