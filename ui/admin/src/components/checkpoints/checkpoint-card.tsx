import { RotateCcw } from 'lucide-react'
import { SequenceBadge } from './sequence-badge'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Checkpoint } from '@/api/client'

interface CheckpointCardProps {
  checkpoint: Checkpoint
  isLatest?: boolean
  onRollback?: (checkpoint: Checkpoint) => void
}

export function CheckpointCard({ checkpoint, isLatest = false, onRollback }: CheckpointCardProps) {
  return (
    <div className={`card p-4 ${isLatest ? 'border-gold/50 dark:border-gold/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <SequenceBadge sequence={checkpoint.sequence} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy dark:text-white truncate">
              {checkpoint.note || `Checkpoint #${checkpoint.sequence}`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDistanceToNow(checkpoint.created_at)} ago
              {isLatest && (
                <span className="ml-2 inline-flex items-center rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">
                  Latest
                </span>
              )}
            </p>
          </div>
        </div>

        {onRollback && !isLatest && (
          <button
            className="btn-secondary btn-sm flex-shrink-0 flex items-center gap-1.5"
            onClick={() => onRollback(checkpoint)}
            title={`Rollback to checkpoint #${checkpoint.sequence}`}
          >
            <RotateCcw size={13} />
            Rollback
          </button>
        )}
      </div>
    </div>
  )
}
