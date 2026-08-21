import type {
    PracticeTopic,
    PracticeTopicListData,
    PracticeQuestion,
    PracticeQuestionsData,
    CheckAnswerRequest,
    CheckAnswerData,
} from '../types/practice.types.ts'
import { authenticatedFetch, getAuthToken } from './session.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class PracticeApiError extends Error {
    readonly code?: string
    readonly errorCode?: string
    readonly status?: number

    constructor(message: string, code?: string, errorCode?: string, status?: number) {
        super(message)
        this.name = 'PracticeApiError'
        this.code = code
        this.errorCode = errorCode
        this.status = status
    }
}

function buildHeaders(): HeadersInit {
    const token = getAuthToken()
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

type PracticeApiResponse<T> = {
    isSuccess: boolean
    code: string
    message: string
    data: T | null
    errorCode?: string
    timestamp?: string
}

function isWrappedResponse<T>(body: unknown): body is PracticeApiResponse<T> {
    return Boolean(body && typeof body === 'object' && 'isSuccess' in body)
}

async function fetchPracticeResponse<T>(
    input: RequestInfo | URL,
    init: RequestInit,
    fallbackMessage: string,
): Promise<T | null> {
    let res: Response
    try {
        res = await authenticatedFetch(input, init)
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        throw new PracticeApiError(fallbackMessage)
    }

    const bodyText = await res.text()
    let body: unknown = null

    if (!bodyText.trim()) {
        if (!res.ok) {
            throw new PracticeApiError(
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
            throw new PracticeApiError(
                `${fallbackMessage} (HTTP ${res.status})`,
                undefined,
                undefined,
                res.status,
            )
        }

        throw new PracticeApiError(
            `${fallbackMessage} (invalid JSON, HTTP ${res.status})`,
            undefined,
            undefined,
            res.status,
        )
    }

    if (!res.ok) {
        const wrapped = isWrappedResponse<T>(body) ? body : null
        throw new PracticeApiError(
            wrapped?.message ?? `${fallbackMessage} (HTTP ${res.status})`,
            wrapped?.code,
            wrapped?.errorCode,
            res.status,
        )
    }

    if (isWrappedResponse<T>(body)) {
        if (!body.isSuccess) {
            throw new PracticeApiError(body.message ?? 'Request failed', body.code, body.errorCode, res.status)
        }
        return body.data
    }

    return body as T
}

// data 는 배열로 내려오지만, 혹시 { topics } / { questions } 로 감싸 오더라도 같은 모양으로 정규화한다.
function toArray(data: unknown, wrapperKey: string): Record<string, unknown>[] {
    if (Array.isArray(data)) return data as Record<string, unknown>[]
    if (data && typeof data === 'object') {
        const wrapped = (data as Record<string, unknown>)[wrapperKey]
        if (Array.isArray(wrapped)) return wrapped as Record<string, unknown>[]
    }
    return []
}

function toNumber(value: unknown): number {
    return typeof value === 'number' ? value : Number(value ?? 0)
}

function toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null
}

function normalizeTopic(raw: Record<string, unknown>): PracticeTopic {
    return {
        topicId: toNumber(raw.topicId ?? raw.id),
        titleEn: String(raw.titleEn ?? ''),
        isActive: raw.isActive !== false,
    }
}

function normalizeQuestion(raw: Record<string, unknown>): PracticeQuestion {
    return {
        questionId: toNumber(raw.questionId ?? raw.id),
        type: String(raw.type ?? ''),
        questionText: String(raw.questionText ?? ''),
        options: Array.isArray(raw.options) ? raw.options.map((option) => String(option)) : [],
        answer: toNullableString(raw.answer ?? raw.correctAnswer),
        explanation: toNullableString(raw.explanation),
    }
}

/**
 * GET /practice/topic — list of active practice topics.
 */
export async function fetchPracticeTopics(
    signal?: AbortSignal,
): Promise<PracticeTopicListData | null> {
    const data = await fetchPracticeResponse<unknown>(
        `${API_BASE_URL}/practice/topic`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch topics',
    )

    if (data === null) return null
    return toArray(data, 'topics').map(normalizeTopic)
}

/**
 * GET /practice/topic/{topicId}/question — questions for a given topic.
 * 응답에 `answer` 가 포함되어 오므로 채점은 앱에서 바로 할 수 있다.
 */
export async function fetchPracticeQuestions(
    topicId: number,
    signal?: AbortSignal,
): Promise<PracticeQuestionsData | null> {
    const data = await fetchPracticeResponse<unknown>(
        `${API_BASE_URL}/practice/topic/${topicId}/question`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch questions',
    )

    if (data === null) return null
    return toArray(data, 'questions').map(normalizeQuestion)
}

/**
 * POST /practice/topic/{topicId}/questions/check — grade a single answer.
 * On a wrong answer the backend returns only `{ correct: false }`.
 */
export async function checkPracticeAnswer(
    topicId: number,
    payload: CheckAnswerRequest,
): Promise<CheckAnswerData | null> {
    return fetchPracticeResponse<CheckAnswerData>(
        `${API_BASE_URL}/practice/topic/${topicId}/questions/check`,
        {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify(payload),
        },
        'Failed to check answer',
    )
}
