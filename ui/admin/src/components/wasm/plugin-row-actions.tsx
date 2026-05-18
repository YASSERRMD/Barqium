import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useDeleteWasmPlugin } from '@/hooks/use-wasm-plugins'
import type { WasmPlugin } from '@/api/client'

interface PluginRowActionsProps {
  plugin: WasmPlugin
}

export function PluginRowActions({ plugin }: PluginRowActionsProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const deleteMut = useDeleteWasmPlugin(plugin.tenant_id, () =>
    toast({ title: 'WASM plugin deleted', variant: 'success' }),
  )

  const handleDelete = async () => {
    await deleteMut.mutateAsync(plugin.id)
    setOpen(false)
  }

  return (
    <>
      <button
        className="btn-ghost btn-xs text-red-400 hover:text-red-600"
        title="Delete plugin"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={13} />
      </button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete WASM plugin"
        description={`This will permanently delete the "${plugin.name}" plugin (v${plugin.version}).`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
