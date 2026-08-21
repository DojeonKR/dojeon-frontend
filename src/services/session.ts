import {
  AuthApiError,
  clearStoredAuthSession,
  getStoredAuthSession,
  reissueTokens,
  saveAuthSession,
} from './auth'

let refreshPromise: Promise<boolean> | null = null

export function getAuthToken(): string | null {
  return getStoredAuthSession()?.accessToken ?? null
}

async function refreshAuthSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const currentSession = getStoredAuthSession()
    if (!currentSession?.refreshToken) return false

    try {
      const tokenData = await reissueTokens({
        refreshToken: currentSession.refreshToken,
      })
      saveAuthSession({
        ...currentSession,
        ...tokenData,
      })
      return true
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        clearStoredAuthSession()
        return false
      }

      throw error
    }
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

function withLatestAccessToken(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers)
  const accessToken = getAuthToken()

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  } else {
    headers.delete('Authorization')
  }

  return { ...init, headers }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  let response = await fetch(input, withLatestAccessToken(init))

  if (response.status !== 401 || !getStoredAuthSession()?.refreshToken) {
    return response
  }

  const refreshed = await refreshAuthSession()
  if (!refreshed) return response

  response = await fetch(input, withLatestAccessToken(init))
  return response
}
