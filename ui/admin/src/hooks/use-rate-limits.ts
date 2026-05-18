import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rateLimitPolicies, type CreateRateLimitPolicyBody } from '@/api/client'

const key = (tenantId: string) => ['rate-limits', tenantId]

export function useRateLimits(tenantId: string) {
  return useQuery({
    queryKey: key(tenantId),
    queryFn: () => rateLimitPolicies.list(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateRateLimit(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRateLimitPolicyBody) => rateLimitPolicies.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useDeleteRateLimit(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rateLimitPolicies.delete(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}
