import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { regions } from '@/api/client'

const KEY = ['regions']

export function useRegions() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => regions.list(),
  })
}

export function useCreateRegion(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; kafka_brokers: string; is_primary?: boolean }) =>
      regions.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onSuccess?.()
    },
  })
}

export function useDeleteRegion(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => regions.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onSuccess?.()
    },
  })
}
