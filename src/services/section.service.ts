import type {
    MaterialContentText,
    SectionMaterial,
    SectionMaterialData,
    SectionCard,
    SectionCardData,
    SectionQuestion,
    SectionQuestionData,
    SectionCheckAnswerRequest,
    SectionCheckAnswerData,
    SaveProgressRequest,
    SaveProgressData,
} from '../types/section,types.ts'
import type {
    AnnotationConcept,
    AnnotationTarget,
    AnnotationUnit,
    SectionAnnotation,
    SectionAnnotationsData,
} from '../types/annotation.types.ts'
import { authenticatedFetch, getAuthToken } from './session.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class SectionApiError extends Error {
    readonly code?: string
    readonly errorCode?: string
    readonly status?: number

    constructor(message: string, code?: string, errorCode?: string, status?: number) {
        super(message)
        this.name = 'SectionApiError'
        this.code = code
        this.errorCode = errorCode
        this.status = status
    }
}

function buildHeaders(extra: HeadersInit = {}): HeadersInit {
    const token = getAuthToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    }
}

type SectionApiResponse<T> = {
    isSuccess: boolean
    code: string
    message: string
    data: T | null
    errorCode?: string
    timestamp?: string
}

function isWrappedResponse<T>(body: unknown): body is SectionApiResponse<T> {
    return Boolean(body && typeof body === 'object' && 'isSuccess' in body)
}

async function fetchSectionResponse<T>(
    input: RequestInfo | URL,
    init: RequestInit,
    fallbackMessage: string,
): Promise<T | null> {
    let res: Response
    try {
        res = await authenticatedFetch(input, init)
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        throw new SectionApiError(fallbackMessage)
    }

    const bodyText = await res.text()
    let body: unknown = null

    if (!bodyText.trim()) {
        if (!res.ok) {
            throw new SectionApiError(
                `${fallbackMessage} (HTTP ${res.status})`,
                undefined,
                undefined,
                res.status,
            )
        }

        return null
    }

    try {
        body = JSON.parse(bodyText)
    } catch {
        if (!res.ok) {
            throw new SectionApiError(
                `${fallbackMessage} (HTTP ${res.status})`,
                undefined,
                undefined,
                res.status,
            )
        }

        throw new SectionApiError(
            `${fallbackMessage} (invalid JSON, HTTP ${res.status})`,
            undefined,
            undefined,
            res.status,
        )
    }

    if (!res.ok) {
        const wrapped = isWrappedResponse<T>(body) ? body : null
        throw new SectionApiError(
            wrapped?.message ?? `${fallbackMessage} (HTTP ${res.status})`,
            wrapped?.code,
            wrapped?.errorCode,
            res.status,
        )
    }

    if (isWrappedResponse<T>(body)) {
        if (!body.isSuccess) {
            throw new SectionApiError(body.message ?? 'Request failed', body.code, body.errorCode, res.status)
        }
        return body.data
    }

    return body as T
}

// 섹션 응답들은 data 가 배열로 오기도 하고 { materials } / { cards } / { questions } 로 감싸 오기도 한다.
function toRawList(data: unknown, wrapperKey: string): Record<string, unknown>[] {
    if (Array.isArray(data)) return data as Record<string, unknown>[]
    if (data && typeof data === 'object') {
        const wrapped = (data as Record<string, unknown>)[wrapperKey]
        if (Array.isArray(wrapped)) return wrapped as Record<string, unknown>[]
    }
    return []
}

function toId(...candidates: unknown[]): number {
    for (const candidate of candidates) {
        if (typeof candidate === 'number') return candidate
        if (typeof candidate === 'string' && candidate.trim().length > 0) return Number(candidate)
    }
    return 0
}

function normalizeMaterial(raw: Record<string, unknown>, index: number): SectionMaterial {
    const contentText = (raw.contentText ?? {}) as MaterialContentText
    return {
        id: toId(raw.materialId, raw.id),
        type: String(raw.type ?? ''),
        sequence: typeof raw.sequence === 'number' ? raw.sequence : index + 1,
        isExtra: raw.isExtra === true,
        contentText,
    }
}

function normalizeCard(raw: Record<string, unknown>, index: number): SectionCard {
    return {
        id: toId(raw.cardId, raw.id),
        wordFront: String(raw.wordFront ?? ''),
        wordBack: String(raw.wordBack ?? ''),
        notes: typeof raw.notes === 'string' ? raw.notes : undefined,
        locales: (raw.locales ?? null) as SectionCard['locales'],
        audioUrl: typeof raw.audioUrl === 'string' ? raw.audioUrl : null,
        sequence: typeof raw.sequence === 'number' ? raw.sequence : index + 1,
        isScraped: raw.isScraped === true,
        scrapId: typeof raw.scrapId === 'string' ? raw.scrapId : null,
    }
}

export async function fetchSectionMaterials(
    sectionId: number,
    signal?: AbortSignal,
): Promise<SectionMaterialData | null> {
    const data = await fetchSectionResponse<unknown>(
        `${API_BASE_URL}/section/${sectionId}/material`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch materials',
    )

    if (data === null) return null

    return {
        sectionId,
        materials: toRawList(data, 'materials').map(normalizeMaterial),
    }
}

export async function fetchSectionCards(
    sectionId: number,
    signal?: AbortSignal,
): Promise<SectionCardData | null> {
    const data = await fetchSectionResponse<unknown>(
        `${API_BASE_URL}/section/${sectionId}/card`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch cards',
    )

    if (data === null) return null

    return {
        sectionId,
        cards: toRawList(data, 'cards').map(normalizeCard),
    }
}

// 문항 응답이 { sectionId, questions } 로 오기도 하고 배열로 바로 오기도 해서 한 모양으로 맞춘다.
// 식별자도 id / questionId 가 섞여 있어 둘 다 받는다.
function normalizeSectionQuestion(raw: Record<string, unknown>): SectionQuestion {
    const answer = raw.answer ?? raw.correctAnswer
    return {
        id: typeof raw.id === 'number' ? raw.id : Number(raw.questionId ?? raw.id ?? 0),
        type: String(raw.type ?? ''),
        questionText: String(raw.questionText ?? ''),
        options: Array.isArray(raw.options) ? raw.options.map((option) => String(option)) : [],
        blankCount: Number.isFinite(Number(raw.blankCount))
            ? Math.max(1, Math.trunc(Number(raw.blankCount)))
            : 1,
        answer: typeof answer === 'string' && answer.length > 0 ? answer : null,
        explanation: typeof raw.explanation === 'string' ? raw.explanation : null,
    }
}

export async function fetchSectionQuestions(
    sectionId: number,
    signal?: AbortSignal,
): Promise<SectionQuestionData | null> {
    const data = await fetchSectionResponse<unknown>(
        `${API_BASE_URL}/section/${sectionId}/question`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch questions',
    )

    if (data === null) return null

    return {
        sectionId,
        questions: toRawList(data, 'questions').map(normalizeSectionQuestion),
    }
}

// BigInt id 는 number 변환 시 정밀도가 깨질 수 있어 문자열 그대로 쓴다.
function toBigIntString(value: unknown): string {
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    return ''
}

function toNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function normalizeAnnotationTarget(raw: unknown): AnnotationTarget | null {
    if (!raw || typeof raw !== 'object') return null
    const record = raw as Record<string, unknown>
    return {
        mode: String(record.mode ?? ''),
        courseId: toNullableNumber(record.courseId),
        lessonId: toNullableNumber(record.lessonId),
        sectionId: toNullableNumber(record.sectionId),
        sectionType: String(record.sectionType ?? ''),
        cardId: toNullableNumber(record.cardId),
        materialId: toNullableNumber(record.materialId),
        pageNumber: toNullableNumber(record.pageNumber),
    }
}

function normalizeAnnotationConcept(raw: unknown): AnnotationConcept | null {
    if (!raw || typeof raw !== 'object') return null
    const record = raw as Record<string, unknown>
    return {
        id: toBigIntString(record.id),
        title: String(record.title ?? ''),
        explanation: record.explanation ?? null,
        target: normalizeAnnotationTarget(record.target),
    }
}

function normalizeAnnotation(raw: Record<string, unknown>): SectionAnnotation | null {
    const type = String(raw.type ?? '').toUpperCase()
    if (type !== 'VOCAB' && type !== 'GRAMMAR') return null

    const startOffset = toNullableNumber(raw.startOffset)
    const endOffset = toNullableNumber(raw.endOffset)
    if (startOffset === null || endOffset === null || startOffset < 0 || endOffset <= startOffset) {
        return null
    }

    return {
        id: toBigIntString(raw.id),
        type,
        startOffset,
        endOffset,
        surface: String(raw.surface ?? ''),
        posTags: Array.isArray(raw.posTags) ? raw.posTags.map((tag) => String(tag)) : [],
        confidence: toNullableNumber(raw.confidence),
        concept: normalizeAnnotationConcept(raw.concept),
    }
}

function normalizeAnnotationUnit(raw: Record<string, unknown>): AnnotationUnit {
    const annotations = Array.isArray(raw.annotations) ? raw.annotations : []
    return {
        id: toBigIntString(raw.id),
        materialId: toNullableNumber(raw.materialId) ?? 0,
        jsonPath: String(raw.jsonPath ?? ''),
        text: String(raw.text ?? ''),
        textHash: String(raw.textHash ?? ''),
        analysisStatus: String(raw.analysisStatus ?? ''),
        annotations: annotations
            .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
            .map(normalizeAnnotation)
            .filter((annotation): annotation is SectionAnnotation => annotation !== null),
    }
}

// GET /section/{id}/annotations — APPROVED annotation 만 내려온다.
// 기존 수업 API 는 그대로 두고 MARK 기능에서만 추가로 호출한다.
export async function fetchSectionAnnotations(
    sectionId: number,
    signal?: AbortSignal,
): Promise<SectionAnnotationsData | null> {
    const data = await fetchSectionResponse<unknown>(
        `${API_BASE_URL}/section/${sectionId}/annotations`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch annotations',
    )

    if (data === null || typeof data !== 'object') return null

    const record = data as Record<string, unknown>
    return {
        sectionId: toNullableNumber(record.sectionId) ?? sectionId,
        courseId: toNullableNumber(record.courseId),
        lessonId: toNullableNumber(record.lessonId),
        offsetEncoding: String(record.offsetEncoding ?? 'UTF16'),
        units: toRawList(record, 'units').map(normalizeAnnotationUnit),
    }
}

export async function checkSectionAnswer(
    sectionId: number,
    payload: SectionCheckAnswerRequest,
): Promise<SectionCheckAnswerData | null> {
    return fetchSectionResponse<SectionCheckAnswerData>(
        `${API_BASE_URL}/section/${sectionId}/questions/check`,
        {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify(payload),
        },
        'Failed to check answer',
    )
}

export async function saveSectionProgress(
    sectionId: number,
    payload: SaveProgressRequest,
    idempotencyKey?: string,
): Promise<SaveProgressData | null> {
    return fetchSectionResponse<SaveProgressData>(
        `${API_BASE_URL}/section/${sectionId}/progress`,
        {
            method: 'POST',
            headers: buildHeaders(
                idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
            ),
            body: JSON.stringify(payload),
        },
        'Failed to save progress',
    )
}

export function generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// GO TO LESSON 이동 전에 목적지 섹션이 실제로 열리는지 확인한다.
// 404 등으로 조회가 실패하거나 내용이 비어 있으면 이동하지 않는다.
// (비어 있는 채로 이동하면 수업 화면이 하드코딩 예시 내용으로 채워져
//  실제 목적지처럼 보이기 때문에 실패와 똑같이 취급한다.)
export async function isAnnotationTargetAvailable(
    sectionId: number,
    sectionType: string,
    signal?: AbortSignal,
): Promise<boolean> {
    if (!Number.isFinite(sectionId) || sectionId <= 0) return false

    const normalizedType = sectionType.trim().toUpperCase()
    try {
        if (normalizedType === 'VOCAB' || normalizedType === 'VOCABULARY') {
            const data = await fetchSectionCards(sectionId, signal)
            return (data?.cards.length ?? 0) > 0
        }

        const materials = await fetchSectionMaterials(sectionId, signal)
        if ((materials?.materials.length ?? 0) > 0) return true

        // READING/LISTENING 처럼 자료 없이 문항만 있는 섹션도 있어 한 번 더 확인한다.
        const questions = await fetchSectionQuestions(sectionId, signal)
        return (questions?.questions.length ?? 0) > 0
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        return false
    }
}
