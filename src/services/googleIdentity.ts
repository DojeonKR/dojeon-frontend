interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      width?: number | string
    },
  ) => void
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

export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void,
  onError: (error: GoogleIdentityError) => void,
): Promise<() => void> {
  if (!googleClientId) {
    throw new GoogleIdentityError('Google login is not configured.')
  }

  await loadGoogleIdentityScript()

  const googleAccountsId = window.google?.accounts?.id
  if (!googleAccountsId) {
    throw new GoogleIdentityError('Google sign-in is not available.')
  }

  let isActive = true
  googleAccountsId.initialize({
    client_id: googleClientId,
    callback: (response) => {
      if (!isActive) return
      if (response.credential) {
        onCredential(response.credential)
        return
      }

      onError(new GoogleIdentityError('Google sign-in did not return a token.'))
    },
  })

  container.replaceChildren()
  googleAccountsId.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: 360,
  })

  return () => {
    isActive = false
    container.replaceChildren()
  }
}
