import { useEffect, useState } from 'react'
import './SubscriptionPage.css'
import graduationCapIcon from '../assets/graduation-cap_icon.svg'
import groupOutlineIcon from '../assets/group-outline_icon.svg'
import bookLineIcon from '../assets/mingcute_book-6-line_icon.svg'
import sparksIcon from '../assets/sparks_icon.svg'
import closeRoundedIcon from '../assets/close-rounded_icon.svg'
import { useSubscriptionPlans } from '../hooks/useSubscriptionPlans'
import { isUnauthorizedError } from '../services/apiError'
import type { SubscriptionPlan } from '../types/subscription.types'

interface SubscriptionPageProps {
  currentSubscriptionPlanId: string | null
  currentSubscriptionTier: string
  subscriptionExpiresAt: string | null
  onClose: () => void
  onUnauthorized: () => void
}

type SelectionMode = 'free' | 'trial' | 'pro'

const benefitIcons = [graduationCapIcon, groupOutlineIcon, bookLineIcon, sparksIcon]
const normalizePlanId = (planId: string) => planId.trim().toLowerCase()
const isFreeTier = (tier: string) => tier.trim().toUpperCase() === 'FREE'
const isTrialTier = (tier: string) => tier.trim().toUpperCase() === 'TRIAL'
const isFreePlan = (plan: SubscriptionPlan) => normalizePlanId(plan.planId) === 'free'
const hasSamePlanId = (left: string, right: string | null) =>
  right !== null && normalizePlanId(left) === normalizePlanId(right)

const formatDuration = (months: number) => {
  if (months === 1) return '1 month'
  if (months === 12) return '1 year'
  return `${months} months`
}

const SubscriptionCheckIcon = () => (
  <svg
    className="subscription-page-check"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 13L10 18L19 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
    />
  </svg>
)

function SubscriptionPage({
  currentSubscriptionPlanId,
  currentSubscriptionTier,
  subscriptionExpiresAt,
  onClose,
  onUnauthorized,
}: SubscriptionPageProps) {
  const { data, loading, error, refetch } = useSubscriptionPlans(true)
  const isUnauthorized = isUnauthorizedError(error)
  const [openedAt] = useState(() => Date.now())
  const hasActiveTrial = isTrialTier(currentSubscriptionTier)
    && (!subscriptionExpiresAt || new Date(subscriptionExpiresAt).getTime() > openedAt)
  const [selectedMode, setSelectedMode] = useState<SelectionMode>(() => {
    if (hasActiveTrial) return 'trial'
    return isFreeTier(currentSubscriptionTier) ? 'free' : 'pro'
  })
  const [selectedPlanId, setSelectedPlanId] = useState(currentSubscriptionPlanId ?? '')

  useEffect(() => {
    if (isUnauthorized) onUnauthorized()
  }, [isUnauthorized, onUnauthorized])

  const plans = data?.plans ?? []
  const backendFreePlan = plans.find(isFreePlan)
  const trialPlan = plans.find((plan) => plan.hasTrial)
  const paidPlans = plans.filter((plan) => !isFreePlan(plan) && !plan.hasTrial)
  const defaultPaidPlan = paidPlans.find((plan) =>
    hasSamePlanId(plan.planId, currentSubscriptionPlanId),
  )
    ?? paidPlans[0]
  const selectedPlan = paidPlans.find((plan) => hasSamePlanId(plan.planId, selectedPlanId))
    ?? defaultPaidPlan
  const activePlan = selectedMode === 'free'
    ? backendFreePlan
    : selectedMode === 'trial'
      ? trialPlan
      : selectedPlan
  const benefits = activePlan?.benefits?.length
    ? activePlan.benefits
    : plans.at(-1)?.benefits ?? []

  const selectPro = () => {
    setSelectedMode('pro')
    setSelectedPlanId(selectedPlan?.planId ?? defaultPaidPlan?.planId ?? '')
  }

  const actionText = selectedMode === 'trial'
    ? 'Current Trial'
    : selectedMode === 'pro'
      ? `Subscribe ${formatDuration(selectedPlan?.billingCycleMonths ?? 1)}`
      : 'Keep Free Plan'

  if (isUnauthorized) return null

  return (
    <main className="subscription-page">
      <header className="subscription-page-header">
        <button
          type="button"
          className="subscription-page-close"
          onClick={onClose}
          aria-label="Close subscription page"
        >
          <img src={closeRoundedIcon} alt="" aria-hidden="true" />
        </button>
        <h1>What subscription gives you</h1>
      </header>

      <div className="subscription-page-scroll">
        {loading ? (
          <p className="subscription-page-status">Loading...</p>
        ) : error ? (
          <div className="subscription-page-status" role="alert">
            <p>{error.message || 'Unable to load plans.'}</p>
            <button type="button" onClick={() => void refetch()}>Retry</button>
          </div>
        ) : (
          <>
            <ul className="subscription-page-benefits" aria-label="Subscription benefits">
              {benefits.slice(0, 4).map((benefit, index) => (
                <li key={`${benefit}-${index}`}>
                  <img src={benefitIcons[index]} alt="" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <fieldset className="subscription-page-plans">
              <legend>Subscription plans</legend>
              {backendFreePlan ? (
                <label className={selectedMode === 'free' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="subscription-mode"
                    checked={selectedMode === 'free'}
                    onChange={() => setSelectedMode('free')}
                  />
                  <span>{backendFreePlan.title}</span>
                  {selectedMode === 'free' ? <SubscriptionCheckIcon /> : null}
                </label>
              ) : null}

              {hasActiveTrial && trialPlan ? (
                <label className={selectedMode === 'trial' ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="subscription-mode"
                    checked={selectedMode === 'trial'}
                    onChange={() => {
                      setSelectedMode('trial')
                      setSelectedPlanId(trialPlan?.planId ?? '')
                    }}
                  />
                  <span>{trialPlan?.title}</span>
                  {selectedMode === 'trial' ? <SubscriptionCheckIcon /> : null}
                </label>
              ) : null}

              {paidPlans.length > 0 ? (
                <section className={`subscription-page-pro ${selectedMode === 'pro' ? 'is-selected' : ''}`}>
                  <button type="button" onClick={selectPro}>
                    <span>Pro Plan</span>
                    {selectedMode === 'pro' ? <SubscriptionCheckIcon /> : null}
                  </button>
                  {selectedMode === 'pro' ? (
                    <div className="subscription-page-pro-options">
                      {paidPlans.map((plan) => (
                        <label key={plan.planId} className={selectedPlan?.planId === plan.planId ? 'is-active' : ''}>
                          <input
                            type="radio"
                            name="subscription-plan"
                            checked={selectedPlan?.planId === plan.planId}
                            onChange={() => setSelectedPlanId(plan.planId)}
                          />
                          <span className="subscription-page-radio" aria-hidden="true" />
                          <span className="subscription-page-plan-name">{plan.title}</span>
                          <span className="subscription-page-price">
                            {plan.priceText}
                            {plan.subText ? <small>({plan.subText})</small> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </fieldset>
          </>
        )}
      </div>

      <footer className="subscription-page-footer">
        <button
          type="button"
          disabled={
            loading
            || Boolean(error)
            || !data
            || selectedMode === 'pro'
            || selectedMode === 'trial'
          }
          onClick={() => {
            onClose()
          }}
        >
          {actionText}
        </button>
      </footer>
    </main>
  )
}

export default SubscriptionPage
