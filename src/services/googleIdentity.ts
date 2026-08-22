interface GoogleCredentialResponse {
  credential?: string
}

interface GooglePromptMomentNotification {
  isNotDisplayed?: () => boolean
  isSkippedMoment?: () => boolean
  isDismissedMoment?: () => boolean
  getNotDisplayedReason?: () => string
  getSkippedReason?: () => string
  getDismissedReason?: () => string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    cancel_on_tap_outside?: boolean
  }) => void
  prompt: (momentListener?: (notification: GooglePromptMomentNotification) => void) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId
      }
    }
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'dojeon-google-identity-script'
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const googleClientId = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim()

let scriptPromise: Promise<void> | null = null

export class GoogleIdentityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleIdentityError'
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new GoogleIdentityError('Unable to load Google sign-in.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_IDENTITY_SCRIPT_ID
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new GoogleIdentityError('Unable to load Google sign-in.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return window.atob(padded)
}

export function getEmailFromGoogleIdToken(idToken: string): string {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return ''

    const parsed = JSON.parse(decodeBase64Url(payload)) as { email?: unknown }
    return typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : ''
  } catch {
    return ''
  }
}

export async function requestGoogleIdToken(): Promise<string> {
  if (!googleClientId) {
    throw new GoogleIdentityError('Google login is not configured.')
  }

  await loadGoogleIdentityScript()

  const googleAccountsId = window.google?.accounts?.id
  if (!googleAccountsId) {
    throw new GoogleIdentityError('Google sign-in is not available.')
  }

  return new Promise((resolve, reject) => {
    let settled = false

    const settle = (callback: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      callback()
    }

    const timeoutId = window.setTimeout(() => {
      settle(() => reject(new GoogleIdentityError('Google sign-in timed out. Please try again.')))
    }, 60000)

    googleAccountsId.initialize({
      client_id: googleClientId,
      cancel_on_tap_outside: true,
      callback: (response) => {
        if (response.credential) {
          settle(() => resolve(response.credential as string))
          return
        }

        settle(() => reject(new GoogleIdentityError('Google sign-in did not return a token.')))
      },
    })

    googleAccountsId.prompt((notification) => {
      if (settled) return

      if (notification.isNotDisplayed?.()) {
        const reason = notification.getNotDisplayedReason?.()
        settle(() => reject(new GoogleIdentityError(
          reason ? `Google sign-in is not available: ${reason}.` : 'Google sign-in is not available.',
        )))
        return
      }

      if (notification.isSkippedMoment?.()) {
        const reason = notification.getSkippedReason?.()
        settle(() => reject(new GoogleIdentityError(
          reason ? `Google sign-in was skipped: ${reason}.` : 'Google sign-in was skipped.',
        )))
        return
      }

      if (notification.isDismissedMoment?.()) {
        const reason = notification.getDismissedReason?.()
        if (reason === 'credential_returned') return

        settle(() => reject(new GoogleIdentityError(
          reason ? `Google sign-in was dismissed: ${reason}.` : 'Google sign-in was dismissed.',
        )))
      }
    })
  })
}
