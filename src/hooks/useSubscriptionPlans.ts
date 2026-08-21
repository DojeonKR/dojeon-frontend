import { useQuery } from '@tanstack/react-query'
import {
  fetchSubscriptionPlans,
  SubscriptionApiError,
} from '../services/subscription.service.ts'
import type { SubscriptionPlanData } from '../types/subscription.types.ts'

interface UseSubscriptionPlansState {
  data: SubscriptionPlanData | null
  loading: boolean
  error: SubscriptionApiError | null
  refetch: () => Promise<void>
}

export function useSubscriptionPlans(enabled: boolean): UseSubscriptionPlansState {
  const { data, isPending, isFetching, error, refetch } = useQuery<
    SubscriptionPlanData | null,
    SubscriptionApiError
  >({
    queryKey: ['subscription', 'plans'],
    queryFn: ({ signal }) => fetchSubscriptionPlans(signal),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  return {
    data: data ?? null,
    loading: enabled && (isPending || isFetching),
    error: error ?? null,
    refetch: async () => {
      await refetch()
    },
  }
}
