import { cn } from '@/lib/utils'

interface SequenceBadgeProps {
  sequence: number
  className?: string
}

export function SequenceBadge({ sequence, className }: SequenceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded border border-navy/20 dark:border-gray-600',
        'bg-navy/5 dark:bg-gray-800 px-2 py-0.5',
        'font-code text-xs font-bold text-navy dark:text-gray-300',
        'min-w-[2.5rem] flex-shrink-0',
        className,
      )}
      title={`Sequence #${sequence}`}
    >
      #{sequence}
    </span>
  )
}
