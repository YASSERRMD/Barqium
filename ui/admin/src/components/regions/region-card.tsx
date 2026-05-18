import { Server } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Region } from '@/api/client'

interface RegionCardProps {
  region: Region
  actions?: React.ReactNode
}

function brokerCount(kafkaBrokers: string): number {
  return kafkaBrokers.split(',').filter(b => b.trim().length > 0).length
}

export function RegionCard({ region, actions }: RegionCardProps) {
  return (
    <div className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-navy/8 dark:bg-white/8 flex items-center justify-center flex-shrink-0">
            <Server size={18} className="text-navy dark:text-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-navy dark:text-white text-sm leading-tight">{region.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {brokerCount(region.kafka_brokers)} broker{brokerCount(region.kafka_brokers) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={region.is_primary ? 'gold' : 'outline'}>
            {region.is_primary ? 'Primary' : 'Secondary'}
          </Badge>
          {actions}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <p className="text-xs text-gray-400 font-code truncate" title={region.kafka_brokers}>
          {region.kafka_brokers}
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Created {formatDistanceToNow(region.created_at)} ago
      </p>
    </div>
  )
}
