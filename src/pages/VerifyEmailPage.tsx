import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import './VerifyEmailPage.css'
import { requestEmailVerificationCode, verifyEmailCode } from '../services/auth'

interface VerifyEmailPageProps {
  onBack: () => void
  email: string
  onVerifySuccess: (verifyToken: string) => Promise<void>
}

function VerifyEmailPage({ onBack, email, onVerifySuccess }: VerifyEmailPageProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [completionError, setCompletionError] = useState('')
  const lastSubmittedCode = useRef('')

  const codeText = code.join('')
  const isCodeComplete = code.every((digit) => digit.length === 1)

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(0, 1)
    const next = [...code]
    next[index] = digit
    setVerifyError('')
    setCompletionError('')
    lastSubmittedCode.current = ''
    setCode(next)

    if (digit && index < code.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    const nextCode = next.join('')
    if (next.every((char) => char.length === 1)) {
      void verifyCode(nextCode)
    }
  }

  const handleCodePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, code.length)
    if (!pasted) {
      return
    }
    e.preventDefault()
    const next = Array.from({ length: code.length }, () => '')
    pasted.split('').forEach((char, idx) => {
      if (idx < code.length) {
        next[idx] = char
      }
    })
    setCode(next)
    setVerifyError('')
    setCompletionError('')
    lastSubmittedCode.current = ''
    if (pasted.length < code.length) {
      inputRefs.current[pasted.length]?.focus()
    } else {
      inputRefs.current[code.length - 1]?.focus()
    }
    if (pasted.length === code.length) {
      void verifyCode(next.join(''))
    }
  }

  const verifyCode = async (nextCode: string) => {
    if (!nextCode || nextCode.length < code.length) {
      return
    }
    if (isVerifying || lastSubmittedCode.current === nextCode) {
      return
    }

    lastSubmittedCode.current = nextCode
    setIsVerifying(true)
    setVerifyError('')
    setCompletionError('')

    let verifyToken = ''
    try {
      const result = await verifyEmailCode(email, nextCode)
      verifyToken = result.verifyToken
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to verify the code.'
      setVerifyError(message)
      lastSubmittedCode.current = ''
      setIsVerifying(false)
      return
    }

    try {
      await onVerifySuccess(verifyToken)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to complete sign up.'
      setCompletionError(message)
      lastSubmittedCode.current = ''
      setIsVerifying(false)
      return
    }

    setIsVerifying(false)
  }

  const handleCodeKeyDown = (
    index: number,
    value: string,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isCodeComplete) {
        void verifyCode(codeText)
      }
      return
    }

    if (e.key === 'Backspace' && !value && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timerText = `${String(minutes)}:${String(seconds).padStart(2, '0')}`
  const isWrongCode = Boolean(verifyError)
  const hasCompletionError = Boolean(completionError)

  const handleResendCode = async () => {
    setIsResending(true)
    setResendError('')

    try {
      await requestEmailVerificationCode(email)
      setCode(Array.from({ length: code.length }, () => ''))
      setVerifyError('')
      setCompletionError('')
      lastSubmittedCode.current = ''
      setRemainingSeconds(120)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to resend the code. Please try again later.'
      setResendError(message)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="verify-email-screen signup-screen">
      <header className="signup-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
          <svg
            className="back-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="signup-title">Verify Email</h1>
      </header>

      <section className="verify-email-content">
        <p className="verify-email-message">
          We’ve sent a verification code to <span className="verify-email-address">{email}</span>
        </p>
        <div className="verify-code-fields" onPaste={handleCodePaste}>
          {code.map((digit, index) => (
            <div className="verify-code-cell" key={index}>
              {!digit && <span className="verify-code-dot" aria-hidden="true">•</span>}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, digit, e)}
                className="verify-code-input"
                aria-label={`Verification code digit ${index + 1}`}
                autoComplete="one-time-code"
                disabled={isVerifying || isResending}
              />
            </div>
          ))}
        </div>
        <p
          className="verify-email-timer"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Code expires in ${timerText}`}
        >
          {timerText}
        </p>
        <div className="verify-email-resend">
          {isVerifying && (
            <p className="field-error verify-email-resend-error">Verifying code...</p>
          )}
          <p className="verify-email-resend-title">
            {isWrongCode
              ? 'Wrong code, please try again'
              : hasCompletionError
                ? 'Unable to complete sign up'
                : 'Didn’t receive the code?'}
          </p>
          {verifyError && <p className="field-error verify-email-resend-error">{verifyError}</p>}
          {completionError && (
            <p className="field-error verify-email-resend-error">{completionError}</p>
          )}
          {resendError && <p className="field-error verify-email-resend-error">{resendError}</p>}
          <button
            type="button"
            className="verify-email-resend-action"
            onClick={handleResendCode}
            disabled={isResending || isVerifying}
          >
            {isResending ? 'Sending...' : 'Resend code'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default VerifyEmailPage
