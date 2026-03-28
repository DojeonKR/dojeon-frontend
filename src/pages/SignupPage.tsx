import './SignupPage.css'
import { FormEvent, useState } from 'react'

interface SignupPageProps {
  onBack: () => void
}

function SignupPage({ onBack }: SignupPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{
    email: string
    password: string
    confirmPassword: string
  }>({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const validate = () => {
    const nextErrors = {
      email: '',
      password: '',
      confirmPassword: '',
    }
    let hasError = false

    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
      hasError = true
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
      hasError = true
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
      hasError = true
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
      hasError = true
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Password confirmation is required.'
      hasError = true
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Password confirmation does not match.'
      hasError = true
    }

    setErrors(nextErrors)
    return !hasError
  }

  const termItems = [
    {
      text: 'I agree to the Terms of Service and Privacy Policy',
      required: true,
    },
    {
      text: 'I consent to the collection and use of my personal information.',
      required: true,
    },
    {
      text: 'I confirm that I am at least 14 years old,',
      required: true,
    },
    {
      text: 'I agree to receive marketing updates and exclusive offers.',
      required: false,
    },
    {
      text: 'I agree to receive learning reminders.',
      required: false,
    },
  ]

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) {
      return
    }
    setErrors({ email: '', password: '', confirmPassword: '' })
  }

  return (
    <main className="signup-screen">
      <header className="signup-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="뒤로 가기">
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
        <h1 className="signup-title">Sign Up</h1>
      </header>

      <section className="signup-content">
        <form className="signup-form" onSubmit={handleSubmit}>
          <label className="field-wrap">
            <span className="field-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your email"
              className="field"
            />
            <p className="field-error">{errors.email}</p>
          </label>

          <label className="field-wrap">
            <span className="field-label">Create a password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="must be 8 charaters"
              className="field"
            />
            <p className="field-error">{errors.password}</p>
          </label>

          <label className="field-wrap">
            <span className="field-label">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="repeat password"
              className="field"
            />
            <p className="field-error">{errors.confirmPassword}</p>
          </label>

          <div className="terms-list-header">
            <span className="terms-check-icon">✓</span>
            <span className="terms-check-label">Accept all</span>
          </div>

          <div className="terms-divider" />

          <div className="terms-list" aria-label="약관 동의 항목">
            {termItems.map((item) => (
              <div className="terms-list-item" key={item.text}>
                <span className="terms-check-icon">✓</span>
                <span className="terms-list-text">
                  {item.text} <em className={item.required ? 'required' : 'optional'}>{item.required ? '(Required)' : '(Optional)'}</em>
                </span>
              </div>
            ))}
          </div>

          <button type="submit" className="btn register-btn signup-btn">
            Register
          </button>
        </form>
      </section>
    </main>
  )
}

export default SignupPage
