import './LoginPage.css'

interface LoginPageProps {
  onSignUp: () => void
  onLogin?: () => void
}

function LoginPage({ onSignUp, onLogin }: LoginPageProps) {
  return (
    <main className="login-screen">
      <div className="login-profile" />

      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault()
          onLogin?.()
        }}
      >
        <label className="field-wrap">
          <span className="field-label">Email</span>
          <input type="email" className="field" />
        </label>

        <label className="field-wrap field-wrap-large-gap">
          <span className="field-label">Password</span>
          <input type="password" className="field" />
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
