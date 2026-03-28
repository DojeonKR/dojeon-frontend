import { useMemo, useState } from 'react'
import './OnboardingPage.css'

interface OnboardingStep {
  id: string
  question: string
  type: 'text' | 'choice' | 'complete'
  placeholder?: string
  helper: string
  choiceStyle?: 'default' | 'compact' | 'short' | 'time' | 'goal'
  progressStyle?: 'default' | 'compact' | 'medium' | 'time' | 'goal'
  progressStep: number
  choices?: {
    id: string
    label: string
  }[]
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
    type: 'text',
    placeholder: 'your username',
    helper: 'Name',
    progressStep: 1,
    validator: (value) => value.trim().length > 0,
  },
  {
    id: 'motherLanguage',
    question: 'What is your mother\nlanguage?',
    type: 'choice',
    helper: 'Mother Language',
    choiceStyle: 'default',
    progressStyle: 'default',
    progressStep: 1,
    choices: [
      { id: 'hebrew', label: 'Hebrew' },
      { id: 'english', label: 'English' },
    ],
    validator: (value) => value === 'hebrew' || value === 'english',
  },
  {
    id: 'koreanLevel',
    question: 'How much do you know\nKorean?',
    type: 'choice',
    helper: 'Korean Level',
    choiceStyle: 'compact',
    progressStyle: 'compact',
    progressStep: 2,
    choices: [
      { id: 'nothing', label: 'Nothing' },
      { id: 'only-hangul', label: 'Only hangul' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced', label: 'Advanced' },
    ],
    validator: (value) =>
      value === 'nothing' ||
      value === 'only-hangul' ||
      value === 'intermediate' ||
      value === 'advanced',
  },
  {
    id: 'ageRange',
    question: 'How old are you?',
    type: 'choice',
    helper: 'Age Range',
    choiceStyle: 'short',
    progressStyle: 'medium',
    progressStep: 3,
    choices: [
      { id: '0-17', label: '0-17' },
      { id: '18-24', label: '18-24' },
      { id: '25-34', label: '25-34' },
      { id: '35-44', label: '35-44' },
      { id: '45-54', label: '45-54' },
      { id: '55-64', label: '55-64' },
      { id: '65-plus', label: '65 -' },
    ],
    validator: (value) =>
      value === '0-17' ||
      value === '18-24' ||
      value === '25-34' ||
      value === '35-44' ||
      value === '45-54' ||
      value === '55-64' ||
      value === '65-plus',
  },
  {
    id: 'dailyStudyTime',
    question: 'How much time do you want\nto learn Korean? (a day)',
    type: 'choice',
    helper: 'Daily Study Time',
    choiceStyle: 'time',
    progressStyle: 'time',
    progressStep: 4,
    choices: [
      { id: '5-min', label: '5 min' },
      { id: '15-min', label: '15 min' },
      { id: '30-min', label: '30 min' },
      { id: '60-min', label: '60 min' },
    ],
    validator: (value) =>
      value === '5-min' ||
      value === '15-min' ||
      value === '30-min' ||
      value === '60-min',
  },
  {
    id: 'goal',
    question: 'What is your goal?',
    type: 'choice',
    helper: 'Goal',
    choiceStyle: 'goal',
    progressStyle: 'goal',
    progressStep: 5,
    choices: [
      { id: 'fun', label: 'Fun' },
      { id: 'tourism', label: 'Tourism' },
      { id: 'understanding-content', label: 'Understanding\nKorean content' },
      { id: 'study-in-korea', label: 'Study in Korea' },
      { id: 'work-in-korea', label: 'Work in Korea' },
      { id: 'others', label: 'Others' },
    ],
    validator: (value) =>
      value === 'fun' ||
      value === 'tourism' ||
      value === 'understanding-content' ||
      value === 'study-in-korea' ||
      value === 'work-in-korea' ||
      value === 'others',
  },
  {
    id: 'complete',
    question: '',
    type: 'complete',
    helper: 'Completion',
    progressStep: 5,
    validator: () => true,
  },
]

const progressPointCount = 5

function OnboardingPage({ onBack, onComplete }: OnboardingPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})

  const totalSteps = onboardingSteps.length
  const step = onboardingSteps[currentStep]
  const currentProgressStep = Math.min(step.progressStep, progressPointCount)
  const currentDotPercent =
    (currentProgressStep / (progressPointCount + 1)) * 100
  const progressFillWidth = Math.min(100, currentDotPercent + 3)
  const isCompletionStep = step.type === 'complete'

  const moveToStep = (nextStep: number) => {
    setCurrentStep(nextStep - 1)
  }

  const isCurrentStepValid = useMemo(() => {
    return step.validator(values[step.id] ?? '')
  }, [step, values])

  const currentValue = values[step.id] ?? ''

  const handleInputChange = (value: string) => {
    setValues((prev) => ({ ...prev, [step.id]: value }))
  }

  const handleChoiceSelect = (value: string) => {
    const nextValues = {
      ...values,
      [step.id]: value,
    }

    setValues(nextValues)

    if (currentStep + 1 < totalSteps) {
      const nextStep = currentStep + 2
      moveToStep(nextStep)
      return
    }

    onComplete(nextValues)
  }

  const handleNext = () => {
    if (!isCurrentStepValid) {
      return
    }

    const nextValues = {
      ...values,
      [step.id]: currentValue,
    }

    if (currentStep + 1 < totalSteps) {
      const nextStep = currentStep + 2
      moveToStep(nextStep)
      return
    }

    onComplete(nextValues)
  }

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep
      moveToStep(prevStep)
      return
    }
    onBack()
  }

  return (
    <main className="onboarding-screen">
      <section className="onboarding-content">
        {isCompletionStep ? null : (
          <>
            <header className="onboarding-header">
              <button
                type="button"
                className="onboarding-back"
                onClick={handleBack}
                aria-label="뒤로 가기"
              >
                <svg
                  className="onboarding-back-icon"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="#111111"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>

            <div
              className={`onboarding-progress ${
                step.progressStyle === 'compact'
                  ? 'onboarding-progress-compact'
                  : step.progressStyle === 'medium'
                    ? 'onboarding-progress-medium'
                    : step.progressStyle === 'time'
                      ? 'onboarding-progress-time'
                      : step.progressStyle === 'goal'
                        ? 'onboarding-progress-goal'
                        : ''
              }`}
              role="list"
              aria-label="온보딩 진행 단계"
            >
              <span className="progress-track" aria-hidden="true" />
              <span
                className="progress-fill"
                style={{
                  width: `${progressFillWidth}%`,
                }}
                aria-hidden="true"
              />
              {Array.from({ length: progressPointCount }).map((_, index) => (
                <span
                  key={index}
                  className={`progress-dot ${
                    index < currentProgressStep - 1
                      ? 'progress-dot-past'
                      : index === currentProgressStep - 1
                        ? 'progress-dot-current'
                        : 'progress-dot-upcoming'
                  }`}
                  style={{
                    left: `${((index + 1) / (progressPointCount + 1)) * 100}%`,
                  }}
                  role="listitem"
                  aria-current={index === currentProgressStep - 1 ? 'step' : undefined}
                />
              ))}
            </div>
          </>
        )}

        <section className="onboarding-body">
          {step.type === 'complete' ? (
            <div className="onboarding-complete">
              <div className="onboarding-complete-circle" aria-hidden="true" />
              <h1 className="onboarding-complete-title">Congratulations!</h1>
              <p className="onboarding-complete-description">
                Your account has been set up.
                <br />
                Log in to begin
              </p>
              <button
                type="button"
                className="onboarding-complete-button"
                onClick={() => onComplete(values)}
              >
                Start
              </button>
            </div>
          ) : (
            <>
              <h1
                className={`onboarding-question ${
                  step.type === 'choice' ? 'onboarding-question-centered' : ''
                }`}
              >
                {step.question}
              </h1>

              {step.type === 'text' ? (
            <>
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

              <div className="onboarding-actions">
                <button
                  type="button"
                  className={`onboarding-next-btn ${isCurrentStepValid ? '' : 'disabled'}`}
                  disabled={!isCurrentStepValid}
                  onClick={handleNext}
                >
                  Next
                </button>
              </div>
            </>
              ) : (
            <div className="onboarding-choice-wrap">
              <div
                className={`onboarding-choice-options ${
                  step.choiceStyle === 'compact'
                    ? 'onboarding-choice-options-compact'
                    : step.choiceStyle === 'short'
                      ? 'onboarding-choice-options-short onboarding-choice-options-scroll'
                      : step.choiceStyle === 'time'
                        ? 'onboarding-choice-options-time'
                        : step.choiceStyle === 'goal'
                          ? 'onboarding-choice-options-goal onboarding-choice-options-scroll'
                      : ''
                }`}
              >
                {step.choices?.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={`onboarding-choice-btn ${
                      step.choiceStyle === 'compact'
                        ? 'onboarding-choice-btn-compact'
                        : step.choiceStyle === 'short'
                          ? 'onboarding-choice-btn-short'
                          : step.choiceStyle === 'time'
                            ? 'onboarding-choice-btn-compact'
                            : step.choiceStyle === 'goal'
                              ? 'onboarding-choice-btn-goal'
                          : ''
                    } ${
                      currentValue === choice.id ? 'selected' : ''
                    }`}
                    onClick={() => {
                      handleChoiceSelect(choice.id)
                    }}
                  >
                    {choice.label}
                  </button>
                  ))}
              </div>
            </div>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  )
}

export default OnboardingPage
