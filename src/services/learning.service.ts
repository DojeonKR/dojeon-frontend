import type {
    DashboardData,
    DashboardResponse,
} from '../types/dasboard.types.ts'
import type {
    LessonSectionsData,
    LessonSectionsResponse,
    LessonSectionType,
    UpdateLessonPreferencesData,
} from '../types/lessons.types.ts'
import { authenticatedFetch, getAuthToken } from './session.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class LearningApiError extends Error {
    readonly code?: string
    readonly errorCode?: string
    readonly status?: number

    constructor(message: string, code?: string, errorCode?: string, status?: number) {
        super(message)
        this.name = 'LearningApiError'
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

async function fetchLearningResponse<T extends { isSuccess: boolean; message?: string; code?: string; errorCode?: string; data: unknown }>(
    input: RequestInfo | URL,
    init: RequestInit,
    fallbackMessage: string,
): Promise<T> {
    let res: Response
    try {
        res = await authenticatedFetch(input, init)
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        throw new LearningApiError(fallbackMessage)
    }

    let body: T
    try {
        body = (await res.json()) as T
    } catch {
        if (!res.ok) {
            throw new LearningApiError(
                `${fallbackMessage} (HTTP ${res.status})`,
                undefined,
                undefined,
                res.status,
            )
        }

        throw new LearningApiError(
            `${fallbackMessage} (invalid JSON, HTTP ${res.status})`,
            undefined,
            undefined,
            res.status,
        )
    }

    if (!res.ok) {
        throw new LearningApiError(
            body.message ?? `${fallbackMessage} (HTTP ${res.status})`,
            body.code,
            body.errorCode,
            res.status,
        )
    }

    if (!body.isSuccess) {
        throw new LearningApiError(body.message ?? 'Request failed', body.code, body.errorCode, res.status)
    }

    return body
}

export async function fetchCoursesDashboard(
    signal?: AbortSignal,
): Promise<DashboardData | null> {
    const body = await fetchLearningResponse<DashboardResponse>(
        `${API_BASE_URL}/courses/dashboard`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch courses dashboard',
    )
    return body.data
}

export async function fetchLessonSections(
    lessonId: number,
    signal?: AbortSignal,
): Promise<LessonSectionsData | null> {
    const body = await fetchLearningResponse<LessonSectionsResponse>(
        `${API_BASE_URL}/lessons/${lessonId}/sections`,
        {
            method: 'GET',
            headers: buildHeaders(),
            signal,
        },
        'Failed to fetch lesson sections',
    )
    return body.data
}

export async function updateLessonPreferences(
    lessonId: number,
    selectedTypes: LessonSectionType[],
): Promise<UpdateLessonPreferencesData | null> {
    const body = await fetchLearningResponse<{
        isSuccess: boolean
        message?: string
        code?: string
        errorCode?: string
        data: UpdateLessonPreferencesData | null
    }>(
        `${API_BASE_URL}/lessons/${lessonId}/preferences`,
        {
            method: 'PUT',
            headers: buildHeaders(),
            body: JSON.stringify({ selectedTypes }),
        },
        'Failed to save lesson preferences',
    )
    return body.data
}
