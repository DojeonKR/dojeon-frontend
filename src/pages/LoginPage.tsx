import { useState } from 'react'
import './LoginPage.css'

interface LoginPageProps {
  onSignUp: () => void
  onLogin?: (credentials: { email: string; password: string }) => void
}

function LoginPage({ onSignUp, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <main className="login-screen">
      <div className="login-profile" />

      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault()
          onLogin?.({
            email: email.trim(),
            password,
          })
        }}
      >
        <label className="field-wrap">
          <span className="field-label">Email</span>
          <input
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field-wrap field-wrap-large-gap">
          <span className="field-label">Password</span>
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <p className="forgot-password">Forget password?</p>

        <button type="submit" className="btn btn-primary login-btn">
          Login
        </button>

        <button type="button" className="btn btn-ghost google-btn">
          Log in with Google
        </button>
      </form>

      <p className="signup-copy">
        Don't have account?
        <button type="button" onClick={onSignUp} className="signup-link-btn">
          Sign up
        </button>
      </p>
    </main>
  )
}

export default LoginPage
