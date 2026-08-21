import { useQuery } from '@tanstack/react-query'
import { fetchUserAchievements, UserApiError } from '../services/user.service'
import type { UserAchievementsData } from '../types/user.types'

export function useUserAchievements() {
  return useQuery<UserAchievementsData | null, UserApiError>({
    queryKey: ['user', 'me', 'achievement'],
    // GET /user/me/achievement
    queryFn: ({ signal }) => fetchUserAchievements(signal),
  })
}
