import { useState } from 'react'
import { Plus, Globe } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { RegionForm } from '@/components/regions/region-form'
import { RegionCard } from '@/components/regions/region-card'
import { RegionRowActions } from '@/components/regions/region-row-actions'
import { RegionStatsBar } from '@/components/regions/region-stats-bar'
import { useRegions, useCreateRegion } from '@/hooks/use-regions'
import { useToast } from '@/components/ui/toast'

export function RegionsPage() {
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  const { data: regionList = [], isLoading, isError } = useRegions()

  const createMut = useCreateRegion(() => {
    toast({ title: 'Region created', variant: 'success' })
    setCreating(false)
  })

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="Regions"
        subtitle="Manage multi-region deployments and Kafka replication topology."
        action={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> New Region
          </button>
        }
      />

      {regionList.length > 0 && (
        <div className="mb-6">
          <RegionStatsBar regions={regionList} />
        </div>
      )}

      {isError && (
        <div className="card p-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 mb-6">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load regions.</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 h-40 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : regionList.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Globe}
            title="No regions configured"
            description="Add a region to enable multi-region deployment with Kafka-based replication."
            action={
              <button className="btn-primary btn-sm" onClick={() => setCreating(true)}>
                <Plus size={13} /> New Region
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regionList.map(region => (
            <RegionCard
              key={region.id}
              region={region}
              actions={<RegionRowActions region={region} />}
            />
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New Region"
        description="Add a region to the multi-region topology."
        size="md"
      >
        <RegionForm
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </div>
  )
}
