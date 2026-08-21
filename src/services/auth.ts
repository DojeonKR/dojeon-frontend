export interface ApiResponse<T> {
  isSuccess: boolean
  code: string
  message: string
  data: T
  timestamp: string
  errorCode?: string
}

export interface SendEmailCodeRequest {
  email: string
}

export interface SendEmailCodeData {
  sent: boolean
}

export interface VerifyEmailCodeRequest {
  email: string
  code: string
}

export interface VerifyEmailCodeData {
  verifyToken: string
}

export interface SignupRequest {
  verifyToken: string
  email: string
  password: string
  isTermsAgreed: boolean
  isPrivacyAgreed: boolean
  isAgeVerified: boolean
  isMarketingAgreed: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface GoogleLoginRequest {
  idToken: string
}

export interface AuthTokenData {
  userId: string
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: string
}

export interface GoogleLoginData extends AuthTokenData {
  isNewUser: boolean
}

export interface ReissueTokenRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

export interface LogoutData {
  loggedOut: boolean
}

export interface PasswordResetConfirmRequest {
  email: string
  code: string
  newPassword: string
}

export interface PasswordResetConfirmData {
  reset: boolean
}

export interface NicknameAvailabilityData {
  available: boolean
}

export interface AuthSession extends AuthTokenData {
  email: string
}

export class AuthApiError extends Error {
  status: number
  errorCode?: string
  responseCode?: string

  constructor(message: string, status: number, errorCode?: string, responseCode?: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.errorCode = errorCode
    this.responseCode = responseCode
  }
}

const AUTH_SESSION_KEY = 'dojeon:auth.session'
export const LOGIN_CREDENTIALS_ERROR_MESSAGE =
  'Your ID or password is incorrect. Please enter the correct ID or password.'
const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''
const isMockMode = (import.meta.env.VITE_MOCK_AUTH_API as string | undefined)?.toLowerCase() === 'true'
const mockDelayMs = Number.parseInt((import.meta.env.VITE_MOCK_AUTH_DELAY_MS as string | undefined) ?? '500', 10) || 500
const mockVerificationCode = ((import.meta.env.VITE_MOCK_VERIFICATION_CODE as string | undefined) ?? '123456').trim() || '123456'

const buildEndpoint = (path: string) => (baseUrl ? `${baseUrl}${path}` : path)

const endpoints = {
  sendEmailCode: buildEndpoint('/auth/email/send'),
  verifyEmailCode: buildEndpoint('/auth/email/verify'),
  signup: buildEndpoint('/auth/signup'),
  login: buildEndpoint('/auth/login'),
  googleLogin: buildEndpoint('/auth/google'),
  reissue: buildEndpoint('/auth/reissue'),
  logout: buildEndpoint('/auth/logout'),
  requestPasswordReset: buildEndpoint('/auth/password/reset-request'),
  confirmPasswordReset: buildEndpoint('/auth/password/reset-confirm'),
  checkNickname: buildEndpoint('/auth/check-nickname'),
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const createMockToken = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`

const createMockAuthTokenData = (email: string): AuthTokenData => ({
  userId: normalizeEmail(email) || 'mock-user',
  accessToken: createMockToken('mock-access'),
  refreshToken: createMockToken('mock-refresh'),
  tokenType: 'Bearer',
  expiresIn: '30m',
})

const readStorageItem = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorageItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

const removeStorageItem = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

const parseJsonSafely = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

const isEmptyObject = (value: unknown) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0,
  )

const translateAuthErrorMessage = (message: string) => {
  const normalized = message.trim()

  if (!/[가-힣]/.test(normalized)) {
    return normalized
  }

  if (normalized.includes('이미') && normalized.includes('가입')) {
    return 'This email is already registered.'
  }

  if (normalized.includes('이메일') && normalized.includes('비밀번호')) {
    return LOGIN_CREDENTIALS_ERROR_MESSAGE
  }

  if (normalized.includes('아이디') && normalized.includes('비밀번호')) {
    return LOGIN_CREDENTIALS_ERROR_MESSAGE
  }

  if (normalized.includes('인증') && normalized.includes('만료')) {
    return 'The verification code is invalid or has expired.'
  }

  if (normalized.includes('인증') && normalized.includes('올바르지')) {
    return 'The verification code is incorrect.'
  }

  if (normalized.includes('이메일')) {
    return 'Please enter your email address.'
  }

  if (normalized.includes('닉네임')) {
    return 'Please enter a nickname.'
  }

  return 'The request could not be completed. Please try again.'
}

const getErrorMessage = (payload: ApiResponse<null> | null, response: Response) => {
  if (payload?.errorCode === 'INVALID_CREDENTIALS' || payload?.code === 'INVALID_CREDENTIALS') {
    return LOGIN_CREDENTIALS_ERROR_MESSAGE
  }

  if (payload?.message) {
    return translateAuthErrorMessage(payload.message)
  }

  return `Request failed: ${response.status} ${response.statusText}`
}

const unwrapApiResponse = async <T>(response: Response, emptySuccessData?: T): Promise<T> => {
  const payload = await parseJsonSafely<ApiResponse<T | null>>(response)

  if (response.ok && emptySuccessData !== undefined && (!payload || isEmptyObject(payload))) {
    return emptySuccessData
  }

  if (!response.ok || !payload?.isSuccess) {
    throw new AuthApiError(
      getErrorMessage(payload as ApiResponse<null> | null, response),
      response.status,
      payload?.errorCode,
      payload?.code,
    )
  }

  return payload.data as T
}

const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  emptySuccessData?: T,
): Promise<T> => {
  let response: Response

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new AuthApiError('Network request failed. Please check the server connection.', 0)
  }

  return unwrapApiResponse<T>(response, emptySuccessData)
}

export const getStoredAuthSession = (): AuthSession | null => {
  const raw = readStorageItem(AUTH_SESSION_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (
      !parsed ||
      typeof parsed.email !== 'string' ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string'
    ) {
      return null
    }

    if (!isMockMode && parsed.accessToken.startsWith('mock-access')) {
      removeStorageItem(AUTH_SESSION_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const saveAuthSession = (session: AuthSession) => {
  writeStorageItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export const clearStoredAuthSession = () => {
  removeStorageItem(AUTH_SESSION_KEY)
}

export const buildAuthSession = (
  email: string,
  tokenData: AuthTokenData,
): AuthSession => ({
  email: normalizeEmail(email),
  ...tokenData,
})

export async function requestEmailVerificationCode(email: string): Promise<SendEmailCodeData> {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    throw new AuthApiError('Please enter your email address.', 400)
  }

  if (isMockMode) {
    await wait(mockDelayMs)
    return { sent: true }
  }

  return fetchJson<SendEmailCodeData>(
    endpoints.sendEmailCode,
    {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail } as SendEmailCodeRequest),
    },
    { sent: true },
  )
}

export async function verifyEmailCode(email: string, code: string): Promise<VerifyEmailCodeData> {
  const normalizedEmail = normalizeEmail(email)
  const trimmedCode = code.trim()

  if (!trimmedCode) {
    throw new AuthApiError('Please enter the verification code.', 400)
  }

  if (trimmedCode.length !== 6) {
    throw new AuthApiError('Please enter all 6 digits of the verification code.', 400)
  }

  if (isMockMode) {
    await wait(mockDelayMs)
    if (trimmedCode !== mockVerificationCode) {
      throw new AuthApiError('The verification code is invalid or has expired.', 400, 'INVALID_CODE')
    }

    return {
      verifyToken: `mock-verify-${normalizeEmail(email)}`,
    }
  }

  return fetchJson<VerifyEmailCodeData>(endpoints.verifyEmailCode, {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedEmail,
      code: trimmedCode,
    } as VerifyEmailCodeRequest),
  })
}

export async function signup(payload: SignupRequest): Promise<AuthTokenData> {
  const normalizedEmail = normalizeEmail(payload.email)

  if (isMockMode) {
    await wait(mockDelayMs)
    return createMockAuthTokenData(normalizedEmail)
  }

  return fetchJson<AuthTokenData>(endpoints.signup, {
    method: 'POST',
    headers: {
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      ...payload,
      email: normalizedEmail,
    } satisfies SignupRequest),
  })
}

export async function login(payload: LoginRequest): Promise<AuthTokenData> {
  const normalizedEmail = normalizeEmail(payload.email)

  if (isMockMode) {
    await wait(mockDelayMs)

    if (!normalizedEmail || !payload.password) {
      throw new AuthApiError(
        LOGIN_CREDENTIALS_ERROR_MESSAGE,
        401,
        'INVALID_CREDENTIALS',
      )
    }

    return createMockAuthTokenData(normalizedEmail)
  }

  return fetchJson<AuthTokenData>(endpoints.login, {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedEmail,
      password: payload.password,
    } satisfies LoginRequest),
  })
}

export async function loginWithGoogle(payload: GoogleLoginRequest): Promise<GoogleLoginData> {
  if (isMockMode) {
    await wait(mockDelayMs)
    return {
      ...createMockAuthTokenData('google-user@dojeon.ai'),
      isNewUser: false,
    }
  }

  return fetchJson<GoogleLoginData>(endpoints.googleLogin, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function reissueTokens(payload: ReissueTokenRequest): Promise<AuthTokenData> {
  if (isMockMode) {
    await wait(mockDelayMs)
    return {
      ...createMockAuthTokenData('reissued-user@dojeon.ai'),
      refreshToken: payload.refreshToken || createMockToken('mock-refresh'),
    }
  }

  return fetchJson<AuthTokenData>(endpoints.reissue, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logout(payload: LogoutRequest): Promise<LogoutData> {
  if (isMockMode) {
    await wait(mockDelayMs)
    return { loggedOut: true }
  }

  return fetchJson<LogoutData>(
    endpoints.logout,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { loggedOut: true },
  )
}

export async function requestPasswordReset(email: string): Promise<SendEmailCodeData> {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    throw new AuthApiError('Please enter your email address.', 400)
  }

  if (isMockMode) {
    await wait(mockDelayMs)
    return { sent: true }
  }

  return fetchJson<SendEmailCodeData>(
    endpoints.requestPasswordReset,
    {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail } as SendEmailCodeRequest),
    },
    { sent: true },
  )
}

export async function confirmPasswordReset(
  payload: PasswordResetConfirmRequest,
): Promise<PasswordResetConfirmData> {
  if (isMockMode) {
    await wait(mockDelayMs)

    if (payload.code.trim() !== mockVerificationCode) {
      throw new AuthApiError('The verification code is invalid or has expired.', 400, 'INVALID_CODE')
    }

    return { reset: true }
  }

  return fetchJson<PasswordResetConfirmData>(endpoints.confirmPasswordReset, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      email: normalizeEmail(payload.email),
      code: payload.code.trim(),
    } satisfies PasswordResetConfirmRequest),
  })
}

export async function checkNicknameAvailability(
  nickname: string,
): Promise<NicknameAvailabilityData> {
  const trimmedNickname = nickname.trim()

  if (!trimmedNickname) {
    throw new AuthApiError('Please enter a nickname.', 400)
  }

  if (isMockMode) {
    await wait(mockDelayMs)
    return { available: trimmedNickname.toLowerCase() !== 'admin' }
  }

  const url = new URL(endpoints.checkNickname, window.location.origin)
  url.searchParams.set('nickname', trimmedNickname)

  return fetchJson<NicknameAvailabilityData>(url.toString(), {
    method: 'GET',
  })
}
