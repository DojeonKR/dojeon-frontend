import './SignupPage.css'
import { FormEvent, useState } from 'react'
import checkIconGray from '../assets/check_icon_gray.svg'
import checkIconGreen from '../assets/check_icon_green.svg'
import checkIconWhite from '../assets/check_icon_white.svg'
import eyeIcon from '../assets/eye.png'
import eyeOffIcon from '../assets/eye-off.png'
import xIcon from '../assets/x_Icon.png'
import { requestEmailVerificationCode } from '../services/auth'

interface SignupPageProps {
  onBack: () => void
  onSignupSuccess: (email: string, password: string) => void
}

function SignupPage({ onBack, onSignupSuccess }: SignupPageProps) {
  const [email, setEmail] = useState('')
  const [isEmailTouched, setIsEmailTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isPasswordTouched, setIsPasswordTouched] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false)
  const [isConfirmPasswordTouched, setIsConfirmPasswordTouched] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ])
  const [errors, setErrors] = useState<{
    email: string
    password: string
    confirmPassword: string
    terms: string
  }>({
    email: '',
    password: '',
    confirmPassword: '',
    terms: '',
  })
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const nextErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      terms: '',
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
    } else if (!isPasswordRulesValid) {
      nextErrors.password = 'Password does not meet all requirements.'
      hasError = true
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Password confirmation is required.'
      hasError = true
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Password confirmation does not match.'
      hasError = true
    }

    if (!acceptedTerms[0] || !acceptedTerms[1] || !acceptedTerms[2]) {
      nextErrors.terms = 'Please agree to all required terms.'
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

  const passwordRules = [
    {
      id: 'length',
      message: '8 charaters required.',
      isSatisfied: password.length >= 8,
    },
    {
      id: 'special',
      message: '1 special character required.',
      isSatisfied: /[^A-Za-z0-9]/.test(password),
    },
    {
      id: 'uppercase',
      message: '1 uppercase required',
      isSatisfied: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      message: '1 lowercase required.',
      isSatisfied: /[a-z]/.test(password),
    },
    {
      id: 'number',
      message: '1 number required.',
      isSatisfied: /[0-9]/.test(password),
    },
  ]

  const isPasswordRulesValid = passwordRules.every((rule) => rule.isSatisfied)
  const isPasswordInvalid =
    (isPasswordTouched && !isPasswordRulesValid) || Boolean(errors.password)
  const isConfirmPasswordMismatch = confirmPassword.length > 0 && confirmPassword !== password
  const isConfirmPasswordInvalid =
    (isConfirmPasswordTouched &&
      (!confirmPassword || isConfirmPasswordMismatch)) ||
    Boolean(errors.confirmPassword)
  const isEmailInvalid = Boolean(errors.email) || (isEmailTouched && !email.trim())

  const isAllAccepted = acceptedTerms.every((value) => value)

  const handleToggleAllTerms = () => {
    const nextValue = !isAllAccepted
    setAcceptedTerms((termItems).map(() => nextValue))
    setErrors((prev) => ({ ...prev, terms: '' }))
  }

  const handleToggleTerm = (idx: number) => {
    setAcceptedTerms((prev) => {
      const next = prev.map((value, index) => (index === idx ? !value : value))
      const hasRequiredError = !next[0] || !next[1] || !next[2]
      setErrors((prevErrors) => ({ ...prevErrors, terms: hasRequiredError ? 'Please agree to all required terms.' : '' }))
      return next
    })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) {
      return
    }
    setSubmitError('')
    setIsSubmitting(true)
    try {
      await requestEmailVerificationCode(email)
      onSignupSuccess(email, password)
      setErrors({ email: '', password: '', confirmPassword: '', terms: '' })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to send verification code. Please try again.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
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
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="signup-title">Sign Up</h1>
      </header>

      <section className="signup-content">
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="signup-field-stack">
            <label className="field-wrap">
              <span className={`field-label ${isEmailInvalid ? 'field-label-error' : ''}`}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors((prev) => ({ ...prev, email: '' }))
                  setSubmitError('')
                }}
                onFocus={() => setIsEmailTouched(false)}
                onBlur={() => setIsEmailTouched(true)}
                placeholder="your email"
                className={`field ${isEmailInvalid ? 'field-error-state' : ''}`}
              />
              {(isEmailTouched || errors.email) && (
                <p className="field-error">
                  {errors.email || (isEmailTouched && !email.trim() ? 'Email is required.' : '')}
                </p>
              )}
            </label>

            <label className="field-wrap">
              <span className={`field-label ${isPasswordInvalid ? 'field-label-error' : ''}`}>
                Create a password
              </span>
              <div className="password-input-wrap">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, password: '' }))
                  }}
                  placeholder="must be 8 charaters"
                  className={`field password-input ${isPasswordInvalid ? 'field-error-state' : ''}`}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => {
                    setIsPasswordFocused(false)
                    setIsPasswordTouched(true)
                  }}
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsPasswordVisible((prev) => !prev)}
                  aria-label={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  <img
                    src={isPasswordVisible ? eyeOffIcon : eyeIcon}
                    alt=""
                    aria-hidden="true"
                    className="password-visibility-icon"
                  />
                </button>
              </div>
              {(isPasswordTouched || isPasswordFocused) ? (
                <ul className="password-requirements" aria-label="비밀번호 조건">
                  {passwordRules.map((rule) => (
                  <li
                    key={rule.id}
                    className={`password-requirement ${rule.isSatisfied ? 'password-requirement-satisfied' : 'password-requirement-unsatisfied'}`}
                  >
                    <span className="password-requirement-icon">{rule.isSatisfied ? '✓' : '✕'}</span>
                    <span className="password-requirement-text">{rule.message}</span>
                  </li>
                  ))}
                </ul>
              ) : null}
              <p className="field-error">{errors.password}</p>
            </label>

            <label className="field-wrap">
              <span
                className={`field-label ${isConfirmPasswordInvalid ? 'field-label-error' : ''}`}
              >
                Confirm password
              </span>
              <div className="password-input-wrap">
                <input
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, confirmPassword: '' }))
                  }}
                  placeholder="repeat password"
                  className={`field ${isConfirmPasswordInvalid ? 'field-error-state' : ''}`}
                  onFocus={() => setIsConfirmPasswordFocused(true)}
                  onBlur={() => {
                    setIsConfirmPasswordFocused(false)
                    setIsConfirmPasswordTouched(true)
                  }}
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                  aria-label={
                    isConfirmPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'
                  }
                >
                  <img
                    src={isConfirmPasswordVisible ? eyeOffIcon : eyeIcon}
                    alt=""
                    aria-hidden="true"
                    className="password-visibility-icon"
                  />
                </button>
              </div>
              {(isConfirmPasswordTouched || isConfirmPasswordFocused) && confirmPassword.length > 0 && (
                <div
                  className={`password-match-message ${isConfirmPasswordMismatch ? 'password-match-message-invalid' : 'password-match-message-valid'}`}
                >
                  <span className="password-match-icon">
                    <img src={isConfirmPasswordMismatch ? xIcon : checkIconGreen} alt="" aria-hidden="true" />
                  </span>
                  <span className="password-match-text">
                    {isConfirmPasswordMismatch ? 'Password do not match.' : 'Password matches.'}
                  </span>
                </div>
              )}
              <p className="field-error">{errors.confirmPassword}</p>
            </label>
          </div>

          <div className="signup-terms-block">
            <div className="terms-list-header">
              <button
                type="button"
                className="terms-check-toggle"
                onClick={handleToggleAllTerms}
                aria-label="모든 약관 동의"
                aria-pressed={isAllAccepted}
              >
                <span
                  className={`terms-check-icon terms-check-icon-all ${isAllAccepted ? 'terms-check-icon-all-checked' : 'terms-check-icon-all-empty'}`}
                >
                  <img
                    src={isAllAccepted ? checkIconWhite : checkIconGray}
                    alt=""
                    className="terms-check-mark"
                    aria-hidden="true"
                  />
                </span>
              </button>
              <span className="terms-check-label">Accept all</span>
            </div>

            <div className="terms-divider" />

              <div className="terms-list" aria-label="약관 동의 항목">
                {termItems.map((item, index) => (
                <div className="terms-list-item" key={item.text}>
                  <button
                    type="button"
                    className="terms-check-toggle"
                    onClick={() => handleToggleTerm(index)}
                    aria-label={item.text}
                    aria-pressed={acceptedTerms[index]}
                  >
                    <span
                      className={`terms-check-icon terms-check-icon-term ${acceptedTerms[index] ? 'terms-check-icon-term-checked' : 'terms-check-icon-term-empty'}`}
                    >
                      <img
                        src={acceptedTerms[index] ? checkIconGreen : checkIconGray}
                        alt=""
                        className="terms-check-mark"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  <span className="terms-list-text">
                    {item.text} <em className={item.required ? 'required' : 'optional'}>{item.required ? '(Required)' : '(Optional)'}</em>
                  </span>
                </div>
              ))}
            </div>
            <p className="field-error terms-error">{errors.terms}</p>
            {submitError && <p className="field-error submit-error">{submitError}</p>}
          </div>

          <button
            type="submit"
            className="btn register-btn signup-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Register'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default SignupPage
