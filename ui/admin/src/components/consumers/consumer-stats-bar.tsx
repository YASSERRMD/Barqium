import { Users, CheckCircle2, XCircle, Key } from 'lucide-react'
import type { Consumer } from '@/api/client'

interface ConsumerStatsBarProps {
  consumers: Consumer[]
}

export function ConsumerStatsBar({ consumers }: ConsumerStatsBarProps) {
  const total    = consumers.length
  const enabled  = consumers.filter(c => c.enabled).length
  const disabled = total - enabled
  const withKeys = consumers.filter(c => c.api_key_prefix).length

  const stats = [
    { label: 'Total',    value: total,    icon: Users,        color: 'text-navy dark:text-gold' },
    { label: 'Active',   value: enabled,  icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Inactive', value: disabled, icon: XCircle,      color: 'text-gray-400' },
    { label: 'With Keys', value: withKeys, icon: Key,          color: 'text-amber-500' },
  ]

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <Icon size={14} className={color} />
          <span className="text-sm font-semibold text-navy dark:text-white">{value}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  )
}
