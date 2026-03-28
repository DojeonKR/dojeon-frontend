import { useMemo, useState } from 'react'
import './OnboardingPage.css'

interface OnboardingStep {
  id: string
  question: string
  placeholder: string
  helper: string
  validator: (value: string) => boolean
}

interface OnboardingPageProps {
  onBack: () => void
  onComplete: (values: Record<string, string>) => void
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'name',
    question: 'What is your name?',
    placeholder: 'Enter your name',
    helper: 'Name',
    validator: (value) => value.trim().length > 0,
  },
]

function OnboardingPage({ onBack, onComplete }: OnboardingPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})

  const totalSteps = onboardingSteps.length
  const step = onboardingSteps[currentStep]

  const isCurrentStepValid = useMemo(() => {
    return step.validator(values[step.id] ?? '')
  }, [step, values])

  const currentValue = values[step.id] ?? ''

  const handleInputChange = (value: string) => {
    setValues((prev) => ({ ...prev, [step.id]: value }))
  }

  const handleNext = () => {
    if (!isCurrentStepValid) {
      return
    }

    if (currentStep + 1 < totalSteps) {
      setCurrentStep((prev) => prev + 1)
      return
    }

    onComplete(values)
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      return
    }
    onBack()
  }

  return (
    <main className="onboarding-screen">
      <section className="onboarding-content">
        <header className="onboarding-header">
          <button
            type="button"
            className="onboarding-back"
            onClick={handleBack}
            aria-label="뒤로 가기"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="#111111"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <div className="onboarding-progress" role="list" aria-label="온보딩 진행 단계">
          {onboardingSteps.map((_, index) => (
            <span
              key={index}
              className={`progress-dot ${index <= currentStep ? 'active' : ''}`}
              role="listitem"
              aria-current={index === currentStep ? 'step' : undefined}
            />
          ))}
        </div>

        <section className="onboarding-body">
          <h1 className="onboarding-question">{step.question}</h1>
          <label className="onboarding-field-wrap" htmlFor="onboarding-input">
            <span className="sr-only">{step.helper}</span>
            <input
              id="onboarding-input"
              className="onboarding-input"
              type="text"
              inputMode="text"
              autoComplete="name"
              placeholder={step.placeholder}
              value={currentValue}
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </label>

          <button
            type="button"
            className={`onboarding-next-btn ${isCurrentStepValid ? '' : 'disabled'}`}
            disabled={!isCurrentStepValid}
            onClick={handleNext}
          >
            Next
          </button>
        </section>
      </section>
    </main>
  )
}

export default OnboardingPage
