export interface SubscriptionPlan {
  planId: string
  title: string
  priceText: string
  subText: string | null
  hasTrial: boolean
  billingCycleMonths: number
  priceIls?: number | null
  priceUsd?: number | null
  benefits: string[]
}

export interface SubscriptionPlanData {
  plans: SubscriptionPlan[]
}

export interface SubscriptionPlanResponse {
  isSuccess: boolean
  code: string
  message: string
  data: SubscriptionPlanData | null
  errorCode?: string
  timestamp: string
}
