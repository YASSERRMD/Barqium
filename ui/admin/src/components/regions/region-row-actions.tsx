import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/modal'
import { useDeleteRegion } from '@/hooks/use-regions'
import { useToast } from '@/components/ui/toast'
import type { Region } from '@/api/client'

interface RegionRowActionsProps {
  region: Region
}

export function RegionRowActions({ region }: RegionRowActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const { toast } = useToast()

  const deleteMut = useDeleteRegion(() => {
    toast({ title: `Region "${region.name}" deleted`, variant: 'success' })
    setConfirming(false)
  })

  return (
    <>
      <button
        className="btn-icon text-gray-400 hover:text-red-500 transition-colors"
        onClick={() => setConfirming(true)}
        aria-label={`Delete region ${region.name}`}
        title="Delete region"
      >
        <Trash2 size={15} />
      </button>

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => deleteMut.mutateAsync(region.id)}
        title="Delete Region"
        description={`Are you sure you want to delete "${region.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </>
  )
}
