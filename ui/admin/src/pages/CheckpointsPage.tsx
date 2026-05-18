import { useState } from 'react'
import { Plus, History, Clock, Archive } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { CheckpointTimeline } from '@/components/checkpoints/checkpoint-timeline'
import { CheckpointCard } from '@/components/checkpoints/checkpoint-card'
import { CheckpointForm } from '@/components/checkpoints/checkpoint-form'
import { RollbackConfirmModal } from '@/components/checkpoints/rollback-confirm-modal'
import { CheckpointDiffViewer } from '@/components/checkpoints/checkpoint-diff-viewer'
import { useCheckpoints, useCreateCheckpoint, useRollbackCheckpoint } from '@/hooks/use-checkpoints'
import { useToast } from '@/components/ui/toast'
import type { Checkpoint } from '@/api/client'

export function CheckpointsPage() {
  const [creating, setCreating]         = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<Checkpoint | null>(null)
  const [expanded, setExpanded]         = useState<string | null>(null)

  const { toast } = useToast()
  const { data: cpList = [], isLoading, isError } = useCheckpoints()

  const sorted = [...cpList].sort((a, b) => b.sequence - a.sequence)

  const createMut = useCreateCheckpoint(() => {
    toast({ title: 'Checkpoint created', variant: 'success' })
    setCreating(false)
  })

  const rollbackMut = useRollbackCheckpoint(() => {
    toast({ title: 'Rollback successful', variant: 'success' })
    setRollbackTarget(null)
  })

  function getPrevious(cp: Checkpoint): Checkpoint | null {
    const idx = sorted.findIndex(c => c.id === cp.id)
    return sorted[idx + 1] ?? null
  }

  return (
    <div className="p-8 max-w-[900px] mx-auto animate-fade-in">
      <PageHeader
        title="Checkpoints"
        subtitle="Snapshot and restore gateway configuration at any point in time."
        action={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> Create Checkpoint
          </button>
        }
      />

      {isError && (
        <div className="card p-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 mb-6">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load checkpoints.</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 h-16 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : cpList.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={History}
            title="No checkpoints yet"
            description="Create a checkpoint to snapshot the current configuration and enable rollback."
            action={
              <button className="btn-primary btn-sm" onClick={() => setCreating(true)}>
                <Plus size={13} /> Create Checkpoint
              </button>
            }
          />
        </div>
      ) : (
        <CheckpointTimeline
          checkpoints={cpList}
          renderItem={(cp, isLatest) => (
            <div className="space-y-2 pb-2">
              <CheckpointCard
                checkpoint={cp}
                isLatest={isLatest}
                onRollback={!isLatest ? (c) => setRollbackTarget(c) : undefined}
              />
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-2"
                onClick={() => setExpanded(expanded === cp.id ? null : cp.id)}
              >
                {expanded === cp.id ? 'Hide diff' : 'Show diff'}
              </button>
              {expanded === cp.id && (
                <CheckpointDiffViewer current={cp} previous={getPrevious(cp)} />
              )}
            </div>
          )}
        />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create Checkpoint"
        description="Snapshot the current configuration state."
        size="md"
      >
        <CheckpointForm
          onSubmit={note => createMut.mutateAsync({ note: note || undefined })}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      {/* Retention info panel */}
      <div className="mt-8 card p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Archive size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-navy dark:text-white text-sm mb-2">Checkpoint Retention</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={13} className="text-gray-400" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Max Retention</p>
                </div>
                <p className="text-sm font-bold text-navy dark:text-white">30 days</p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <History size={13} className="text-gray-400" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Max Checkpoints</p>
                </div>
                <p className="text-sm font-bold text-navy dark:text-white">100</p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Archive size={13} className="text-gray-400" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Stored</p>
                </div>
                <p className="text-sm font-bold text-navy dark:text-white">{cpList.length} / 100</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Checkpoints older than 30 days or exceeding the limit are automatically purged. Pinned checkpoints are excluded from automatic purge.
            </p>
          </div>
        </div>
      </div>

      <RollbackConfirmModal
        open={!!rollbackTarget}
        checkpoint={rollbackTarget}
        onClose={() => setRollbackTarget(null)}
        onConfirm={() => rollbackTarget ? rollbackMut.mutateAsync(rollbackTarget.id) : Promise.resolve()}
        loading={rollbackMut.isPending}
      />
    </div>
  )
}
