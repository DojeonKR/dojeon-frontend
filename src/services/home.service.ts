import type { HomeResumeData, HomeResumeResponse } from '../types/home.types.ts'
import { authenticatedFetch, getAuthToken } from './session.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const HOME_RESUME_ENDPOINT = `${API_BASE_URL}/home/resume`

export class HomeApiError extends Error {
    readonly code?: string
    readonly status?: number

    constructor(message: string, code?: string, status?: number) {
        super(message)
        this.name = 'HomeApiError'
        this.code = code
        this.status = status
    }
}

export async function fetchHomeResume(signal?: AbortSignal): Promise<HomeResumeData | null> {
    const token = getAuthToken()
    let res: Response

    try {
        res = await authenticatedFetch(HOME_RESUME_ENDPOINT, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal,
        })
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        const detail = error instanceof Error ? error.message : 'Unknown network error'
        throw new HomeApiError(`Network error while requesting ${HOME_RESUME_ENDPOINT}: ${detail}`)
    }

    let body: HomeResumeResponse | null = null
    const bodyText = await res.text()

    if (!bodyText.trim()) {
        if (!res.ok) {
            throw new HomeApiError(
                `Failed to fetch home resume (HTTP ${res.status})`,
                undefined,
                res.status,
            )
        }

        return null
    }

    try {
        body = JSON.parse(bodyText) as HomeResumeResponse
    } catch {
        if (!res.ok) {
            throw new HomeApiError(
                `Failed to fetch home resume (HTTP ${res.status})`,
                undefined,
                res.status,
            )
        }

        throw new HomeApiError(
            `Failed to parse home resume response (HTTP ${res.status})`,
            undefined,
            res.status,
        )
    }

    if (!res.ok) {
        if (res.status === 401) {
            throw new HomeApiError('Your session has expired. Please log in again.', body?.code, res.status)
        }

        throw new HomeApiError(
            body?.message ?? `Failed to fetch home resume (HTTP ${res.status})`,
            body?.code,
            res.status,
        )
    }

    if (!body.isSuccess) {
        throw new HomeApiError(body.message ?? 'Request failed', body.code, res.status)
    }

    return body.data
}
