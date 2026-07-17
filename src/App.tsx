import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import './App.css'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import SignupPage, { type SignupSubmission } from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifySuccessPage from './pages/VerifySuccessPage'
import OnboardingPage from './pages/OnboardingPage'
import HomePage from './pages/HomePage'
import PracticePage from './pages/PracticePage'
import GrammarPracticePage, { type PracticeStep } from './pages/GrammarPracticePage'
import ClassPage from './pages/ClassPage'
import SettingPage from './pages/SettingPage'
import AccountInfoPage from './pages/AccountInfoPage'
import PreferencesPage from './pages/PreferencesPage'
import NotebookPage from './pages/NotebookPage'
import VocabularyPage from './pages/VocabularyPage'
import GrammarNotebookPage from './pages/GrammarNotebookPage'
import LessonDetailPage from './pages/LessonDetailPage'
import VocabularyLessonPage from './pages/VocabularyLessonPage'
import ProfileMainPage from './pages/ProfileMainPage'
import ProfileAchievementsPage from './pages/ProfileAchievementsPage'
import { useChangeUserPassword } from './hooks/useChangeUserPassword.ts'
import { useUpdateUserMe } from './hooks/useUpdateUserMe.ts'
import { useUserMe } from './hooks/useUserMe.ts'
import {
  buildAuthSession,
  clearStoredAuthSession,
  getStoredAuthSession,
  login,
  logout,
  saveAuthSession,
  signup,
  type AuthSession,
  type AuthTokenData,
} from './services/auth'

const ONBOARDING_COMPLETED_KEY = 'dojeon:onboarding.completed'
const ONBOARDING_USERNAME_KEY = 'dojeon:onboarding.username'
const ACCOUNT_OWNER_EMAIL_KEY = 'dojeon:account.ownerEmail'
const LEGACY_ACCOUNT_EMAIL_KEY = 'dojeon:account.email'
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

const normalizeStoredEmail = (value: string) => value.trim().toLowerCase()

const clearOnboardingStorage = () => {
  removeLocalStorageItem(ONBOARDING_COMPLETED_KEY)
  removeLocalStorageItem(ONBOARDING_USERNAME_KEY)
  removeLocalStorageItem(ACCOUNT_OWNER_EMAIL_KEY)
  removeLocalStorageItem(LEGACY_ACCOUNT_EMAIL_KEY)
  removeLocalStorageItem(ACCOUNT_AGE_RANGE_KEY)
  removeLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY)
  removeLocalStorageItem(ACCOUNT_LANGUAGE_KEY)
  removeLocalStorageItem(ACCOUNT_KOREAN_LEVEL_KEY)
  removeLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY)
  removeLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY)
}

const syncLocalAccountOwner = (email: string) => {
  const normalizedEmail = normalizeStoredEmail(email)
  const currentOwner = normalizeStoredEmail(
    readLocalStorageItem(ACCOUNT_OWNER_EMAIL_KEY) ??
      readLocalStorageItem(LEGACY_ACCOUNT_EMAIL_KEY) ??
      '',
  )
  const didSwitchAccount = Boolean(currentOwner && currentOwner !== normalizedEmail)

  if (didSwitchAccount) {
    clearOnboardingStorage()
  }

  if (normalizedEmail) {
    writeLocalStorageItem(ACCOUNT_OWNER_EMAIL_KEY, normalizedEmail)
  }

  return didSwitchAccount
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

const getOptionalString = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const getOptionalNumber = (value: string) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

const getBirthdayOrAgeGroupPayload = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return {}

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { birthday: trimmed }
  }

  return { ageGroup: trimmed }
}

type Screen =
  | 'splash' | 'login' | 'signup' | 'verify-email' | 'verify-success'
  | 'onboarding' | 'home' | 'class' | 'practice' | 'grammar-practice' | 'setting'
  | 'account-info' | 'preferences' | 'notebook' | 'vocabulary' | 'notebook-grammar'
  | 'lesson-detail' | 'vocabulary-lesson' | 'profile-main' | 'profile-achievements'

const devPreviewScreens = new Set<Screen>([
  'splash',
  'login',
  'signup',
  'verify-email',
  'verify-success',
  'onboarding',
  'home',
  'class',
  'practice',
  'grammar-practice',
  'setting',
  'account-info',
  'preferences',
  'notebook',
  'vocabulary',
  'notebook-grammar',
  'lesson-detail',
  'vocabulary-lesson',
  'profile-main',
  'profile-achievements',
])

const devPreviewPracticeSteps = new Set<PracticeStep>([
  'choice',
  'fill-intro',
  'fill',
  'make-intro',
  'make',
  'review',
  'reading',
  'listening',
  'next-grammar',
  'next-grammar-rules',
])

const devPreviewVocabularyViews = new Set(['intro', 'card', 'table', 'flashcards'])

const getDevSearchParams = () => new URLSearchParams(window.location.search)

const getDevPreviewScreen = (): Screen | null => {
  if (!import.meta.env.DEV) {
    return null
  }

  const previewScreen = getDevSearchParams().get('screen') as Screen | null
  return previewScreen && devPreviewScreens.has(previewScreen) ? previewScreen : null
}

const getInitialScreen = (): Screen => {
  return getDevPreviewScreen() ?? 'splash'
}

const getInitialLessonId = () => {
  return getDevPreviewScreen() === 'lesson-detail' ? -105 : null
}

const getInitialPracticeStep = (): PracticeStep => {
  if (getDevPreviewScreen() !== 'grammar-practice') {
    return 'choice'
  }

  const step = getDevSearchParams().get('step') as PracticeStep | null
  return step && devPreviewPracticeSteps.has(step) ? step : 'choice'
}

const getInitialVocabularyLessonView = () => {
  if (getDevPreviewScreen() !== 'vocabulary-lesson') {
    return undefined
  }

  const view = getDevSearchParams().get('view')
  return view && devPreviewVocabularyViews.has(view) ? view as 'intro' | 'card' | 'table' | 'flashcards' : undefined
}

const getInitialVocabularyCardIndex = () => {
  if (getDevPreviewScreen() !== 'vocabulary-lesson') {
    return undefined
  }

  const card = Number.parseInt(getDevSearchParams().get('card') ?? '', 10)
  return Number.isFinite(card) ? Math.max(0, card - 1) : undefined
}

const getDevPreviewCourseOrder = () => {
  if (getDevPreviewScreen() !== 'class') {
    return undefined
  }

  const course = Number.parseInt(getDevSearchParams().get('course') ?? '', 10)
  return Number.isFinite(course) ? Math.max(1, course) : undefined
}

const getDevPreviewLessonModuleOrder = () => {
  if (getDevPreviewScreen() !== 'lesson-detail') {
    return undefined
  }

  const module = Number.parseInt(getDevSearchParams().get('module') ?? '', 10)
  return Number.isFinite(module) ? Math.max(1, module) : undefined
}

function App() {
  const queryClient = useQueryClient()
  const updateUserMe = useUpdateUserMe()
  const changeUserPassword = useChangeUserPassword()
  const [screen, setScreen] = useState<Screen>(getInitialScreen)
  const [authSession, setAuthSession] = useState<AuthSession | null>(getStoredAuthSession)
  const [pendingSignup, setPendingSignup] = useState<SignupSubmission | null>(null)
  const [userName, setUserName] = useState(getOnboardingUsername)
  const [ageRange, setAgeRange] = useState(getStoredAgeRange)
  const [phoneNumber, setPhoneNumber] = useState(getStoredPhoneNumber)
  const [language, setLanguage] = useState(getStoredLanguage)
  const [koreanLevel, setKoreanLevel] = useState(getStoredKoreanLevel)
  const [dailyGoal, setDailyGoal] = useState(getStoredDailyGoal)
  const [koreanGoal, setKoreanGoal] = useState(getStoredKoreanGoal)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [selectedLessonNumericId, setSelectedLessonNumericId] = useState<number | null>(
    getInitialLessonId,
  )
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [grammarPracticeInitialStep, setGrammarPracticeInitialStep] = useState<PracticeStep>(
    getInitialPracticeStep,
  )
  const [grammarPracticeBackScreen, setGrammarPracticeBackScreen] = useState<
    'home' | 'class' | 'lesson-detail'
  >('home')
  const [vocabularyLessonBackScreen, setVocabularyLessonBackScreen] = useState<
    'class' | 'lesson-detail'
  >(
    'class',
  )
  const [settingBackScreen, setSettingBackScreen] = useState<'home' | 'profile-main'>('home')
  const { data: userMeData } = useUserMe(Boolean(authSession))

  const currentEmail = authSession?.email ?? pendingSignup?.email ?? ''
  const currentUsername = currentEmail ? currentEmail.split('@')[0] : userName
  const isPushNotificationOn = userMeData?.profile.isPushNotificationOn ?? true
  const isDevPreview = getDevPreviewScreen() !== null

  const resetLocalProfileState = () => {
    setUserName('Jinri')
    setAgeRange('')
    setPhoneNumber('')
    setLanguage('')
    setKoreanLevel('')
    setDailyGoal('')
    setKoreanGoal('')
  }

  const clearAccountScopedQueries = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['user', 'me'] })
    queryClient.removeQueries({ queryKey: ['home'] })
    queryClient.removeQueries({ queryKey: ['learning'] })
    queryClient.removeQueries({ queryKey: ['section'] })
    queryClient.removeQueries({ queryKey: ['scrap'] })
    queryClient.removeQueries({ queryKey: ['subscription'] })
    queryClient.removeQueries({ queryKey: ['user', 'me', 'achievement'] })
  }, [queryClient])

  const handleUnauthorized = useCallback(() => {
    clearStoredAuthSession()
    clearAccountScopedQueries()
    setAuthSession(null)
    setPendingSignup(null)
    setSettingBackScreen('home')
    setScreen('login')
  }, [clearAccountScopedQueries])

  const hasCompletedOnboarding =
    readLocalStorageItem(ONBOARDING_COMPLETED_KEY) === 'true'

  const handleEnterAfterAuth = () => {
    if (hasCompletedOnboarding) {
      setScreen('home')
      return
    }

    setScreen('onboarding')
  }

  const persistAuthSession = (email: string, tokenData: AuthTokenData) => {
    const didSwitchAccount = syncLocalAccountOwner(email)

    if (didSwitchAccount) {
      clearAccountScopedQueries()
      resetLocalProfileState()
    }

    const nextSession = buildAuthSession(email, tokenData)
    saveAuthSession(nextSession)
    setAuthSession(nextSession)
  }

  useEffect(() => {
    if (screen !== 'splash') {
      return
    }

    const timer = window.setTimeout(() => {
      if (authSession) {
        setScreen(hasCompletedOnboarding ? 'home' : 'onboarding')
        return
      }

      setScreen('login')
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [authSession, hasCompletedOnboarding, screen])

  useEffect(() => {
    if (!authSession?.email) {
      return
    }

    const didSwitchAccount = syncLocalAccountOwner(authSession.email)

    if (didSwitchAccount) {
      const timer = window.setTimeout(() => {
        clearAccountScopedQueries()
        resetLocalProfileState()
      }, 0)

      return () => {
        window.clearTimeout(timer)
      }
    }
  }, [authSession?.email, clearAccountScopedQueries])

  useEffect(() => {
    if (!authSession || !userMeData) {
      return
    }

    const nextName = userMeData.profile.nickname?.trim() || getOnboardingUsername()
    const nextPhoneNumber = userMeData.profile.phoneNumber ?? ''
    const nextAgeRange = userMeData.profile.birthday ?? userMeData.profile.ageGroup ?? ''
    const nextLanguage = userMeData.profile.motherLanguage ?? ''
    const nextKoreanLevel = userMeData.profile.proficiencyLevel ?? ''
    const nextDailyGoal = userMeData.profile.dailyGoalMin?.toString() ?? ''
    const nextKoreanGoal = userMeData.profile.learningGoal ?? ''

    saveOnboardingUsername(nextName)
    writeLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY, nextPhoneNumber)
    writeLocalStorageItem(ACCOUNT_AGE_RANGE_KEY, nextAgeRange)
    writeLocalStorageItem(ACCOUNT_LANGUAGE_KEY, nextLanguage)
    writeLocalStorageItem(ACCOUNT_KOREAN_LEVEL_KEY, nextKoreanLevel)
    writeLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY, nextDailyGoal)
    writeLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY, nextKoreanGoal)

    const timer = window.setTimeout(() => {
      setUserName(nextName)
      setPhoneNumber(nextPhoneNumber)
      setAgeRange(nextAgeRange)
      setLanguage(nextLanguage)
      setKoreanLevel(nextKoreanLevel)
      setDailyGoal(nextDailyGoal)
      setKoreanGoal(nextKoreanGoal)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [authSession, userMeData])

  const handleLogout = async () => {
    setIsSigningOut(true)

    try {
      if (authSession?.refreshToken) {
        await logout({ refreshToken: authSession.refreshToken })
      }
    } catch {
      // Local sign-out still proceeds when the logout request fails.
    } finally {
      handleUnauthorized()
      setIsSigningOut(false)
    }
  }

  const handleOpenSection = (
    sectionId: number,
    sectionType: string,
    backScreen: 'class' | 'lesson-detail',
  ) => {
    if (sectionType === 'VOCAB') {
      setSelectedSectionId(sectionId)
      setVocabularyLessonBackScreen(backScreen)
      setScreen('vocabulary-lesson')
      return
    }

    if (sectionType === 'GRAMMAR') {
      setGrammarPracticeInitialStep('next-grammar')
    } else if (sectionType === 'READING') {
      setGrammarPracticeInitialStep('reading')
    } else if (sectionType === 'LISTENING') {
      setGrammarPracticeInitialStep('listening')
    } else {
      console.warn(`Unsupported section type: ${sectionType}`)
      return
    }

    setSelectedSectionId(sectionId)
    setGrammarPracticeBackScreen(backScreen)
    setScreen('grammar-practice')
  }

  return (
    <div className="app-root">
      {import.meta.env.DEV && !isDevPreview ? (
        <button
          type="button"
          className="app-dev-reset-button"
          onClick={() => {
            clearOnboardingStorage()
            clearStoredAuthSession()
            clearAccountScopedQueries()
            setAuthSession(null)
            setPendingSignup(null)
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
          onSignupSuccess={(payload) => {
            setPendingSignup(payload)
            setScreen('verify-email')
          }}
        />
      ) : screen === 'verify-email' ? (
        <VerifyEmailPage
          email={pendingSignup?.email ?? ''}
          onBack={() => setScreen('signup')}
          onVerifySuccess={async (verifyToken) => {
            if (!pendingSignup) {
              throw new Error('Sign-up information is missing. Please try again.')
            }

            const tokenData = await signup({
              verifyToken,
              ...pendingSignup,
            })

            persistAuthSession(pendingSignup.email, tokenData)
            setPendingSignup(null)
            setScreen('verify-success')
          }}
        />
      ) : screen === 'verify-success' ? (
        <VerifySuccessPage
          onStartLearning={() => {
            handleEnterAfterAuth()
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
            setScreen('profile-main')
          }}
          onOpenPractice={() => {
            setScreen('practice')
          }}
          onStartLesson={(lesson) => {
            setSelectedLessonNumericId(lesson.lessonId)
            handleOpenSection(lesson.sectionId, lesson.sectionType, 'class')
          }}
        />
      ) : screen === 'class' ? (
        <ClassPage
          preferFallbackContent={isDevPreview}
          defaultOpenCourseOrder={getDevPreviewCourseOrder()}
          onUnauthorized={handleUnauthorized}
          onOpenHome={() => {
            setScreen('home')
          }}
          onOpenPractice={() => {
            setScreen('practice')
          }}
          onOpenNotebook={() => {
            setScreen('notebook')
          }}
          onOpenProfile={() => {
            setScreen('profile-main')
          }}
          onOpenLesson={(_courseId, lessonId) => {
            setSelectedLessonNumericId(lessonId)
            setScreen('lesson-detail')
          }}
        />
      ) : screen === 'lesson-detail' ? (
        <LessonDetailPage
          key={selectedLessonNumericId ?? 'none'}
          lessonId={selectedLessonNumericId}
          initialSelectedModuleOrder={getDevPreviewLessonModuleOrder()}
          onSelectLesson={(lessonId) => {
            setSelectedLessonNumericId(lessonId)
          }}
          onStartLesson={(sectionId, sectionType) => {
            handleOpenSection(sectionId, sectionType, 'lesson-detail')
          }}
          onBack={() => {
            setScreen('class')
          }}
        />
      ) : screen === 'practice' ? (
        <PracticePage
          onBack={() => {
            setScreen('home')
          }}
          onOpenHome={() => {
            setScreen('home')
          }}
          onOpenClass={() => {
            setScreen('class')
          }}
          onOpenNotebook={() => {
            setScreen('notebook')
          }}
          onOpenProfile={() => {
            setScreen('profile-main')
          }}
        />
      ) : screen === 'setting' ? (
        <SettingPage
          onBack={() => {
            setScreen(settingBackScreen)
          }}
          onOpenAccountInfo={() => {
            setScreen('account-info')
          }}
          onOpenPreferences={() => {
            setScreen('preferences')
          }}
          isPushNotificationOn={isPushNotificationOn}
          onTogglePushNotifications={async () => {
            await updateUserMe.mutateAsync({
              isPushNotificationOn: !isPushNotificationOn,
            })
          }}
          onSignOut={() => {
            void handleLogout()
          }}
          isSigningOut={isSigningOut}
          isSavingNotification={updateUserMe.isPending}
        />
      ) : screen === 'account-info' ? (
        <AccountInfoPage
          email={authSession?.email ?? ''}
          username={currentUsername}
          nickname={userName}
          hasPassword={userMeData?.profile.hasPassword ?? true}
          phoneNumber={phoneNumber}
          ageGroupOrBirthday={ageRange}
          onSave={async (values) => {
            const nextNickname = values.nickname.trim() || 'Jinri'
            const nextPhoneNumber = values.phoneNumber.trim()
            const nextAgeGroupOrBirthday = values.ageGroupOrBirthday.trim()

            await updateUserMe.mutateAsync({
              nickname: nextNickname,
              phoneNumber: getOptionalString(nextPhoneNumber),
              ...getBirthdayOrAgeGroupPayload(nextAgeGroupOrBirthday),
            })

            setUserName(nextNickname)
            setPhoneNumber(nextPhoneNumber)
            setAgeRange(nextAgeGroupOrBirthday)

            saveOnboardingUsername(nextNickname)
            writeLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY, nextPhoneNumber)
            writeLocalStorageItem(ACCOUNT_AGE_RANGE_KEY, nextAgeGroupOrBirthday)

            if (values.passwordChange) {
              await changeUserPassword.mutateAsync(values.passwordChange)
            }
          }}
          isSaving={updateUserMe.isPending || changeUserPassword.isPending}
          saveError={updateUserMe.error?.message ?? changeUserPassword.error?.message ?? null}
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
          onSave={async (values) => {
            await updateUserMe.mutateAsync({
              motherLanguage: getOptionalString(values.language),
              proficiencyLevel: getOptionalString(values.koreanLevel),
              dailyGoalMin: getOptionalNumber(values.dailyGoal),
              learningGoal: getOptionalString(values.koreanGoal),
            })

            setLanguage(values.language)
            setKoreanLevel(values.koreanLevel)
            setDailyGoal(values.dailyGoal)
            setKoreanGoal(values.koreanGoal)
            writeLocalStorageItem(ACCOUNT_LANGUAGE_KEY, values.language)
            writeLocalStorageItem(ACCOUNT_KOREAN_LEVEL_KEY, values.koreanLevel)
            writeLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY, values.dailyGoal)
            writeLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY, values.koreanGoal)
          }}
          isSaving={updateUserMe.isPending}
          saveError={updateUserMe.error?.message ?? null}
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
            setScreen('profile-main')
          }}
        />
      ) : screen === 'vocabulary' ? (
        <VocabularyPage
          onBack={() => {
            setScreen('notebook')
          }}
        />
      ) : screen === 'vocabulary-lesson' ? (
        <VocabularyLessonPage
          sectionId={selectedSectionId}
          initialView={getInitialVocabularyLessonView()}
          initialCardIndex={getInitialVocabularyCardIndex()}
          onBack={() => {
            setScreen(vocabularyLessonBackScreen)
          }}
          onOpenNextGrammar={(nextSectionId) => {
            if (nextSectionId === null) {
              setSelectedSectionId(null)
            } else if (nextSectionId !== undefined) {
              setSelectedSectionId(nextSectionId)
            }
            setGrammarPracticeInitialStep('next-grammar')
            setGrammarPracticeBackScreen('lesson-detail')
            setScreen('grammar-practice')
          }}
        />
      ) : screen === 'notebook-grammar' ? (
        <GrammarNotebookPage
          onBack={() => {
            setScreen('notebook')
          }}
        />
      ) : screen === 'profile-main' ? (
        <ProfileMainPage
          nickname={userName}
          username={currentUsername}
          onOpenHome={() => {
            setScreen('home')
          }}
          onOpenClass={() => {
            setScreen('class')
          }}
          onOpenPractice={() => {
            setScreen('practice')
          }}
          onOpenNotebook={() => {
            setScreen('notebook')
          }}
          onOpenSetting={() => {
            setSettingBackScreen('profile-main')
            setScreen('setting')
          }}
          onOpenAchievements={() => {
            setScreen('profile-achievements')
          }}
        />
      ) : screen === 'profile-achievements' ? (
        <ProfileAchievementsPage
          onBack={() => {
            setScreen('profile-main')
          }}
        />
      ) : screen === 'grammar-practice' ? (
        <GrammarPracticePage
          initialPracticeStep={grammarPracticeInitialStep}
          language={language}
          sectionId={selectedSectionId!}
          onBack={() => {
            setScreen(grammarPracticeBackScreen)
          }}
        />
      ) : (
        <LoginPage
          onSignUp={() => setScreen('signup')}
          onLogin={async (credentials) => {
            const tokenData = await login(credentials)
            persistAuthSession(credentials.email, tokenData)
            setPendingSignup(null)
            handleEnterAfterAuth()
          }}
        />
      )}
    </div>
  )
}

export default App
