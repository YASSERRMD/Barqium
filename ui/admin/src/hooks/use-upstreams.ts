import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { upstreams, type CreateUpstreamBody, type UpdateUpstreamBody } from '@/api/client'

const key = (tenantId: string) => ['upstreams', tenantId]

export function useUpstreams(tenantId: string) {
  return useQuery({
    queryKey: key(tenantId),
    queryFn: () => upstreams.list(tenantId, { limit: 100 }),
    enabled: !!tenantId,
  })
}

export function useCreateUpstream(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUpstreamBody) => upstreams.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useUpdateUpstream(tenantId: string, id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateUpstreamBody) => upstreams.update(tenantId, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useDeleteUpstream(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => upstreams.delete(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}
