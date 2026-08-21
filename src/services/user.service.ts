import { authenticatedFetch, getAuthToken } from './session.ts'
import type {
  ApiResponse,
  ChangePasswordData,
  ChangePasswordPayload,
  DeleteUserMeData,
  DeleteUserMePayload,
  PatchUserData,
  PatchUserRequest,
  PatchUserResponse,
  PresignedProfileImagePayload,
  PresignedProfileImageResult,
  UserAchievementsData,
  UserMeData,
  UserMeResponse,
} from '../types/user.types.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class UserApiError extends Error {
  readonly code?: string
  readonly errorCode?: string
  readonly status?: number

  constructor(message: string, code?: string, errorCode?: string, status?: number) {
    super(message)
    this.name = 'UserApiError'
    this.code = code
    this.errorCode = errorCode
    this.status = status
  }
}

function buildHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
  const token = getAuthToken()
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }
}

async function readPatchUserResponse(res: Response): Promise<PatchUserResponse | null> {
  const bodyText = await res.text()

  if (!bodyText.trim()) {
    if (!res.ok) {
      throw new UserApiError(
        `Failed to update profile (HTTP ${res.status})`,
        undefined,
        undefined,
        res.status,
      )
    }

    return null
  }

  try {
    return JSON.parse(bodyText) as PatchUserResponse
  } catch {
    throw new UserApiError(
      `Failed to update profile (HTTP ${res.status})`,
      undefined,
      undefined,
      res.status,
    )
  }
}

async function readUserApiResponse<T>(
  res: Response,
  fallbackMessage: string,
): Promise<ApiResponse<T> | null> {
  const bodyText = await res.text()

  if (!bodyText.trim()) {
    if (!res.ok) {
      throw new UserApiError(fallbackMessage, undefined, undefined, res.status)
    }

    return null
  }

  try {
    return JSON.parse(bodyText) as ApiResponse<T>
  } catch {
    throw new UserApiError(fallbackMessage, undefined, undefined, res.status)
  }
}

async function requestUserApi<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T | null> {
  let res: Response

  try {
    res = await authenticatedFetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildHeaders({
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      }),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new UserApiError(fallbackMessage)
  }

  const body = await readUserApiResponse<T>(res, fallbackMessage)

  if (!res.ok) {
    throw new UserApiError(
      body?.message ?? `${fallbackMessage} (HTTP ${res.status})`,
      body?.code,
      body?.errorCode,
      res.status,
    )
  }

  if (body && !body.isSuccess) {
    throw new UserApiError(body.message ?? 'Request failed', body.code, body.errorCode, res.status)
  }

  return body?.data ?? null
}

export async function fetchUserMe(signal?: AbortSignal): Promise<UserMeData | null> {
  let res: Response

  try {
    res = await authenticatedFetch(`${API_BASE_URL}/user/me`, {
      method: 'GET',
      headers: buildHeaders(),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new UserApiError('Failed to fetch profile')
  }

  let body: UserMeResponse
  try {
    body = (await res.json()) as UserMeResponse
  } catch {
    throw new UserApiError(`Failed to fetch profile (HTTP ${res.status})`, undefined, undefined, res.status)
  }

  if (!res.ok) {
    throw new UserApiError(
      body.message ?? `Failed to fetch profile (HTTP ${res.status})`,
      body.code,
      body.errorCode,
      res.status,
    )
  }

  if (!body.isSuccess) {
    throw new UserApiError(body.message ?? 'Request failed', body.code, body.errorCode, res.status)
  }

  return body.data
}

export async function patchUserMe(payload: PatchUserRequest): Promise<PatchUserData | null> {
  let res: Response

  try {
    res = await authenticatedFetch(`${API_BASE_URL}/user/me`, {
      method: 'PATCH',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new UserApiError('Failed to update profile')
  }

  const body = await readPatchUserResponse(res)

  if (!res.ok) {
    throw new UserApiError(
      body?.message ?? `Failed to update profile (HTTP ${res.status})`,
      body?.code,
      body?.errorCode,
      res.status,
    )
  }

  if (body && !body.isSuccess) {
    throw new UserApiError(body.message ?? 'Request failed', body.code, body.errorCode, res.status)
  }

  return body?.data ?? null
}

export async function deleteUserMe(
  payload: DeleteUserMePayload,
): Promise<DeleteUserMeData | null> {
  return requestUserApi<DeleteUserMeData>(
    '/user/me',
    {
      method: 'DELETE',
      body: JSON.stringify(payload),
    },
    'Failed to delete profile',
  )
}

export async function changeUserPassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordData | null> {
  return requestUserApi<ChangePasswordData>(
    '/user/me/password',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'Failed to change password',
  )
}

export async function fetchUserAchievements(
  signal?: AbortSignal,
): Promise<UserAchievementsData | null> {
  return requestUserApi<UserAchievementsData>(
    '/user/me/achievement',
    { method: 'GET', signal },
    'Failed to fetch achievements',
  )
}

export const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

export async function createProfileImagePresignedUrl(
  payload: PresignedProfileImagePayload,
): Promise<PresignedProfileImageResult | null> {
  return requestUserApi<PresignedProfileImageResult>(
    '/user/me/profileImage/presignedUrl',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Failed to create profile image upload URL',
  )
}
