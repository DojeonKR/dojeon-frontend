import { useMutation } from '@tanstack/react-query'
import { changeUserPassword, UserApiError } from '../services/user.service'
import type { ChangePasswordData, ChangePasswordPayload } from '../types/user.types'

export function useChangeUserPassword() {
  return useMutation<ChangePasswordData | null, UserApiError, ChangePasswordPayload>({
    // PATCH /user/me/password
    mutationFn: (payload) => changeUserPassword(payload),
  })
}
