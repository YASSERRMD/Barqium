import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { consumers, type CreateConsumerBody } from '@/api/client'

const key = (tenantId: string) => ['consumers', tenantId]

export function useConsumers(tenantId: string) {
  return useQuery({
    queryKey: key(tenantId),
    queryFn: () => consumers.list(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateConsumer(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateConsumerBody) => consumers.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useDeleteConsumer(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => consumers.delete(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}
