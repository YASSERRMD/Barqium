import { useState } from 'react'
import { Plus, Globe, GitMerge, Info } from 'lucide-react'
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

      {/* MirrorMaker2 info section */}
      <div className="mt-8 card p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0 mt-0.5">
            <GitMerge size={18} className="text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-navy dark:text-white text-sm">MirrorMaker 2 Replication</h3>
              <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                <Info size={12} /> How it works
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Barqium uses Kafka MirrorMaker 2 to replicate configuration changes across regions in near-real-time.
              Each region receives a copy of the routing and policy config via a dedicated replication group.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Replication Group ID</p>
                <p className="text-xs font-code text-gray-500 dark:text-gray-400">
                  barqium-mm2-{regionList.length > 0 ? regionList.find(r => r.is_primary)?.name ?? 'primary' : 'primary'}-replication
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Active Regions</p>
                <p className="text-xs font-code text-gray-500 dark:text-gray-400">
                  {regionList.length > 0
                    ? regionList.map(r => r.name).join(' → ')
                    : 'No regions configured'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
