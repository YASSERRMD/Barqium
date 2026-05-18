import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteRateLimit } from '@/hooks/use-rate-limits'
import type { RateLimitPolicy } from '@/api/client'

interface RateLimitRowActionsProps {
  policy: RateLimitPolicy
}

export function RateLimitRowActions({ policy }: RateLimitRowActionsProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const deleteMut = useDeleteRateLimit(policy.tenant_id, () =>
    toast({ title: 'Rate limit policy deleted', variant: 'success' }),
  )

  const handleDelete = async () => {
    await deleteMut.mutateAsync(policy.id)
    setOpen(false)
  }

  return (
    <>
      <button
        className="btn-ghost btn-xs text-red-400 hover:text-red-600"
        title="Delete policy"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={13} />
      </button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete rate limit policy"
        description={`This will permanently delete the "${policy.name}" policy.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
