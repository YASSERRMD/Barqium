import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { routes, type CreateRouteBody, type UpdateRouteBody } from '@/api/client'

const key = (tenantId: string) => ['routes', tenantId]

export function useRoutes(tenantId: string) {
  return useQuery({
    queryKey: key(tenantId),
    queryFn: () => routes.list(tenantId, { limit: 100 }),
    enabled: !!tenantId,
  })
}

export function useCreateRoute(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRouteBody) => routes.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useUpdateRoute(tenantId: string, id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateRouteBody) => routes.update(tenantId, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useDeleteRoute(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => routes.delete(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}
