import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { wasmPlugins, type CreateWasmPluginBody } from '@/api/client'

const key = (tenantId: string) => ['wasm-plugins', tenantId]

export function useWasmPlugins(tenantId: string) {
  return useQuery({
    queryKey: key(tenantId),
    queryFn: () => wasmPlugins.list(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateWasmPlugin(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateWasmPluginBody) => wasmPlugins.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}

export function useDeleteWasmPlugin(tenantId: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => wasmPlugins.delete(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(tenantId) })
      onSuccess?.()
    },
  })
}
