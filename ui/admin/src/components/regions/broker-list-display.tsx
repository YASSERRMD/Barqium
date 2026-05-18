import { cn } from '@/lib/utils'

interface BrokerListDisplayProps {
  kafkaBrokers: string
  className?: string
}

export function BrokerListDisplay({ kafkaBrokers, className }: BrokerListDisplayProps) {
  const brokers = kafkaBrokers
    .split(',')
    .map(b => b.trim())
    .filter(b => b.length > 0)

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {brokers.map((broker, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-code text-gray-600 dark:text-gray-300"
          title={broker}
        >
          {broker}
        </span>
      ))}
      {brokers.length === 0 && (
        <span className="text-xs text-gray-400">No brokers configured</span>
      )}
    </div>
  )
}
