import { useState } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight, MoreHorizontal } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteTenant, useUpdateTenant } from '@/hooks/use-tenants'
import type { Tenant } from '@/api/client'

interface TenantRowActionsProps {
  tenant: Tenant
  onEdit: () => void
}

export function TenantRowActions({ tenant, onEdit }: TenantRowActionsProps) {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { toast } = useToast()

  const deleteMut  = useDeleteTenant(() => toast({ title: 'Tenant deleted', variant: 'success' }))
  const toggleMut  = useUpdateTenant(tenant.id, () =>
    toast({ title: `Tenant ${tenant.enabled ? 'disabled' : 'enabled'}`, variant: 'success' }),
  )

  const handleDelete = async () => {
    await deleteMut.mutateAsync(tenant.id)
    setOpen(false)
  }

  const handleToggle = () => {
    toggleMut.mutate({ enabled: !tenant.enabled })
    setMenuOpen(false)
  }

  return (
    <>
      <div className="relative flex items-center gap-1 justify-end">
        <button
          className="btn-ghost btn-xs"
          title="Edit tenant"
          onClick={() => { onEdit(); setMenuOpen(false) }}
        >
          <Pencil size={13} />
        </button>
        <button
          className="btn-ghost btn-xs"
          title={tenant.enabled ? 'Disable tenant' : 'Enable tenant'}
          onClick={handleToggle}
          disabled={toggleMut.isPending}
        >
          {tenant.enabled ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} className="text-gray-400" />}
        </button>
        <button
          className="btn-ghost btn-xs text-red-400 hover:text-red-600"
          title="Delete tenant"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete tenant"
        description={`This will permanently delete "${tenant.name}" and all associated configuration. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
