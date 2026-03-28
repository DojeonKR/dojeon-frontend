import { useEffect, useState } from 'react'
import './App.css'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifySuccessPage from './pages/VerifySuccessPage'
import OnboardingPage from './pages/OnboardingPage'
import HomePage from './pages/HomePage'
import PracticePage from './pages/PracticePage'

const ONBOARDING_COMPLETED_KEY = 'dojeon:onboarding.completed'
const ONBOARDING_USERNAME_KEY = 'dojeon:onboarding.username'

const readLocalStorageItem = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeLocalStorageItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage can fail in private mode or restricted environments.
  }
}

const removeLocalStorageItem = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // localStorage can fail in private mode or restricted environments.
  }
}

const markOnboardingComplete = () => {
  writeLocalStorageItem(ONBOARDING_COMPLETED_KEY, 'true')
}

const getOnboardingUsername = () => {
  const stored = readLocalStorageItem(ONBOARDING_USERNAME_KEY)
  return stored && stored.trim().length > 0 ? stored : 'Jinri'
}

const saveOnboardingUsername = (name: string) => {
  writeLocalStorageItem(ONBOARDING_USERNAME_KEY, name)
}

const clearOnboardingStorage = () => {
  removeLocalStorageItem(ONBOARDING_COMPLETED_KEY)
  removeLocalStorageItem(ONBOARDING_USERNAME_KEY)
}

function App() {
  const [screen, setScreen] = useState<
    'splash' | 'login' | 'signup' | 'verify-email' | 'verify-success'
    | 'onboarding' | 'home' | 'practice'
  >('splash')
  const [signupEmail, setSignupEmail] = useState('')
  const [userName, setUserName] = useState(getOnboardingUsername)

  useEffect(() => {
    if (screen !== 'splash') {
      return
    }

    const timer = window.setTimeout(() => {
      setScreen('login')
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [screen])

  const hasCompletedOnboarding =
    readLocalStorageItem(ONBOARDING_COMPLETED_KEY) === 'true'

  const handleEnterAfterAuth = () => {
    if (hasCompletedOnboarding) {
      setScreen('home')
      return
    }

    setScreen('onboarding')
  }

  return (
    <div className="app-root">
      {import.meta.env.DEV ? (
        <button
          type="button"
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 9999,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #d0d0d0',
            background: '#fff',
            color: '#111',
            fontSize: 12,
          }}
          onClick={() => {
            clearOnboardingStorage()
            setUserName('Jinri')
            setScreen('login')
          }}
        >
          Reset onboarding state
        </button>
      ) : null}

      {screen === 'splash' ? (
        <SplashPage />
      ) : screen === 'signup' ? (
        <SignupPage
          onBack={() => setScreen('login')}
          onSignupSuccess={(email) => {
            setSignupEmail(email)
            removeLocalStorageItem(ONBOARDING_COMPLETED_KEY)
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
        <VerifySuccessPage
          onStartLearning={() => {
            setScreen('login')
          }}
        />
      ) : screen === 'onboarding' ? (
        <OnboardingPage
          onBack={() => setScreen('login')}
          onComplete={(values) => {
            const savedName = values.name?.trim() || 'Jinri'
            setUserName(savedName)
            saveOnboardingUsername(savedName)
            markOnboardingComplete()
            setScreen('home')
          }}
        />
      ) : screen === 'home' ? (
        <HomePage
          userName={userName}
          onOpenPractice={() => {
            setScreen('practice')
          }}
        />
      ) : screen === 'practice' ? (
        <PracticePage />
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
