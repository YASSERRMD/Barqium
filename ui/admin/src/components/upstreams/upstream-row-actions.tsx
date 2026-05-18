import { useState } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteUpstream, useUpdateUpstream } from '@/hooks/use-upstreams'
import type { Upstream } from '@/api/client'

interface UpstreamRowActionsProps {
  upstream: Upstream
  onEdit: () => void
}

export function UpstreamRowActions({ upstream, onEdit }: UpstreamRowActionsProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const deleteMut = useDeleteUpstream(upstream.tenant_id, () =>
    toast({ title: 'Upstream deleted', variant: 'success' }),
  )
  const toggleMut = useUpdateUpstream(upstream.tenant_id, upstream.id, () =>
    toast({ title: `Upstream ${upstream.enabled ? 'disabled' : 'enabled'}`, variant: 'success' }),
  )

  const handleDelete = async () => {
    await deleteMut.mutateAsync(upstream.id)
    setOpen(false)
  }

  const handleToggle = () => {
    toggleMut.mutate({ enabled: !upstream.enabled })
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        <button
          className="btn-ghost btn-xs"
          title="Edit upstream"
          onClick={onEdit}
        >
          <Pencil size={13} />
        </button>
        <button
          className="btn-ghost btn-xs"
          title={upstream.enabled ? 'Disable upstream' : 'Enable upstream'}
          onClick={handleToggle}
          disabled={toggleMut.isPending}
        >
          {upstream.enabled
            ? <ToggleRight size={14} className="text-emerald-500" />
            : <ToggleLeft size={14} className="text-gray-400" />}
        </button>
        <button
          className="btn-ghost btn-xs text-red-400 hover:text-red-600"
          title="Delete upstream"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete upstream"
        description={`This will permanently delete "${upstream.name}". Routes using this upstream will stop working.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
