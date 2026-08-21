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
import CustomizePracticePage, { type LanguageDirection } from './pages/CustomizePracticePage'
import WordPracticePage from './pages/WordPracticePage'
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
import SubscriptionPage from './pages/SubscriptionPage'
import type { PatchUserRequest } from './types/user.types'
import type { AnnotationTarget } from './types/annotation.types'
import {
  clearAnnotationReturn,
  isGrammarSectionType,
  isVocabSectionType,
} from './data/annotationText'
import { isUnauthorizedError } from './services/apiError'
import { useChangeUserPassword } from './hooks/useChangeUserPassword.ts'
import { useUpdateUserMe } from './hooks/useUpdateUserMe.ts'
import { useUserMe } from './hooks/useUserMe.ts'
import { fetchLessonSections } from './services/learning.service.ts'
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

  if (/^\d{4}[-.]\d{2}[-.]\d{2}$/.test(trimmed)) {
    return { birthday: trimmed.replaceAll('.', '-') }
  }

  return { ageGroup: trimmed }
}

const normalizeBirthdayForApi = (value: string) => value.trim().replaceAll('.', '-')

const isBirthdayValue = (value: string) => /^\d{4}[-.]\d{2}[-.]\d{2}$/.test(value.trim())

type Screen =
  | 'splash' | 'login' | 'signup' | 'verify-email' | 'verify-success'
  | 'onboarding' | 'home' | 'class' | 'practice' | 'customize-practice' | 'word-practice' | 'grammar-practice' | 'setting'
  | 'account-info' | 'preferences' | 'notebook' | 'vocabulary' | 'notebook-grammar'
  | 'lesson-detail' | 'vocabulary-lesson' | 'profile-main' | 'profile-achievements' | 'subscription'

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
  'customize-practice',
  'word-practice',
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
  'subscription',
])

const devPreviewPracticeSteps = new Set<PracticeStep>([
  'choice',
  'fill-intro',
  'fill',
  'cards',
  'make-intro',
  'make',
  'review',
  'reading',
  'listening',
  'next-grammar',
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

interface ProfileSyncValues {
  name: string
  phoneNumber?: string
  ageRange: string
  ageGroup?: string
  birthday?: string
  language: string
  koreanLevel: string
  dailyGoal: string
  koreanGoal: string
}

function App() {
  const queryClient = useQueryClient()
  const updateUserMe = useUpdateUserMe()
  const changeUserPassword = useChangeUserPassword()
  const [screen, setScreen] = useState<Screen>(getInitialScreen)
  const [authSession, setAuthSession] = useState<AuthSession | null>(getStoredAuthSession)
  const [pendingSignup, setPendingSignup] = useState<SignupSubmission | null>(null)
  const [userName, setUserName] = useState(getOnboardingUsername)
  const [, setAgeRange] = useState(getStoredAgeRange)
  const [accountAgeGroup, setAccountAgeGroup] = useState('')
  const [accountBirthday, setAccountBirthday] = useState('')
  const [phoneNumber, setPhoneNumber] = useState(getStoredPhoneNumber)
  const [language, setLanguage] = useState(getStoredLanguage)
  const [koreanLevel, setKoreanLevel] = useState(getStoredKoreanLevel)
  const [dailyGoal, setDailyGoal] = useState(getStoredDailyGoal)
  const [koreanGoal, setKoreanGoal] = useState(getStoredKoreanGoal)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [minSplashElapsed, setMinSplashElapsed] = useState(false)
  const [onboardingSaveError, setOnboardingSaveError] = useState('')
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
  // annotation 팝업의 GO TO LESSON 으로 이동한 상태. 상단 뒤로가기로 복귀할
  // 원래 섹션/단계와, EXPLANATION_ONLY(하단 이동 금지) 여부를 기억한다.
  const [annotationJump, setAnnotationJump] = useState<{
    returnSectionId: number
    returnStep: PracticeStep
    explanationOnly: boolean
  } | null>(null)
  const [vocabularyLessonBackScreen, setVocabularyLessonBackScreen] = useState<
    'class' | 'lesson-detail'
  >(
    'class',
  )
  const [vocabularyLessonInitialView, setVocabularyLessonInitialView] = useState<
    'intro' | 'card' | 'flashcards'
  >('intro')
  // annotation 팝업의 GO TO LESSON 으로 열었을 때 먼저 보여줄 단어 카드(target.cardId).
  const [vocabularyLessonInitialCardId, setVocabularyLessonInitialCardId] = useState<number | null>(
    null,
  )
  const [wordPracticeSettings, setWordPracticeSettings] = useState<{
    questionCount: number
    languageDirection: LanguageDirection
    sessionSeed: string
  } | null>(null)
  const [settingBackScreen, setSettingBackScreen] = useState<'home' | 'profile-main'>('home')
  const {
    data: userMeData,
    error: userMeError,
    loaded: isUserMeLoaded,
    loading: isUserMeLoading,
  } = useUserMe(Boolean(authSession))

  const currentEmail = authSession?.email ?? pendingSignup?.email ?? ''
  const currentUsername =
    userMeData?.profile.username?.trim() ||
    (currentEmail ? currentEmail.split('@')[0] : userName)
  const isPushNotificationOn = userMeData?.profile.isPushNotificationOn ?? true
  const isDevPreview = getDevPreviewScreen() !== null

  const resetLocalProfileState = () => {
    setUserName('Jinri')
    setAgeRange('')
    setAccountAgeGroup('')
    setAccountBirthday('')
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
    updateUserMe.reset()
    changeUserPassword.reset()
    setAuthSession(null)
    setPendingSignup(null)
    setSettingBackScreen('home')
    setScreen('login')
  }, [changeUserPassword, clearAccountScopedQueries, updateUserMe])

  const hasCompletedOnboarding = isUserMeLoaded && userMeData?.profile.isOnboarded === true
  const shouldWaitForUserMe =
    Boolean(authSession) && !userMeError && (!isUserMeLoaded || isUserMeLoading)
  const shouldClearAuthForUserMeError =
    isUnauthorizedError(userMeError)
  const isSettingScreen =
    screen === 'setting' || screen === 'account-info' || screen === 'preferences'
  // 비밀번호 변경의 401은 현재 비밀번호 오류일 수 있다. 세션이 아직 살아 있으면
  // (리프레시 실패 시 저장된 세션이 지워짐) 로그아웃 대신 입력 오류로 처리한다.
  const isCurrentPasswordRejected =
    isUnauthorizedError(changeUserPassword.error) && Boolean(getStoredAuthSession())
  const settingUnauthorizedError = [
    userMeError,
    updateUserMe.error,
    isCurrentPasswordRejected ? null : changeUserPassword.error,
  ].find(isUnauthorizedError)
  const visibleScreen = screen === 'splash' && minSplashElapsed && !authSession ? 'login' : screen

  const showSplash = () => {
    setMinSplashElapsed(false)
    setScreen('splash')
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

  const syncProfileState = useCallback((values: ProfileSyncValues) => {
    saveOnboardingUsername(values.name)
    writeLocalStorageItem(ACCOUNT_AGE_RANGE_KEY, values.ageRange)
    writeLocalStorageItem(ACCOUNT_LANGUAGE_KEY, values.language)
    writeLocalStorageItem(ACCOUNT_KOREAN_LEVEL_KEY, values.koreanLevel)
    writeLocalStorageItem(ACCOUNT_DAILY_GOAL_KEY, values.dailyGoal)
    writeLocalStorageItem(ACCOUNT_KOREAN_GOAL_KEY, values.koreanGoal)

    if (values.phoneNumber !== undefined) {
      writeLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY, values.phoneNumber)
      setPhoneNumber(values.phoneNumber)
    }

    setUserName(values.name)
    setAgeRange(values.ageRange)
    setAccountAgeGroup(
      values.ageGroup ?? (!values.birthday && !isBirthdayValue(values.ageRange) ? values.ageRange : ''),
    )
    setAccountBirthday(values.birthday ?? (isBirthdayValue(values.ageRange) ? values.ageRange : ''))
    setLanguage(values.language)
    setKoreanLevel(values.koreanLevel)
    setDailyGoal(values.dailyGoal)
    setKoreanGoal(values.koreanGoal)
  }, [])

  useEffect(() => {
    if (!authSession || !isSettingScreen || !settingUnauthorizedError) {
      return
    }

    const timer = window.setTimeout(handleUnauthorized, 0)
    return () => window.clearTimeout(timer)
  }, [authSession, handleUnauthorized, isSettingScreen, settingUnauthorizedError])

  useEffect(() => {
    if (screen !== 'splash') {
      return
    }

    if (minSplashElapsed) {
      return
    }

    const timer = window.setTimeout(() => {
      setMinSplashElapsed(true)
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [minSplashElapsed, screen])

  useEffect(() => {
    if (screen !== 'splash' || !minSplashElapsed) {
      return
    }

    if (!authSession) {
        setScreen('login')
        return
    }

    if (shouldWaitForUserMe) {
      return
    }

    if (userMeError) {
      if (shouldClearAuthForUserMeError) {
        const timer = window.setTimeout(handleUnauthorized, 0)
        return () => window.clearTimeout(timer)
      }

      return
    }

    const timer = window.setTimeout(
      () => setScreen(hasCompletedOnboarding ? 'home' : 'onboarding'),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [
    authSession,
    handleUnauthorized,
    hasCompletedOnboarding,
    minSplashElapsed,
    screen,
    shouldClearAuthForUserMeError,
    shouldWaitForUserMe,
    userMeError,
  ])

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
    const nextAgeGroup = userMeData.profile.ageGroup ?? ''
    const nextBirthday = userMeData.profile.birthday ?? ''
    const nextAgeRange = nextBirthday || nextAgeGroup
    // 서버에 mother language가 아직 없으면 온보딩에서 고른 값을 덮어쓰지 않는다.
    const nextLanguage = userMeData.profile.motherLanguage ?? getStoredLanguage()
    const nextKoreanLevel = userMeData.profile.proficiencyLevel ?? ''
    const nextDailyGoal = userMeData.profile.dailyGoalMin?.toString() ?? ''
    const nextKoreanGoal = userMeData.profile.learningGoal ?? ''

    const timer = window.setTimeout(() => {
      syncProfileState({
        name: nextName,
        phoneNumber: nextPhoneNumber,
        ageRange: nextAgeRange,
        ageGroup: nextAgeGroup,
        birthday: nextBirthday,
        language: nextLanguage,
        koreanLevel: nextKoreanLevel,
        dailyGoal: nextDailyGoal,
        koreanGoal: nextKoreanGoal,
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [authSession, syncProfileState, userMeData])

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

  const clearAccountInfoSaveError = useCallback(() => {
    updateUserMe.reset()
    changeUserPassword.reset()
  }, [changeUserPassword, updateUserMe])

  /** 섹션 화면을 연다. 알 수 없는 타입이면 아무것도 열지 않고 false 를 돌려준다. */
  const handleOpenSection = (
    sectionId: number,
    sectionType: string,
    backScreen: 'home' | 'class' | 'lesson-detail',
  ) => {
    const normalizedType = sectionType.toUpperCase()
    // 일반 섹션 이동은 GO TO LESSON 복귀 상태(팝업 재열기 기록 포함)를 항상 정리한다.
    setAnnotationJump(null)
    clearAnnotationReturn()

    if (normalizedType === 'VOCAB' || normalizedType === 'VOCABULARY') {
      setSelectedSectionId(sectionId)
      setVocabularyLessonInitialView('intro')
      setVocabularyLessonInitialCardId(null)
      setVocabularyLessonBackScreen(backScreen === 'home' ? 'class' : backScreen)
      setScreen('vocabulary-lesson')
      return true
    }

    if (normalizedType === 'GRAMMAR') {
      setGrammarPracticeInitialStep('next-grammar')
    } else if (normalizedType === 'READING') {
      setGrammarPracticeInitialStep('reading')
    } else if (normalizedType === 'LISTENING') {
      setGrammarPracticeInitialStep('listening')
    } else {
      console.warn(`Unsupported section type: ${sectionType}`)
      return false
    }

    setSelectedSectionId(sectionId)
    setGrammarPracticeBackScreen(backScreen)
    setScreen('grammar-practice')
    return true
  }

  /**
   * Lesson의 마지막 섹션 완료 응답에 nextSection이 없을 때,
   * 같은 Course의 다음 Lesson 첫 섹션을 연다.
   */
  const openFirstSectionOfNextLesson = async () => {
    if (selectedLessonNumericId === null || grammarPracticeBackScreen !== 'lesson-detail') {
      return false
    }

    try {
      const currentLesson = await queryClient.fetchQuery({
        queryKey: ['learning', 'lessons', selectedLessonNumericId, 'sections'],
        queryFn: ({ signal }) => fetchLessonSections(selectedLessonNumericId, signal),
      })
      if (!currentLesson) return false

      const orderedLessons = [...currentLesson.siblingLessons].sort(
        (a, b) => a.orderNum - b.orderNum,
      )
      const currentLessonIndex = orderedLessons.findIndex(
        (lesson) => lesson.lessonId === selectedLessonNumericId,
      )
      if (currentLessonIndex < 0) return false

      const nextLesson = orderedLessons[currentLessonIndex + 1]
      if (!nextLesson) return false

      const nextLessonData = await queryClient.fetchQuery({
        queryKey: ['learning', 'lessons', nextLesson.lessonId, 'sections'],
        queryFn: ({ signal }) => fetchLessonSections(nextLesson.lessonId, signal),
      })
      const firstSection = [...(nextLessonData?.sections ?? [])]
        .sort((a, b) => a.orderNum - b.orderNum)
        .find((section) => {
          const type = section.type.toUpperCase()
          return type === 'VOCAB' || type === 'VOCABULARY'
        })
      if (!firstSection) return false

      setSelectedLessonNumericId(nextLesson.lessonId)
      return handleOpenSection(firstSection.sectionId, firstSection.type, 'lesson-detail')
    } catch {
      return false
    }
  }

  /**
   * annotation 팝업의 GO TO LESSON: concept.target 섹션을 열고 복귀 정보를 기억한다.
   * sectionType 에 맞는 화면으로만 이동한다. 알 수 없는 타입이면 GRAMMAR 로
   * 폴백하지 않고 false 를 돌려주고, 팝업이 대신 안내 문구를 띄운다.
   */
  const handleOpenAnnotationTarget = (
    target: AnnotationTarget,
    returnInfo: { sectionId: number; step: PracticeStep },
  ) => {
    if (target.sectionId === null || target.sectionId <= 0) return false

    const normalizedType = target.sectionType.trim().toUpperCase()
    const jump = {
      returnSectionId: returnInfo.sectionId,
      returnStep: returnInfo.step,
      explanationOnly: target.mode === 'EXPLANATION_ONLY',
    }

    if (isVocabSectionType(normalizedType)) {
      setAnnotationJump(jump)
      setSelectedSectionId(target.sectionId)
      setVocabularyLessonInitialView('card')
      setVocabularyLessonInitialCardId(target.cardId)
      setScreen('vocabulary-lesson')
      return true
    }

    if (!isGrammarSectionType(normalizedType)) {
      console.warn(`Unsupported annotation target section type: ${target.sectionType}`)
      return false
    }

    const step: PracticeStep =
      normalizedType === 'READING'
        ? 'reading'
        : normalizedType === 'LISTENING'
          ? 'listening'
          : 'next-grammar'

    setAnnotationJump(jump)
    setSelectedSectionId(target.sectionId)
    setGrammarPracticeInitialStep(step)
    setScreen('grammar-practice')
    return true
  }

  /** GO TO LESSON 으로 열린 화면의 상단 뒤로가기: 원래 섹션/단계로 복귀해 같은 팝업을 다시 연다. */
  const handleAnnotationJumpReturn = () => {
    if (!annotationJump) return
    setVocabularyLessonInitialCardId(null)
    setSelectedSectionId(annotationJump.returnSectionId)
    setGrammarPracticeInitialStep(annotationJump.returnStep)
    setAnnotationJump(null)
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

      {visibleScreen === 'splash' ? (
        <SplashPage />
      ) : visibleScreen === 'signup' ? (
        <SignupPage
          onBack={() => setScreen('login')}
          onSignupSuccess={(payload) => {
            setPendingSignup(payload)
            setScreen('verify-email')
          }}
        />
      ) : visibleScreen === 'verify-email' ? (
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
      ) : visibleScreen === 'verify-success' ? (
        <VerifySuccessPage
          onStartLearning={() => {
            showSplash()
          }}
        />
      ) : visibleScreen === 'onboarding' ? (
        <OnboardingPage
          onBack={() => setScreen('login')}
          isSaving={updateUserMe.isPending}
          saveError={onboardingSaveError}
          onComplete={async (values) => {
            const savedName = values.name?.trim() || 'Jinri'
            const savedAgeRange = values.ageRange ?? ''
            const savedLanguage = values.motherLanguage ?? ''
            const savedKoreanLevel = values.koreanLevel ?? ''
            const savedDailyGoal = values.dailyStudyTime ?? ''
            const savedKoreanGoal = values.goal ?? ''
            setOnboardingSaveError('')

            try {
              await updateUserMe.mutateAsync({
                nickname: savedName,
                motherLanguage: getOptionalString(savedLanguage),
                proficiencyLevel: getOptionalString(savedKoreanLevel),
                dailyGoalMin: getOptionalNumber(savedDailyGoal),
                learningGoal: getOptionalString(savedKoreanGoal),
                ...getBirthdayOrAgeGroupPayload(savedAgeRange),
                isOnboarded: true,
              })
            } catch (error) {
              setOnboardingSaveError(
                error instanceof Error ? error.message : 'Failed to save onboarding.',
              )
              return
            }

            syncProfileState({
              name: savedName,
              ageRange: savedAgeRange,
              ageGroup: isBirthdayValue(savedAgeRange) ? '' : savedAgeRange,
              birthday: isBirthdayValue(savedAgeRange) ? normalizeBirthdayForApi(savedAgeRange) : '',
              language: savedLanguage,
              koreanLevel: savedKoreanLevel,
              dailyGoal: savedDailyGoal,
              koreanGoal: savedKoreanGoal,
            })
            setScreen('home')
          }}
        />
      ) : visibleScreen === 'home' ? (
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
      ) : visibleScreen === 'class' ? (
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
      ) : visibleScreen === 'lesson-detail' ? (
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
      ) : visibleScreen === 'practice' ? (
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
      ) : visibleScreen === 'customize-practice' ? (
        <CustomizePracticePage
          onExit={() => {
            setVocabularyLessonInitialView('card')
            setScreen('vocabulary-lesson')
          }}
          onNext={(questionCount, languageDirection) => {
            setWordPracticeSettings({
              questionCount,
              languageDirection,
              sessionSeed: crypto.randomUUID(),
            })
            setScreen('word-practice')
          }}
        />
      ) : visibleScreen === 'word-practice' ? (
        <WordPracticePage
          sectionId={selectedSectionId}
          questionCount={wordPracticeSettings?.questionCount ?? 5}
          languageDirection={wordPracticeSettings?.languageDirection ?? 'english-to-korean'}
          sessionSeed={wordPracticeSettings?.sessionSeed ?? 'preview'}
          onBack={() => {
            setScreen('customize-practice')
          }}
          onExit={() => {
            setScreen('customize-practice')
          }}
          onComplete={() => {
            setVocabularyLessonInitialView('card')
            setScreen('vocabulary-lesson')
          }}
        />
      ) : visibleScreen === 'setting' ? (
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
          notificationError={
            isUnauthorizedError(updateUserMe.error) ? null : updateUserMe.error?.message ?? null
          }
          onClearNotificationError={() => updateUserMe.reset()}
        />
      ) : visibleScreen === 'account-info' ? (
        <AccountInfoPage
          email={authSession?.email ?? ''}
          username={currentUsername}
          nickname={userName}
          hasPassword={userMeData?.profile.hasPassword ?? true}
          phoneNumber={phoneNumber}
          ageGroup={accountAgeGroup}
          birthday={accountBirthday}
          onSave={async (values) => {
            const userPatch: PatchUserRequest = {}

            if (values.nickname !== undefined) {
              const nextNickname = values.nickname.trim() || 'Jinri'
              userPatch.nickname = nextNickname
            }

            if (values.phoneNumber !== undefined) {
              const nextPhoneNumber = values.phoneNumber.trim()
              userPatch.phoneNumber = getOptionalString(nextPhoneNumber)
            }

            if (values.ageGroup !== undefined) {
              userPatch.ageGroup = getOptionalString(values.ageGroup.trim())
            }

            if (values.birthday !== undefined) {
              userPatch.birthday = getOptionalString(normalizeBirthdayForApi(values.birthday))
            }

            if (Object.keys(userPatch).length > 0) {
              await updateUserMe.mutateAsync(userPatch)
            }

            if (values.nickname !== undefined) {
              const nextNickname = values.nickname.trim() || 'Jinri'
              setUserName(nextNickname)
              saveOnboardingUsername(nextNickname)
            }

            if (values.phoneNumber !== undefined) {
              const nextPhoneNumber = values.phoneNumber.trim()
              setPhoneNumber(nextPhoneNumber)
              writeLocalStorageItem(ACCOUNT_PHONE_NUMBER_KEY, nextPhoneNumber)
            }

            if (values.ageGroup !== undefined || values.birthday !== undefined) {
              await queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
            }

            if (values.passwordChange) {
              await changeUserPassword.mutateAsync(values.passwordChange)
            }
          }}
          isSaving={updateUserMe.isPending || changeUserPassword.isPending}
          saveError={
            isCurrentPasswordRejected
              ? 'The current password is incorrect.'
              : isUnauthorizedError(updateUserMe.error) ||
                  isUnauthorizedError(changeUserPassword.error)
                ? null
                : updateUserMe.error?.message ?? changeUserPassword.error?.message ?? null
          }
          onClearSaveError={clearAccountInfoSaveError}
          onBack={() => {
            setScreen('setting')
          }}
        />
      ) : visibleScreen === 'preferences' ? (
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
          saveError={isUnauthorizedError(updateUserMe.error) ? null : updateUserMe.error?.message ?? null}
          onClearSaveError={clearAccountInfoSaveError}
          onBack={() => {
            setScreen('setting')
          }}
        />
      ) : visibleScreen === 'notebook' ? (
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
      ) : visibleScreen === 'vocabulary' ? (
        <VocabularyPage
          language={language}
          onBack={() => {
            setScreen('notebook')
          }}
        />
      ) : visibleScreen === 'vocabulary-lesson' ? (
        <VocabularyLessonPage
          // GO TO LESSON 으로 같은 섹션을 오갈 때도 다시 마운트되도록 jump 여부를 key 에 넣는다.
          key={`vocabulary-lesson-${selectedSectionId ?? 'none'}-${
            annotationJump ? `jump-${vocabularyLessonInitialCardId ?? 'none'}` : 'main'
          }`}
          language={language}
          sectionId={selectedSectionId}
          initialView={getInitialVocabularyLessonView() ?? vocabularyLessonInitialView}
          initialCardIndex={getInitialVocabularyCardIndex()}
          initialCardId={vocabularyLessonInitialCardId}
          explanationOnly={annotationJump?.explanationOnly === true}
          onBack={() => {
            // GO TO LESSON 으로 열린 화면이면 원래 섹션으로 복귀한다.
            if (annotationJump) {
              handleAnnotationJumpReturn()
              return
            }
            setScreen(vocabularyLessonBackScreen)
          }}
          onExit={() => {
            if (annotationJump) {
              handleAnnotationJumpReturn()
              return
            }
            setScreen(vocabularyLessonBackScreen)
          }}
          onOpenFlashcardPractice={() => {
            setVocabularyLessonInitialView('card')
            setScreen('customize-practice')
          }}
          onOpenNextGrammar={(nextSectionId) => {
            setAnnotationJump(null)
            setVocabularyLessonInitialCardId(null)
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
      ) : visibleScreen === 'notebook-grammar' ? (
        <GrammarNotebookPage
          language={language}
          onBack={() => {
            setScreen('notebook')
          }}
        />
      ) : visibleScreen === 'profile-main' ? (
        <ProfileMainPage
          preferFallbackContent={isDevPreview}
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
            clearAccountInfoSaveError()
            setSettingBackScreen('profile-main')
            setScreen('setting')
          }}
          onOpenAchievements={() => {
            setScreen('profile-achievements')
          }}
          onOpenSubscription={() => {
            setScreen('subscription')
          }}
          onUnauthorized={handleUnauthorized}
        />
      ) : visibleScreen === 'subscription' ? (
        <SubscriptionPage
          currentSubscriptionPlanId={userMeData?.profile.subscriptionPlanId ?? null}
          currentSubscriptionTier={userMeData?.profile.subscriptionTier ?? 'FREE'}
          subscriptionExpiresAt={userMeData?.profile.subscriptionExpiresAt ?? null}
          onClose={() => {
            setScreen('profile-main')
          }}
          onUnauthorized={handleUnauthorized}
        />
      ) : visibleScreen === 'profile-achievements' ? (
        <ProfileAchievementsPage
          onBack={() => {
            setScreen('profile-main')
          }}
          onUnauthorized={handleUnauthorized}
        />
      ) : visibleScreen === 'grammar-practice' ? (
        <GrammarPracticePage
          // 섹션이 바뀌면 새로 마운트해서 initialPracticeStep 과 내부 진행 상태를 처음부터 다시 잡는다.
          // 같은 섹션 안에서 GO TO LESSON 을 오갈 때도 다시 마운트되도록 jump 여부를 key 에 넣는다.
          key={`grammar-practice-${selectedSectionId ?? 'none'}-${annotationJump ? 'jump' : 'main'}`}
          initialPracticeStep={grammarPracticeInitialStep}
          language={language}
          sectionId={selectedSectionId!}
          explanationOnly={annotationJump?.explanationOnly === true}
          onOpenAnnotationTarget={handleOpenAnnotationTarget}
          onBack={() => {
            // GO TO LESSON 으로 열린 화면이면 원래 섹션으로 복귀한다.
            if (annotationJump) {
              handleAnnotationJumpReturn()
              return
            }
            setScreen(grammarPracticeBackScreen)
          }}
          onExit={() => {
            if (annotationJump) {
              handleAnnotationJumpReturn()
              return
            }
            setScreen(grammarPracticeBackScreen)
          }}
          onOpenNextSection={(nextSection, options) => {
            setAnnotationJump(null)
            void (async () => {
              if (nextSection) {
                // 다음 섹션이 다음 Lesson에 속하면 상단 뒤로가기도 그 Lesson Detail로 복귀한다.
                setSelectedLessonNumericId(nextSection.lessonId)
                if (
                  handleOpenSection(
                    nextSection.sectionId,
                    nextSection.type,
                    grammarPracticeBackScreen,
                  )
                ) {
                  return
                }
              } else if (
                options?.openNextLessonWhenMissing === true &&
                await openFirstSectionOfNextLesson()
              ) {
                return
              }

              setSelectedSectionId(null)
              setScreen(grammarPracticeBackScreen)
            })()
          }}
        />
      ) : (
        <LoginPage
          onSignUp={() => setScreen('signup')}
          onLogin={async (credentials) => {
            const tokenData = await login(credentials)
            persistAuthSession(credentials.email, tokenData)
            setPendingSignup(null)
            showSplash()
          }}
        />
      )}
    </div>
  )
}

export default App
