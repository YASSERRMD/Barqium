import type { ReactNode } from 'react'
import type { Checkpoint } from '@/api/client'

interface CheckpointTimelineProps {
  checkpoints: Checkpoint[]
  renderItem: (checkpoint: Checkpoint, isLatest: boolean) => ReactNode
}

export function CheckpointTimeline({ checkpoints, renderItem }: CheckpointTimelineProps) {
  if (checkpoints.length === 0) return null

  // Sort by sequence descending (latest first)
  const sorted = [...checkpoints].sort((a, b) => b.sequence - a.sequence)

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

      <ol className="space-y-4">
        {sorted.map((cp, idx) => (
          <li key={cp.id} className="relative flex gap-4">
            {/* Timeline node */}
            <div
              className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold font-code ${
                idx === 0
                  ? 'border-gold bg-gold text-white'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400'
              }`}
            >
              {cp.sequence}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {renderItem(cp, idx === 0)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
