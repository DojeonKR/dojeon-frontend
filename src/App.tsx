import { useState } from 'react'
import './App.css'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifySuccessPage from './pages/VerifySuccessPage'
import OnboardingPage from './pages/OnboardingPage'
import HomePage from './pages/HomePage'

const ONBOARDING_COMPLETED_KEY = 'dojeon:onboarding.completed'
const ONBOARDING_PENDING_KEY = 'dojeon:onboarding.pending'

const isOnboardingPending = () => {
  return (
    localStorage.getItem(ONBOARDING_PENDING_KEY) === 'true' &&
    localStorage.getItem(ONBOARDING_COMPLETED_KEY) !== 'true'
  )
}

const setOnboardingPending = (value: boolean) => {
  if (value) {
    localStorage.setItem(ONBOARDING_PENDING_KEY, 'true')
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY)
    return
  }
  localStorage.removeItem(ONBOARDING_PENDING_KEY)
}

const markOnboardingComplete = () => {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
  localStorage.removeItem(ONBOARDING_PENDING_KEY)
}

function App() {
  const [screen, setScreen] = useState<
    'splash' | 'login' | 'signup' | 'verify-email' | 'verify-success'
    | 'onboarding' | 'home'
  >('login')
  const [signupEmail, setSignupEmail] = useState('')

  const handleEnterAfterAuth = () => {
    setScreen(isOnboardingPending() ? 'onboarding' : 'home')
  }

  return (
    <div className="app-root">
      {screen === 'splash' ? (
        <SplashPage />
      ) : screen === 'signup' ? (
        <SignupPage
          onBack={() => setScreen('login')}
          onSignupSuccess={(email) => {
            setSignupEmail(email)
            setOnboardingPending(true)
            setScreen('verify-email')
          }}
        />
      ) : screen === 'verify-email' ? (
        <VerifyEmailPage
          email={signupEmail}
          onBack={() => setScreen('signup')}
          onVerifySuccess={() => setScreen('verify-success')}
        />
      ) : screen === 'verify-success' ? (
        <VerifySuccessPage onStartLearning={handleEnterAfterAuth} />
      ) : screen === 'onboarding' ? (
        <OnboardingPage
          onBack={() => setScreen('login')}
          onComplete={() => {
            markOnboardingComplete()
            setScreen('home')
          }}
        />
      ) : screen === 'home' ? (
        <HomePage />
      ) : (
        <LoginPage
          onSignUp={() => setScreen('signup')}
          onLogin={() => {
            handleEnterAfterAuth()
          }}
        />
      )}
    </div>
  )
}

export default App
