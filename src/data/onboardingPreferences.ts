export interface OnboardingChoice {
  id: string
  label: string
}

export type OnboardingPreferenceKey =
  | 'language'
  | 'koreanLevel'
  | 'dailyGoal'
  | 'koreanGoal'

export const motherLanguageChoices: OnboardingChoice[] = [
  { id: 'Hebrew', label: 'Hebrew' },
  { id: 'English', label: 'English' },
]

export const koreanLevelChoices: OnboardingChoice[] = [
  { id: 'Nothing', label: 'Nothing' },
  { id: 'Only hangul', label: 'Only hangul' },
  { id: 'Intermediate', label: 'Intermediate' },
  { id: 'Advanced', label: 'Advanced' },
]

export const dailyStudyTimeChoices: OnboardingChoice[] = [
  { id: '5-min', label: '5 min' },
  { id: '15-min', label: '15 min' },
  { id: '30-min', label: '30 min' },
  { id: '60-min', label: '60 min' },
]

export const learningGoalChoices: OnboardingChoice[] = [
  { id: 'Fun', label: 'Fun' },
  { id: 'Tourism', label: 'Tourism' },
  { id: 'Understanding Korean content', label: 'Understanding\nKorean content' },
  { id: 'Study in Korea', label: 'Study in Korea' },
  { id: 'Work in Korea', label: 'Work in Korea' },
  { id: 'Others', label: 'Others' },
]

export const onboardingPreferenceChoices: Record<
  OnboardingPreferenceKey,
  OnboardingChoice[]
> = {
  language: motherLanguageChoices,
  koreanLevel: koreanLevelChoices,
  dailyGoal: dailyStudyTimeChoices,
  koreanGoal: learningGoalChoices,
}

const legacyValueAliases: Partial<Record<OnboardingPreferenceKey, Record<string, string>>> = {
  language: {
    EN: 'English',
    HE: 'Hebrew',
  },
  koreanLevel: {
    LEVEL_1: 'Nothing',
    LEVEL_2: 'Only hangul',
    LEVEL_3: 'Intermediate',
    LEVEL_4: 'Advanced',
  },
  koreanGoal: {
    TRAVEL: 'Tourism',
    HOBBY: 'Fun',
    STUDY_ABROAD: 'Study in Korea',
    CAREER: 'Work in Korea',
  },
}

export const normalizeOnboardingPreferenceValue = (
  key: OnboardingPreferenceKey,
  value: string,
) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) return ''

  if (key === 'dailyGoal') {
    const minutes = Number.parseInt(trimmedValue, 10)
    const normalizedValue = Number.isFinite(minutes) ? `${minutes}-min` : trimmedValue

    return dailyStudyTimeChoices.some(({ id }) => id === normalizedValue)
      ? normalizedValue
      : trimmedValue
  }

  return legacyValueAliases[key]?.[trimmedValue] ?? trimmedValue
}

export const getOnboardingPreferenceLabel = (key: OnboardingPreferenceKey, value: string) => {
  const normalizedValue = normalizeOnboardingPreferenceValue(key, value)

  if (!normalizedValue) return '-'

  return (
    onboardingPreferenceChoices[key].find(({ id }) => id === normalizedValue)?.label ??
    normalizedValue
  )
}
