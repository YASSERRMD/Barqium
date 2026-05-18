import { useState } from 'react'
import { Trash2, Key } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteConsumer } from '@/hooks/use-consumers'
import type { Consumer } from '@/api/client'

interface ConsumerRowActionsProps {
  consumer: Consumer
  onGenerateKey?: () => void
}

export function ConsumerRowActions({ consumer, onGenerateKey }: ConsumerRowActionsProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const deleteMut = useDeleteConsumer(consumer.tenant_id, () =>
    toast({ title: 'Consumer deleted', variant: 'success' }),
  )

  const handleDelete = async () => {
    await deleteMut.mutateAsync(consumer.id)
    setOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        {onGenerateKey && (
          <button
            className="btn-ghost btn-xs"
            title="Generate API key"
            onClick={onGenerateKey}
          >
            <Key size={13} />
          </button>
        )}
        <button
          className="btn-ghost btn-xs text-red-400 hover:text-red-600"
          title="Delete consumer"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete consumer"
        description={`This will permanently delete "${consumer.name}" and revoke its API keys.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
