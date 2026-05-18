import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Zap, Clock, Activity, XCircle, Building2, Network, Route, Brain } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { StatCard } from '@/components/dashboard/stat-card'
import { GatewayStatusCard } from '@/components/dashboard/gateway-status'
import { QuickActionsBar } from '@/components/dashboard/quick-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { ProviderStatusGrid } from '@/components/dashboard/provider-status-grid'
import { SystemInfoPanel } from '@/components/dashboard/system-info'
import { MetricsTicker } from '@/components/dashboard/metrics-ticker'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

interface HealthResponse {
  status: string
  db: string
  uptime_seconds?: number
}

export function DashboardPage() {
  const qc = useQueryClient()

  const { data: health, isError: healthError, isFetching, dataUpdatedAt } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`)
      if (!res.ok) throw new Error('health check failed')
      return res.json()
    },
    refetchInterval: 15_000,
    retry: false,
  })

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : undefined

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Gateway health and live request metrics."
      />

      {/* Health status */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Gateway Status</h2>
        <GatewayStatusCard
          health={health}
          isError={healthError}
          isLoading={isFetching && !health}
          lastUpdated={lastUpdated}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['health'] })}
        />
      </section>

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Quick Actions</h2>
        <QuickActionsBar />
      </section>

      {/* Metrics overview */}
      <section className="mb-8">
        <h2 className="section-title mb-3">
          Data Plane Metrics
          <span className="ml-2 text-gray-300 normal-case font-normal tracking-normal">
            (live once OTLP pipeline connected)
          </span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Requests / sec"
            value={<MetricsTicker value={0} />}
            icon={Zap}
            color="info"
            trendLabel="+0%"
            trend="neutral"
          />
          <StatCard label="P99 Latency"         value="—" unit="ms"  icon={Clock}    color="warning" />
          <StatCard label="Active Connections"   value="—"            icon={Activity} color="default" />
          <StatCard label="Error Rate"           value="—" unit="%"   icon={XCircle}  color="danger"  />
        </div>
      </section>

      {/* Config summary */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Configuration Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tenants"    value="—" icon={Building2} />
          <StatCard label="Upstreams"  value="—" icon={Network}   />
          <StatCard label="Routes"     value="—" icon={Route}     />
          <StatCard label="AI Providers" value="—" icon={Brain}   />
        </div>
      </section>

      {/* AI provider status */}
      <section className="mb-8">
        <h2 className="section-title mb-3">AI Provider Status</h2>
        <ProviderStatusGrid />
      </section>

      {/* Activity + system info */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <SystemInfoPanel />
        </div>
      </section>
    </div>
  )
}
