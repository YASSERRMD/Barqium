import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tenants, type CreateTenantBody, type UpdateTenantBody } from '@/api/client'

const KEY = ['tenants']

export function useTenants() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => tenants.list({ limit: 100 }),
  })
}

export function useCreateTenant(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTenantBody) => tenants.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onSuccess?.()
    },
  })
}

export function useUpdateTenant(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateTenantBody) => tenants.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onSuccess?.()
    },
  })
}

export function useDeleteTenant(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tenants.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onSuccess?.()
    },
  })
}
