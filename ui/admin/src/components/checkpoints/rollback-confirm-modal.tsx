import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import type { Checkpoint } from '@/api/client'

interface RollbackConfirmModalProps {
  open: boolean
  checkpoint: Checkpoint | null
  onClose: () => void
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function RollbackConfirmModal({
  open,
  checkpoint,
  onClose,
  onConfirm,
  loading = false,
}: RollbackConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-navy dark:text-white">
              Rollback Configuration?
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300">
          <p className="font-semibold mb-1">Warning</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>All changes made after checkpoint <strong>#{checkpoint?.sequence}</strong> will be lost.</li>
            <li>Active routes, consumers, and policies will revert immediately.</li>
            <li>This may cause brief disruption to live traffic.</li>
          </ul>
        </div>

        {checkpoint?.note && (
          <p className="text-xs text-gray-500">
            Rolling back to: <span className="font-medium text-gray-700 dark:text-gray-300">&ldquo;{checkpoint.note}&rdquo;</span>
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Rolling back…' : 'Yes, Rollback'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
