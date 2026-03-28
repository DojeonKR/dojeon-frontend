export interface VerificationCodePayload {
  email: string
}

export interface VerifyCodePayload {
  email: string
  code: string
}

const verificationEndpoint =
  (import.meta.env.VITE_SEND_VERIFICATION_CODE_URL as string | undefined) ||
  '/api/send-verification-code'
const verifyEndpoint =
  (import.meta.env.VITE_VERIFY_VERIFICATION_CODE_URL as string | undefined) ||
  '/api/verify-verification-code'
const isMockMode =
  (import.meta.env.VITE_MOCK_VERIFICATION_API || '').toLowerCase() === 'true'
const mockDelayMs =
  Number.parseInt(import.meta.env.VITE_MOCK_VERIFICATION_DELAY_MS || '500', 10) || 500
const mockVerificationCode =
  (import.meta.env.VITE_MOCK_VERIFICATION_CODE || '1234').trim() || '1234'

export const getVerificationCodeEndpoint = () => verificationEndpoint
export const getVerifyCodeEndpoint = () => verifyEndpoint

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const parseErrorMessage = async (res: Response) => {
  try {
    const data = await res.json()
    if (typeof data?.message === 'string') {
      return data.message
    }
    if (typeof data?.error === 'string') {
      return data.error
    }
  } catch {
    return `요청 실패: ${res.status} ${res.statusText}`
  }

  return `요청 실패: ${res.status} ${res.statusText}`
}

export async function requestEmailVerificationCode(email: string): Promise<void> {
  const trimmedEmail = email.trim()

  if (isMockMode) {
    await wait(mockDelayMs)
    return
  }

  const response = await fetch(verificationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email: trimmedEmail } as VerificationCodePayload),
  })

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    if (response.status === 404 || isMockMode) {
      await wait(mockDelayMs)
      return
    }
    throw new Error(message || 'Failed to send verification code.')
  }

  await response.text().catch(() => '')
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const trimmedEmail = email.trim()
  const trimmedCode = code.trim()

  if (!trimmedCode) {
    throw new Error('인증번호를 입력해 주세요.')
  }

  if (isMockMode) {
    await wait(mockDelayMs)
    if (trimmedCode !== mockVerificationCode) {
      throw new Error('Wrong code, please try again')
    }
    return
  }

  const response = await fetch(verifyEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email: trimmedEmail, code: trimmedCode } as VerifyCodePayload),
  })

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    if (response.status === 404 || isMockMode) {
      await wait(mockDelayMs)
      if (trimmedCode !== mockVerificationCode) {
        throw new Error('Wrong code, please try again')
      }
      return
    }
    throw new Error(message || '인증 코드 확인에 실패했습니다.')
  }

  await response.text().catch(() => '')
}
