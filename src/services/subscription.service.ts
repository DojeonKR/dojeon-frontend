import { authenticatedFetch, getAuthToken } from './session.ts'
import type {
  SubscriptionPlanData,
  SubscriptionPlanResponse,
} from '../types/subscription.types.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class SubscriptionApiError extends Error {
  readonly code?: string
  readonly errorCode?: string
  readonly status?: number

  constructor(message: string, code?: string, errorCode?: string, status?: number) {
    super(message)
    this.name = 'SubscriptionApiError'
    this.code = code
    this.errorCode = errorCode
    this.status = status
  }
}

function buildHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function fetchSubscriptionPlans(
  signal?: AbortSignal,
): Promise<SubscriptionPlanData | null> {
  let res: Response

  try {
    res = await authenticatedFetch(`${API_BASE_URL}/subscription/plan`, {
      method: 'GET',
      headers: buildHeaders(),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new SubscriptionApiError('Failed to fetch subscription plans')
  }

  let body: SubscriptionPlanResponse
  try {
    body = (await res.json()) as SubscriptionPlanResponse
  } catch {
    throw new SubscriptionApiError(
      `Failed to fetch subscription plans (HTTP ${res.status})`,
      undefined,
      undefined,
      res.status,
    )
  }

  if (!res.ok) {
    throw new SubscriptionApiError(
      body.message ?? `Failed to fetch subscription plans (HTTP ${res.status})`,
      body.code,
      body.errorCode,
      res.status,
    )
  }

  if (!body.isSuccess) {
    throw new SubscriptionApiError(body.message ?? 'Request failed', body.code, body.errorCode)
  }

  return body.data
}
