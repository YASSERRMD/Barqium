import { useState } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteRoute, useUpdateRoute } from '@/hooks/use-routes'
import type { Route } from '@/api/client'

interface RouteRowActionsProps {
  route: Route
  onEdit: () => void
}

export function RouteRowActions({ route, onEdit }: RouteRowActionsProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const deleteMut = useDeleteRoute(route.tenant_id, () =>
    toast({ title: 'Route deleted', variant: 'success' }),
  )
  const toggleMut = useUpdateRoute(route.tenant_id, route.id, () =>
    toast({ title: `Route ${route.enabled ? 'disabled' : 'enabled'}`, variant: 'success' }),
  )

  const handleDelete = async () => {
    await deleteMut.mutateAsync(route.id)
    setOpen(false)
  }

  const handleToggle = () => {
    toggleMut.mutate({ enabled: !route.enabled })
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        <button
          className="btn-ghost btn-xs"
          title="Edit route"
          onClick={onEdit}
        >
          <Pencil size={13} />
        </button>
        <button
          className="btn-ghost btn-xs"
          title={route.enabled ? 'Disable route' : 'Enable route'}
          onClick={handleToggle}
          disabled={toggleMut.isPending}
        >
          {route.enabled
            ? <ToggleRight size={14} className="text-emerald-500" />
            : <ToggleLeft size={14} className="text-gray-400" />}
        </button>
        <button
          className="btn-ghost btn-xs text-red-400 hover:text-red-600"
          title="Delete route"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete route"
        description={`This will permanently delete the route "${route.method} ${route.path_prefix}".`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
