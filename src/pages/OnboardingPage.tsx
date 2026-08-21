import { useMemo, useState } from 'react'
import './OnboardingPage.css'
import onboardingCharacter from '../assets/9.png'
import onboardingCompleteCharacter from '../assets/6.png'
import { AGE_RANGE_OPTIONS, isValidAgeRange } from '../data/ageRanges'
import {
  dailyStudyTimeChoices,
  koreanLevelChoices,
  learningGoalChoices,
  motherLanguageChoices,
  type OnboardingChoice,
} from '../data/onboardingPreferences'

interface OnboardingStep {
  id: string
  question: string
  type: 'text' | 'choice' | 'complete'
  placeholder?: string
  helper: string
  choiceStyle?: 'default' | 'compact' | 'short' | 'time' | 'goal'
  progressStyle?: 'default' | 'compact' | 'medium' | 'time' | 'goal'
  progressStep: number
  choices?: OnboardingChoice[]
  validator: (value: string) => boolean
}

interface OnboardingPageProps {
  onBack: () => void
  onComplete: (values: Record<string, string>) => void | Promise<void>
  isSaving?: boolean
  saveError?: string | null
}

interface OnboardingSaveErrorProps {
  message?: string | null
}

function OnboardingSaveError({ message }: OnboardingSaveErrorProps) {
  return message ? (
    <p className="onboarding-save-error" role="alert">
      {message}
    </p>
  ) : null
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
    progressStep: 2,
    choices: motherLanguageChoices,
    validator: (value) => motherLanguageChoices.some(({ id }) => id === value),
  },
  {
    id: 'koreanLevel',
    question: 'How much do you know\nKorean?',
    type: 'choice',
    helper: 'Korean Level',
    choiceStyle: 'compact',
    progressStyle: 'compact',
    progressStep: 3,
    choices: koreanLevelChoices,
    validator: (value) => koreanLevelChoices.some(({ id }) => id === value),
  },
  {
    id: 'ageRange',
    question: 'How old are you?',
    type: 'choice',
    helper: 'Age Range',
    choiceStyle: 'short',
    progressStyle: 'medium',
    progressStep: 4,
    choices: AGE_RANGE_OPTIONS,
    validator: (value) => isValidAgeRange(value),
  },
  {
    id: 'dailyStudyTime',
    question: 'How much time do you want\nto learn Korean? (a day)',
    type: 'choice',
    helper: 'Daily Study Time',
    choiceStyle: 'time',
    progressStyle: 'time',
    progressStep: 5,
    choices: dailyStudyTimeChoices,
    validator: (value) => dailyStudyTimeChoices.some(({ id }) => id === value),
  },
  {
    id: 'goal',
    question: 'What is your goal?',
    type: 'choice',
    helper: 'Goal',
    choiceStyle: 'goal',
    progressStyle: 'goal',
    progressStep: 6,
    choices: learningGoalChoices,
    validator: (value) => learningGoalChoices.some(({ id }) => id === value),
  },
  {
    id: 'complete',
    question: '',
    type: 'complete',
    helper: 'Completion',
    progressStep: 7,
    validator: () => true,
  },
]

const progressPointCount = 7
const progressEdgeInsetPercent = 3
const progressFillGapBeforeNextDotPercent = 1.5

function OnboardingPage({
  onBack,
  onComplete,
  isSaving = false,
  saveError = null,
}: OnboardingPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})

  const totalSteps = onboardingSteps.length
  const step = onboardingSteps[currentStep]
  const currentProgressStep = Math.min(step.progressStep, progressPointCount)
  const currentDotPercent =
    progressPointCount > 1
      ? progressEdgeInsetPercent +
        ((currentProgressStep - 1) / (progressPointCount - 1)) *
          (100 - progressEdgeInsetPercent * 2)
      : 100
  const nextDotPercent =
    progressPointCount > 1
      ? progressEdgeInsetPercent +
        (Math.min(currentProgressStep, progressPointCount - 1) / (progressPointCount - 1)) *
          (100 - progressEdgeInsetPercent * 2)
      : 100
  const progressFillWidth =
    currentProgressStep >= progressPointCount
      ? 100
      : Math.max(currentDotPercent, nextDotPercent - progressFillGapBeforeNextDotPercent)
  const isCompletionStep = step.type === 'complete'

  const moveToStep = (nextStep: number) => {
    setCurrentStep(nextStep - 1)
  }

  const isCurrentStepValid = useMemo(() => {
    return step.validator(values[step.id] ?? '')
  }, [step, values])

  const currentValue = values[step.id] ?? ''
  const shouldShowNameCharacter = step.id === 'name'

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
    <main className={`onboarding-screen ${step.id === 'name' ? 'onboarding-screen-name' : ''}`}>
      <section className="onboarding-content">
        {isCompletionStep ? null : (
          <>
            <header className="onboarding-header">
              {currentStep > 0 ? (
                <button
                  type="button"
                  className="onboarding-back"
                  onClick={handleBack}
                  aria-label="Go back"
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
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
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
              aria-label="Onboarding progress"
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
                    left: `${
                      progressPointCount > 1
                        ? progressEdgeInsetPercent +
                          (index / (progressPointCount - 1)) *
                            (100 - progressEdgeInsetPercent * 2)
                        : 100
                    }%`,
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
              <h1 className="onboarding-complete-title">Congratulations!</h1>
              <p className="onboarding-complete-description">
                Your account has been set up.
                <br />
                Log in to begin
              </p>
              <img
                className="onboarding-complete-character"
                src={onboardingCompleteCharacter}
                alt=""
                aria-hidden="true"
              />
              <button
                type="button"
                className="onboarding-complete-button"
                onClick={() => onComplete(values)}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Start'}
              </button>
              <OnboardingSaveError message={saveError} />
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
              {shouldShowNameCharacter ? (
                <img
                  className="onboarding-name-character"
                  src={onboardingCharacter}
                  alt=""
                  aria-hidden="true"
                />
              ) : null}

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
                  disabled={!isCurrentStepValid || isSaving}
                  onClick={handleNext}
                >
                  {isSaving ? 'Saving...' : 'Next'}
                </button>
              </div>
              <OnboardingSaveError message={saveError} />
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
                    disabled={isSaving}
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
