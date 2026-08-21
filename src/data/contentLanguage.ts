import type {
  CardLocales,
  DialogueLine,
  MaterialContentText,
  MaterialExplanation,
} from '../types/section,types.ts'

// 온보딩에서 고른 mother language를 학습 컨텐츠 언어로 연결하는 공통 유틸.
// 온보딩은 'Hebrew' / 'English'로 저장하지만 서버/목 데이터는 'EN', 'he', 'iw' 등을
// 섞어서 내려주기 때문에 항상 이 헬퍼로 정규화한 뒤 사용한다.
export type ContentLanguage = 'en' | 'he'

export const DEFAULT_CONTENT_LANGUAGE: ContentLanguage = 'en'

const HEBREW_TAGS = new Set(['hebrew', 'he', 'heb', 'iw', 'he-il', 'iw-il', 'עברית'])
const ENGLISH_TAGS = new Set(['english', 'en', 'eng', 'en-us', 'en-gb'])

// 언어 태그를 컨텐츠 언어로 정규화한다. 'ko'처럼 번역 대상이 아닌 값은 null.
export const normalizeLanguageTag = (
  value: string | null | undefined,
): ContentLanguage | null => {
  const normalized = (value ?? '').trim().toLowerCase()
  if (HEBREW_TAGS.has(normalized)) return 'he'
  if (ENGLISH_TAGS.has(normalized)) return 'en'
  return null
}

// mother language 값은 알 수 없더라도 화면을 그려야 하므로 영어로 폴백한다.
export const toContentLanguage = (
  motherLanguage: string | null | undefined,
): ContentLanguage => normalizeLanguageTag(motherLanguage) ?? DEFAULT_CONTENT_LANGUAGE

export const isRtlContentLanguage = (language: ContentLanguage): boolean =>
  language === 'he'

export const contentTextDirection = (language: ContentLanguage): 'rtl' | 'ltr' =>
  isRtlContentLanguage(language) ? 'rtl' : 'ltr'

// mother language 로 고른 언어 하나만 쓴다.
// 히브리어 계정은 한국어 + 히브리어, 영어 계정은 한국어 + 영어만 보여 줘야 하므로
// 다른 번역 언어로는 절대 폴백하지 않는다(히브리어가 없다고 영어를 보여 주지 않는다).
const withFallbackOrder = (language: ContentLanguage): ContentLanguage[] => [language]

export const pickDialogueTranslation = (
  line: DialogueLine,
  language: ContentLanguage,
): string => {
  for (const code of withFallbackOrder(language)) {
    const text = line[code]
    if (text && text.trim().length > 0) return text
  }
  return ''
}

export const pickExplanation = (
  explanations: MaterialExplanation[] | undefined,
  language: ContentLanguage,
): MaterialExplanation | null => {
  if (!explanations || explanations.length === 0) return null

  for (const code of withFallbackOrder(language)) {
    const match = explanations.find(
      (explanation) => normalizeLanguageTag(explanation.lang) === code,
    )
    if (match) return match
  }

  // 번역 대상이 아닌 언어(한국어 원문 등)는 어떤 사용자에게도 보여 줄 수 있다.
  // 다른 mother language 번역으로는 폴백하지 않는다.
  return explanations.find((explanation) => normalizeLanguageTag(explanation.lang) === null) ?? null
}

// 자료 설명은 explanations(언어별 배열) 또는 description(단일 문자열)로 온다.
// mother language 설명이 있으면 그걸 쓰고, 없으면 description 이라도 보여준다.
export const pickContentExplanation = (
  content: MaterialContentText | null | undefined,
  language: ContentLanguage,
): { text: string; lang: string } | null => {
  const explanation = pickExplanation(content?.explanations, language)
  if (explanation?.text && explanation.text.trim().length > 0) return explanation

  const description = content?.description
  if (description && description.trim().length > 0) return { text: description, lang: 'ko' }

  return null
}

export const pickLocaleText = (
  locales: CardLocales | undefined,
  language: ContentLanguage,
  field: 'back' | 'notes',
): string | null => {
  if (!locales) return null

  for (const code of withFallbackOrder(language)) {
    const text = locales[code]?.[field]
    if (text && text.trim().length > 0) return text
  }
  return null
}
