import { useState } from 'react'
import './LoginPage.css'
import loginCharacter from '../assets/9.png'
import { LOGIN_CREDENTIALS_ERROR_MESSAGE } from '../services/auth'

interface LoginPageProps {
  onSignUp: () => void
  onLogin?: (credentials: { email: string; password: string }) => Promise<void>
  onGoogleLogin?: () => Promise<void>
}

function LoginPage({ onSignUp, onLogin, onGoogleLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <main className="login-screen">
      {loginError ? (
        <div className="login-error-box" role="alert" aria-live="assertive">
          {loginError === LOGIN_CREDENTIALS_ERROR_MESSAGE ? (
            <>
              <span className="login-error-line">Your ID or password is incorrect.</span>
              <span className="login-error-line">Please enter the correct ID or password.</span>
            </>
          ) : (
            loginError
          )}
        </div>
      ) : null}

      <section className="login-brand" aria-label="Dojeon">
        <img className="login-character" src={loginCharacter} alt="" aria-hidden="true" />
        <h1 className="login-brand-title">Dojeon</h1>
      </section>

      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault()

          if (!onLogin || isSubmitting) {
            return
          }

          setIsSubmitting(true)
          setLoginError('')

          try {
            await onLogin({
              email: email.trim(),
              password,
            })
          } catch (error) {
            setLoginError(
              error instanceof Error
                ? error.message
                : LOGIN_CREDENTIALS_ERROR_MESSAGE,
            )
          } finally {
            setIsSubmitting(false)
          }
        }}
      >
        <label className="field-wrap">
          <span className="sr-only">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="field"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setLoginError('')
            }}
            disabled={isSubmitting}
          />
        </label>

        <label className="field-wrap field-wrap-large-gap">
          <span className="sr-only">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className="field"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setLoginError('')
            }}
            disabled={isSubmitting}
          />
        </label>

        <button type="submit" className="btn btn-primary login-btn" disabled={isSubmitting}>
          {isSubmitting ? 'LOGGING IN...' : 'LOG IN'}
        </button>

        <button
          type="button"
          className="btn btn-ghost google-btn"
          disabled={isSubmitting}
          onClick={async () => {
            if (!onGoogleLogin || isSubmitting) return

            setIsSubmitting(true)
            setLoginError('')
            try {
              await onGoogleLogin()
            } catch (error) {
              setLoginError(
                error instanceof Error
                  ? error.message
                  : 'Unable to log in with Google. Please try again.',
              )
            } finally {
              setIsSubmitting(false)
            }
          }}
        >
          Log in with Google
        </button>
      </form>

      <p className="signup-copy">
        Don’t have an account?
        <button type="button" onClick={onSignUp} className="signup-link-btn">
          Sign up
        </button>
      </p>
    </main>
  )
}

export default LoginPage
