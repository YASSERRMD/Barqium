import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiProviders, type CreateAiProviderBody } from '@/api/client'

const key = (tenantId: string) => ['ai-providers', tenantId]

export function useAiProviders(tenantId: string) {
  return useQuery({
    queryKey: key(tenantId),
    queryFn: () => aiProviders.list(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateAiProvider(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAiProviderBody) => aiProviders.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useDeleteAiProvider(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => aiProviders.delete(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}
