import { Globe, Star, Radio } from 'lucide-react'
import type { Region } from '@/api/client'

interface RegionStatsBarProps {
  regions: Region[]
}

export function RegionStatsBar({ regions }: RegionStatsBarProps) {
  const total     = regions.length
  const primary   = regions.filter(r => r.is_primary).length
  const secondary = total - primary

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-navy/8 dark:bg-white/8 flex items-center justify-center flex-shrink-0">
          <Globe size={18} className="text-navy dark:text-gold" />
        </div>
        <div>
          <p className="text-2xl font-bold text-navy dark:text-white leading-none">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Regions</p>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
          <Star size={18} className="text-gold" />
        </div>
        <div>
          <p className="text-2xl font-bold text-navy dark:text-white leading-none">{primary}</p>
          <p className="text-xs text-gray-500 mt-0.5">Primary</p>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
          <Radio size={18} className="text-blue-500" />
        </div>
        <div>
          <p className="text-2xl font-bold text-navy dark:text-white leading-none">{secondary}</p>
          <p className="text-xs text-gray-500 mt-0.5">Secondary</p>
        </div>
      </div>
    </div>
  )
}
