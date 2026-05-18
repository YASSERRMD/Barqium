import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkpoints, type CreateCheckpointBody } from '@/api/client'

const KEY = ['checkpoints']

export function useCheckpoints() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => checkpoints.list(),
  })
}

export function useCreateCheckpoint(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCheckpointBody) => checkpoints.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onSuccess?.()
    },
  })
}

export function useRollbackCheckpoint(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => checkpoints.rollback(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onSuccess?.()
    },
  })
}
