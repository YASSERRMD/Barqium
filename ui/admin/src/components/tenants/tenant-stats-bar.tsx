import { Building2, CheckCircle2, XCircle } from 'lucide-react'
import type { Tenant } from '@/api/client'

interface TenantStatsBarProps {
  tenants: Tenant[]
}

export function TenantStatsBar({ tenants }: TenantStatsBarProps) {
  const total    = tenants.length
  const enabled  = tenants.filter(t => t.enabled).length
  const disabled = total - enabled

  const stats = [
    { label: 'Total',    value: total,    icon: Building2,    color: 'text-navy dark:text-gold' },
    { label: 'Active',   value: enabled,  icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Inactive', value: disabled, icon: XCircle,      color: 'text-gray-400' },
  ]

  return (
    <div className="flex items-center gap-6">
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
