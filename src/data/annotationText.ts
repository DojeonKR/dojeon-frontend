import type {
  AnnotationTarget,
  AnnotationType,
  AnnotationUnit,
  SectionAnnotation,
  SectionAnnotationsData,
} from '../types/annotation.types.ts'
import { DEFAULT_CONTENT_LANGUAGE, normalizeLanguageTag, type ContentLanguage } from './contentLanguage.ts'

// 현재 화면 라인에 해당하는 unit 을 찾는다.
// jsonPath 를 알면 materialId + jsonPath 로 찾고, 실제 렌더링할 원문이 unit.text 와
// 정확히 일치할 때만 돌려준다(불일치면 마크 없이 일반 텍스트로 그린다).
// transcript 처럼 라인별 jsonPath 를 계산할 수 없는 경우에만 같은 자료 안에서
// 원문이 정확히 일치하는 unit 으로 폴백 매칭한다.
export function findAnnotationUnit(
  data: SectionAnnotationsData | null,
  materialId: number | null,
  jsonPath: string | null,
  text: string | null,
): AnnotationUnit | null {
  if (!data || materialId === null) return null

  if (jsonPath) {
    const unit = data.units.find(
      (candidate) => candidate.materialId === materialId && candidate.jsonPath === jsonPath,
    )
    if (!unit) return null
    return text === null || unit.text === text ? unit : null
  }

  if (text === null) return null
  return (
    data.units.find(
      (candidate) => candidate.materialId === materialId && candidate.text === text,
    ) ?? null
  )
}

// analysisStatus 가 ANALYZED 가 아니거나 annotation 이 없으면 일반 텍스트로 렌더링한다.
export function isUnitMarkable(unit: AnnotationUnit | null): unit is AnnotationUnit {
  return (
    unit !== null &&
    unit.analysisStatus === 'ANALYZED' &&
    unit.annotations.length > 0
  )
}

export function pickUnitAnnotations(
  unit: AnnotationUnit | null,
  type: AnnotationType,
): SectionAnnotation[] {
  if (!isUnitMarkable(unit)) return []
  return unit.annotations.filter(
    (annotation) =>
      annotation.type === type &&
      annotation.startOffset >= 0 &&
      annotation.endOffset <= unit.text.length &&
      annotation.startOffset < annotation.endOffset,
  )
}

export interface AnnotatedSegment {
  start: number
  end: number
  text: string
  // 같은 타입 안에서도 범위가 겹칠 수 있어 한 구간에 여러 annotation 이 붙을 수 있다.
  annotations: SectionAnnotation[]
}

// offset 은 JavaScript 문자열과 같은 UTF-16 기준 [start, end) 범위라 slice 를 그대로 쓴다.
// 겹치는 범위를 허용하기 위해 모든 경계 offset 으로 텍스트를 쪼개고,
// 각 구간을 덮는 annotation 목록을 함께 돌려준다.
export function segmentAnnotatedText(
  text: string,
  annotations: SectionAnnotation[],
): AnnotatedSegment[] {
  if (annotations.length === 0) {
    return [{ start: 0, end: text.length, text, annotations: [] }]
  }

  const bounds = new Set<number>([0, text.length])
  annotations.forEach((annotation) => {
    bounds.add(annotation.startOffset)
    bounds.add(annotation.endOffset)
  })

  const sortedBounds = Array.from(bounds).sort((a, b) => a - b)
  const segments: AnnotatedSegment[] = []

  for (let index = 0; index < sortedBounds.length - 1; index += 1) {
    const start = sortedBounds[index]
    const end = sortedBounds[index + 1]
    if (end <= start) continue

    segments.push({
      start,
      end,
      text: text.slice(start, end),
      annotations: annotations.filter(
        (annotation) => annotation.startOffset <= start && annotation.endOffset >= end,
      ),
    })
  }

  return segments
}

// concept.explanation 은 스키마가 확정되지 않아 문자열, { lang: text } 객체,
// { text } / { lang, text } 배열 등 어떤 모양이 와도 팝업에 띄울 문자열을 골라낸다.
export function pickAnnotationExplanation(
  explanation: unknown,
  language: ContentLanguage,
): string {
  if (typeof explanation === 'string') return explanation.trim()
  if (!explanation || typeof explanation !== 'object') return ''

  if (Array.isArray(explanation)) {
    const entries = explanation
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
      .map((entry) => ({
        lang: normalizeLanguageTag(typeof entry.lang === 'string' ? entry.lang : null),
        text: typeof entry.text === 'string' ? entry.text.trim() : '',
      }))
      .filter((entry) => entry.text.length > 0)

    return (
      entries.find((entry) => entry.lang === language)?.text ??
      entries.find((entry) => entry.lang === DEFAULT_CONTENT_LANGUAGE)?.text ??
      entries[0]?.text ??
      ''
    )
  }

  const record = explanation as Record<string, unknown>
  if (typeof record.text === 'string' && record.text.trim().length > 0) {
    return record.text.trim()
  }

  const localeCandidates: string[] = []
  let fallback = ''
  Object.entries(record).forEach(([key, value]) => {
    if (typeof value !== 'string' || value.trim().length === 0) return
    if (!fallback) fallback = value.trim()
    const normalized = normalizeLanguageTag(key)
    if (normalized === language) localeCandidates.unshift(value.trim())
    else if (normalized === DEFAULT_CONTENT_LANGUAGE) localeCandidates.push(value.trim())
  })

  return localeCandidates[0] ?? fallback
}

// GO TO LESSON 으로 이동한 뒤 상단 뒤로가기로 복귀했을 때 같은 팝업을 다시 열기 위한 정보.
// 새로고침 후에도 남도록 session storage 에 둔다.
export interface AnnotationReturnRecord {
  sectionId: number
  unitId: string
  annotationId: string
  markMode: AnnotationType
}

const ANNOTATION_RETURN_KEY = 'dojeon:annotation.return'

export function saveAnnotationReturn(record: AnnotationReturnRecord) {
  try {
    sessionStorage.setItem(ANNOTATION_RETURN_KEY, JSON.stringify(record))
  } catch {
    // session storage 를 못 쓰는 환경에서는 복귀 시 팝업 재열기만 생략된다.
  }
}

export function readAnnotationReturn(): AnnotationReturnRecord | null {
  try {
    const raw = sessionStorage.getItem(ANNOTATION_RETURN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AnnotationReturnRecord>
    if (
      typeof parsed.sectionId !== 'number' ||
      typeof parsed.unitId !== 'string' ||
      typeof parsed.annotationId !== 'string' ||
      (parsed.markMode !== 'VOCAB' && parsed.markMode !== 'GRAMMAR')
    ) {
      return null
    }
    return parsed as AnnotationReturnRecord
  } catch {
    return null
  }
}

export function clearAnnotationReturn() {
  try {
    sessionStorage.removeItem(ANNOTATION_RETURN_KEY)
  } catch {
    // 무시: 저장이 안 됐다면 지울 것도 없다.
  }
}

// ── annotation GO TO LESSON 목적지 판정 ───────────────────────────────
// 서버가 내려준 target 을 그대로 믿지 않고, annotation 타입과 섹션 타입이
// 맞을 때만 목적지로 인정한다. 어긋나면 GRAMMAR 화면으로 폴백하지 않고
// "목적지 없음"으로 취급한다.

function normalizeSectionType(sectionType: string | null | undefined): string {
  return (sectionType ?? '').trim().toUpperCase()
}

export function isVocabSectionType(sectionType: string | null | undefined): boolean {
  const type = normalizeSectionType(sectionType)
  return type === 'VOCAB' || type === 'VOCABULARY'
}

export function isGrammarSectionType(sectionType: string | null | undefined): boolean {
  const type = normalizeSectionType(sectionType)
  return type === 'GRAMMAR' || type === 'READING' || type === 'LISTENING'
}

// 이동 가능한 target 만 돌려준다. 하나라도 어긋나면 null:
// concept 없음 / target 없음 / sectionId 없음 / annotation 타입과 sectionType 불일치.
export function resolveAnnotationTarget(
  annotation: SectionAnnotation | null | undefined,
): AnnotationTarget | null {
  const target = annotation?.concept?.target ?? null
  if (!annotation || !target) return null
  if (target.sectionId === null || target.sectionId <= 0) return null

  return annotation.type === 'VOCAB'
    ? isVocabSectionType(target.sectionType)
      ? target
      : null
    : isGrammarSectionType(target.sectionType)
      ? target
      : null
}

// 목적지가 없거나 목적지 조회에 실패했을 때 팝업에 대신 띄우는 문구.
export function annotationNoLessonMessage(type: AnnotationType): string {
  return type === 'VOCAB'
    ? '이 단어는 아직 학습할 수 있는 레슨이 없어요.'
    : '이 문법은 아직 학습할 수 있는 레슨이 없어요.'
}
