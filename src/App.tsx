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
import GrammarPracticePage from './pages/GrammarPracticePage'
import ClassPage from './pages/ClassPage'
import SettingPage from './pages/SettingPage'
import AccountInfoPage from './pages/AccountInfoPage'
import PreferencesPage from './pages/PreferencesPage'
import NotebookPage from './pages/NotebookPage'
import VocabularyPage from './pages/VocabularyPage'
import GrammarNotebookPage from './pages/GrammarNotebookPage'

const ONBOARDING_COMPLETED_KEY = 'dojeon:onboarding.completed'
const ONBOARDING_USERNAME_KEY = 'dojeon:onboarding.username'
const ACCOUNT_EMAIL_KEY = 'dojeon:account.email'
const ACCOUNT_PASSWORD_KEY = 'dojeon:account.password'
const ACCOUNT_AGE_RANGE_KEY = 'dojeon:account.ageRange'
const ACCOUNT_PHONE_NUMBER_KEY = 'dojeon:account.phoneNumber'
const ACCOUNT_LANGUAGE_KEY = 'dojeon:account.language'
const ACCOUNT_KOREAN_LEVEL_KEY = 'dojeon:account.koreanLevel'
const ACCOUNT_DAILY_GOAL_KEY = 'dojeon:account.dailyGoal'
const ACCOUNT_KOREAN_GOAL_KEY = 'dojeon:account.koreanGoal'

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
  removeLocalStorageItem(ACCOUNT_EMAIL_KEY)
  removeLocalStorageItem(ACCOUNT_PASSWORD_KEY)
  removeLocalStorageItem(ACCOUNT_AGE_RANGE_KEY)
  removeLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY)
  removeLocalStorageItem(ACCOUNT_LANGUAGE_KEY)
  removeLocalStorageItem(ACCOUNT_KOREAN_LEVEL_KEY)
  removeLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY)
  removeLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY)
}

const getStoredAccountEmail = () => {
  return readLocalStorageItem(ACCOUNT_EMAIL_KEY) ?? ''
}

const getStoredAccountPassword = () => {
  return readLocalStorageItem(ACCOUNT_PASSWORD_KEY) ?? ''
}

const getStoredAgeRange = () => {
  return readLocalStorageItem(ACCOUNT_AGE_RANGE_KEY) ?? ''
}

const getStoredPhoneNumber = () => {
  return readLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY) ?? ''
}

const getStoredLanguage = () => {
  return readLocalStorageItem(ACCOUNT_LANGUAGE_KEY) ?? ''
}

const getStoredKoreanLevel = () => {
  return readLocalStorageItem(ACCOUNT_KOREAN_LEVEL_KEY) ?? ''
}

const getStoredDailyGoal = () => {
  return readLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY) ?? ''
}

const getStoredKoreanGoal = () => {
  return readLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY) ?? ''
}

function App() {
  const [screen, setScreen] = useState<
    'splash' | 'login' | 'signup' | 'verify-email' | 'verify-success'
    | 'onboarding' | 'home' | 'class' | 'practice' | 'grammar-practice' | 'setting'
    | 'account-info' | 'preferences' | 'notebook' | 'vocabulary' | 'notebook-grammar'
  >('splash')
  const [signupEmail, setSignupEmail] = useState(getStoredAccountEmail)
  const [accountPassword, setAccountPassword] = useState(getStoredAccountPassword)
  const [userName, setUserName] = useState(getOnboardingUsername)
  const [ageRange, setAgeRange] = useState(getStoredAgeRange)
  const [phoneNumber, setPhoneNumber] = useState(getStoredPhoneNumber)
  const [language, setLanguage] = useState(getStoredLanguage)
  const [koreanLevel, setKoreanLevel] = useState(getStoredKoreanLevel)
  const [dailyGoal, setDailyGoal] = useState(getStoredDailyGoal)
  const [koreanGoal, setKoreanGoal] = useState(getStoredKoreanGoal)

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
            setSignupEmail('')
            setAccountPassword('')
            setUserName('Jinri')
            setAgeRange('')
            setPhoneNumber('')
            setLanguage('')
            setKoreanLevel('')
            setDailyGoal('')
            setKoreanGoal('')
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
          onSignupSuccess={(email, password) => {
            setSignupEmail(email)
            setAccountPassword(password)
            writeLocalStorageItem(ACCOUNT_EMAIL_KEY, email)
            writeLocalStorageItem(ACCOUNT_PASSWORD_KEY, password)
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
            const savedAgeRange = values.ageRange ?? ''
            const savedLanguage = values.motherLanguage ?? ''
            const savedKoreanLevel = values.koreanLevel ?? ''
            const savedDailyGoal = values.dailyStudyTime ?? ''
            const savedKoreanGoal = values.goal ?? ''
            setUserName(savedName)
            setAgeRange(savedAgeRange)
            setLanguage(savedLanguage)
            setKoreanLevel(savedKoreanLevel)
            setDailyGoal(savedDailyGoal)
            setKoreanGoal(savedKoreanGoal)
            saveOnboardingUsername(savedName)
            writeLocalStorageItem(ACCOUNT_AGE_RANGE_KEY, savedAgeRange)
            writeLocalStorageItem(ACCOUNT_LANGUAGE_KEY, savedLanguage)
            writeLocalStorageItem(ACCOUNT_KOREAN_LEVEL_KEY, savedKoreanLevel)
            writeLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY, savedDailyGoal)
            writeLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY, savedKoreanGoal)
            markOnboardingComplete()
            setScreen('home')
          }}
        />
      ) : screen === 'home' ? (
        <HomePage
          userName={userName}
          onOpenClass={() => {
            setScreen('class')
          }}
          onOpenNotebook={() => {
            setScreen('notebook')
          }}
          onOpenProfile={() => {
            setScreen('setting')
          }}
          onOpenPractice={() => {
            setScreen('practice')
          }}
          onOpenGrammarPractice={() => {
            setScreen('grammar-practice')
          }}
        />
      ) : screen === 'class' ? (
        <ClassPage
          onOpenHome={() => {
            setScreen('home')
          }}
          onOpenPractice={() => {
            setScreen('practice')
          }}
        />
      ) : screen === 'practice' ? (
        <PracticePage
          onBack={() => {
            setScreen('home')
          }}
        />
      ) : screen === 'setting' ? (
        <SettingPage
          onBack={() => {
            setScreen('home')
          }}
          onOpenAccountInfo={() => {
            setScreen('account-info')
          }}
          onOpenPreferences={() => {
            setScreen('preferences')
          }}
        />
      ) : screen === 'account-info' ? (
        <AccountInfoPage
          email={signupEmail}
          username={signupEmail ? signupEmail.split('@')[0] : userName}
          nickname={userName}
          password={accountPassword}
          phoneNumber={phoneNumber}
          ageGroupOrBirthday={ageRange}
          onSave={(values) => {
            const nextNickname = values.nickname.trim() || 'Jinri'
            const nextPassword = values.password
            const nextPhoneNumber = values.phoneNumber.trim()
            const nextAgeGroupOrBirthday = values.ageGroupOrBirthday.trim()

            setUserName(nextNickname)
            setAccountPassword(nextPassword)
            setPhoneNumber(nextPhoneNumber)
            setAgeRange(nextAgeGroupOrBirthday)

            saveOnboardingUsername(nextNickname)
            writeLocalStorageItem(ACCOUNT_PASSWORD_KEY, nextPassword)
            writeLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY, nextPhoneNumber)
            writeLocalStorageItem(ACCOUNT_AGE_RANGE_KEY, nextAgeGroupOrBirthday)
          }}
          onBack={() => {
            setScreen('setting')
          }}
        />
      ) : screen === 'preferences' ? (
        <PreferencesPage
          language={language}
          koreanLevel={koreanLevel}
          dailyGoal={dailyGoal}
          koreanGoal={koreanGoal}
          onSave={(values) => {
            setLanguage(values.language)
            setDailyGoal(values.dailyGoal)
            setKoreanGoal(values.koreanGoal)
            writeLocalStorageItem(ACCOUNT_LANGUAGE_KEY, values.language)
            writeLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY, values.dailyGoal)
            writeLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY, values.koreanGoal)
          }}
          onBack={() => {
            setScreen('setting')
          }}
        />
      ) : screen === 'notebook' ? (
        <NotebookPage
          userName={userName}
          onOpenGrammarNotebook={() => {
            setScreen('notebook-grammar')
          }}
          onOpenVocabulary={() => {
            setScreen('vocabulary')
          }}
          onOpenHome={() => {
            setScreen('home')
          }}
          onOpenClass={() => {
            setScreen('class')
          }}
          onOpenPractice={() => {
            setScreen('practice')
          }}
          onOpenProfile={() => {
            setScreen('setting')
          }}
        />
      ) : screen === 'vocabulary' ? (
        <VocabularyPage
          onBack={() => {
            setScreen('notebook')
          }}
        />
      ) : screen === 'notebook-grammar' ? (
        <GrammarNotebookPage
          onBack={() => {
            setScreen('notebook')
          }}
        />
      ) : screen === 'grammar-practice' ? (
        <GrammarPracticePage
          onBack={() => {
            setScreen('home')
          }}
        />
      ) : (
        <LoginPage
          onSignUp={() => setScreen('signup')}
          onLogin={(credentials) => {
            setSignupEmail(credentials.email)
            setAccountPassword(credentials.password)
            writeLocalStorageItem(ACCOUNT_EMAIL_KEY, credentials.email)
            writeLocalStorageItem(ACCOUNT_PASSWORD_KEY, credentials.password)
            handleEnterAfterAuth()
          }}
        />
      )}
    </div>
  )
}

export default App
