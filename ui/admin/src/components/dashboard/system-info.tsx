import { Cpu, HardDrive, Wifi, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResourceBarProps {
  label: string
  value: number
  max?: number
  unit?: string
  color?: string
}

function ResourceBar({ label, value, max = 100, unit = '%', color = 'bg-navy' }: ResourceBarProps) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color, pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface SystemInfoPanelProps {
  snapshot?: {
    cpuPct?: number
    memPct?: number
    openConnections?: number
    snapshotAgeMs?: number
  }
}

export function SystemInfoPanel({ snapshot }: SystemInfoPanelProps) {
  const items = [
    { icon: Cpu,      label: 'CPU',             value: snapshot?.cpuPct ?? 0,              unit: '%'  },
    { icon: HardDrive,label: 'Memory',          value: snapshot?.memPct ?? 0,              unit: '%'  },
    { icon: Wifi,     label: 'Connections',     value: snapshot?.openConnections ?? 0,     unit: ''   },
    { icon: Database, label: 'Snapshot age',    value: snapshot?.snapshotAgeMs ?? 0,       unit: 'ms' },
  ]

  return (
    <div className="card p-5">
      <h3 className="section-title mb-4">Data Plane</h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map(({ icon: Icon, label, value, unit }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-navy/8 dark:bg-white/8 flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-navy dark:text-gold" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-navy dark:text-white">{value}{unit}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        <ResourceBar label="CPU utilization" value={snapshot?.cpuPct ?? 0} color="bg-navy" />
        <ResourceBar label="Memory pressure" value={snapshot?.memPct ?? 0} color="bg-gold" />
      </div>
      <p className="text-[10px] text-gray-400 mt-3">
        Connect OTLP pipeline to populate live data plane stats.
      </p>
    </div>
  )
}
