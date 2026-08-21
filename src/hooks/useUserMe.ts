import { useQuery } from '@tanstack/react-query'
import { fetchUserMe, UserApiError } from '../services/user.service.ts'
import type { UserMeData } from '../types/user.types.ts'

interface UseUserMeState {
  data: UserMeData | null
  loading: boolean
  loaded: boolean
  error: UserApiError | null
  refetch: () => Promise<void>
}

export function useUserMe(enabled = true): UseUserMeState {
  const { data, isPending, isSuccess, error, refetch } = useQuery<UserMeData | null, UserApiError>({
    queryKey: ['user', 'me'],
    queryFn: ({ signal }) => fetchUserMe(signal),
    enabled,
  })

  return {
    data: data ?? null,
    loading: enabled && isPending,
    loaded: !enabled || isSuccess,
    error: error ?? null,
    refetch: async () => {
      await refetch()
    },
  }
}
