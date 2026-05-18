import { useState } from 'react'
import { Activity, Zap, Clock, XCircle, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { StatCard } from '@/components/dashboard/stat-card'
import { Sparkline, MiniBarChart } from '@/components/dashboard/sparkline'
import { cn } from '@/lib/utils'

type Window = '1h' | '6h' | '24h' | '7d'

const WINDOWS: Window[] = ['1h', '6h', '24h', '7d']

function generateFakeData(points: number, base: number, noise: number) {
  return Array.from({ length: points }, () => base + Math.random() * noise - noise / 2)
}

export function MetricsPage() {
  const [window, setWindow] = useState<Window>('1h')

  const reqData  = generateFakeData(20, 120, 40)
  const errData  = generateFakeData(20, 4, 3)
  const latData  = generateFakeData(20, 38, 15)
  const connData = generateFakeData(20, 55, 20)

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        title="Metrics"
        subtitle="Data plane telemetry and request analytics."
        action={
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
        }
      />

      {/* Metric cards with sparklines */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Requests / sec', icon: Zap,      data: reqData,  unit: 'rps', color: 'info'    as const },
            { label: 'P99 Latency',    icon: Clock,     data: latData,  unit: 'ms',  color: 'warning' as const },
            { label: 'Connections',    icon: Activity,  data: connData, unit: '',    color: 'default' as const },
            { label: 'Error Rate',     icon: XCircle,   data: errData,  unit: '%',   color: 'danger'  as const },
          ].map(({ label, icon, data, unit, color }) => (
            <div key={label} className="card p-5 hover:shadow-md transition-shadow">
              <StatCard
                label={label}
                value="—"
                unit={unit}
                icon={icon}
                color={color}
              />
              <div className="mt-3 flex justify-end">
                <Sparkline data={data} width={80} height={28} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Request volume chart */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Request Volume</h2>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-navy dark:text-gold" />
              <span className="text-sm font-semibold text-navy dark:text-white">Requests over time</span>
            </div>
            <span className="text-xs text-gray-400">Last {window}</span>
          </div>
          <div className="relative h-32">
            <div className="flex items-end justify-between h-full gap-1">
              {reqData.map((v, i) => {
                const max = Math.max(...reqData)
                const pct = (v / max) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end">
                    <div
                      className="rounded-t bg-navy/20 dark:bg-gold/20 hover:bg-navy/40 dark:hover:bg-gold/40 transition-colors"
                      style={{ height: `${pct}%` }}
                      title={`${v.toFixed(0)} rps`}
                    />
                  </div>
                )
              })}
            </div>
            <div className="absolute inset-x-0 bottom-0 border-t border-gray-100 dark:border-gray-800" />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Connect the OTLP endpoint to populate live metrics.
            See <code className="font-code text-gray-500">deploy/docker-compose.dev.yml</code>.
          </p>
        </div>
      </section>

      {/* Error breakdown */}
      <section>
        <h2 className="section-title mb-3">Error Breakdown</h2>
        <div className="card p-5">
          <p className="text-sm text-gray-500">
            Error rate breakdown by status code will appear here once OTLP telemetry is connected.
          </p>
        </div>
      </section>
    </div>
  )
}
