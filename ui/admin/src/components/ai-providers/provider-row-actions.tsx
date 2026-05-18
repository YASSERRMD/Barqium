import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteAiProvider } from '@/hooks/use-ai-providers'
import type { AiProvider } from '@/api/client'

interface ProviderRowActionsProps {
  provider: AiProvider
  onDetail?: () => void
}

export function ProviderRowActions({ provider, onDetail: _onDetail }: ProviderRowActionsProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const deleteMut = useDeleteAiProvider(provider.tenant_id, () =>
    toast({ title: 'Provider deleted', variant: 'success' }),
  )

  const handleDelete = async () => {
    await deleteMut.mutateAsync(provider.id)
    setOpen(false)
  }

  return (
    <>
      <button
        className="btn-ghost btn-xs text-red-400 hover:text-red-600"
        title="Delete provider"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={13} />
      </button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete AI provider"
        description={`This will permanently delete "${provider.name}". Routes using this provider will stop working.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
