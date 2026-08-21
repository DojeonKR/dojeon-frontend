import { useState, type KeyboardEvent } from 'react'
import './CustomizePracticePage.css'

interface CustomizePracticePageProps {
  onExit: () => void
  onNext: (questionCount: number, languageDirection: LanguageDirection) => void
}

const questionCounts = [5, 10, 15, 20] as const

export type LanguageDirection = 'english-to-korean' | 'korean-to-english'

const languageDirections = [
  { value: 'english-to-korean', from: 'English', to: 'Korean' },
  { value: 'korean-to-english', from: 'Korean', to: 'English' },
] as const satisfies ReadonlyArray<{
  value: LanguageDirection
  from: string
  to: string
}>

const languageDirectionValues = languageDirections.map((option) => option.value)

const getNextOptionIndex = (
  event: KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  optionCount: number,
) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    return (currentIndex + 1) % optionCount
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    return (currentIndex - 1 + optionCount) % optionCount
  }

  if (event.key === 'Home') return 0
  if (event.key === 'End') return optionCount - 1

  return null
}

const moveRadioSelection = <T,>(
  event: KeyboardEvent<HTMLButtonElement>,
  options: readonly T[],
  currentIndex: number,
  onSelect: (value: T) => void,
) => {
  const nextIndex = getNextOptionIndex(event, currentIndex, options.length)
  if (nextIndex === null) return

  event.preventDefault()
  onSelect(options[nextIndex])

  const optionButtons =
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
  optionButtons?.[nextIndex]?.focus()
}

function CustomizePracticePage({
  onExit,
  onNext,
}: CustomizePracticePageProps) {
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | null>(null)
  const [selectedLanguageDirection, setSelectedLanguageDirection] =
    useState<LanguageDirection | null>(null)

  return (
    <main className="customize-practice-screen">
      <section className="customize-practice-content">
        <header className="customize-practice-header">
          <button
            type="button"
            className="customize-practice-back"
            onClick={onExit}
            aria-label="Exit lesson"
          >
            <svg
              className="customize-practice-back-icon"
              width="24"
              height="24"
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
          <h1 className="customize-practice-title">Customize Practice</h1>
        </header>

        <div className="customize-practice-form">
          <section className="customize-practice-option-section">
            <h2
              id="customize-practice-question-title"
              className="customize-practice-section-title"
            >
              How many questions?
            </h2>
            <div
              className="customize-practice-count-options"
              role="radiogroup"
              aria-labelledby="customize-practice-question-title"
            >
              {questionCounts.map((count, index) => {
                const isSelected = selectedQuestionCount === count

                return (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    className={`customize-practice-count-option ${
                      isSelected ? 'customize-practice-option-selected' : ''
                    }`}
                    aria-checked={isSelected}
                    tabIndex={isSelected || (selectedQuestionCount === null && index === 0) ? 0 : -1}
                    onClick={() => setSelectedQuestionCount(count)}
                    onKeyDown={(event) =>
                      moveRadioSelection(
                        event,
                        questionCounts,
                        index,
                        setSelectedQuestionCount,
                      )
                    }
                  >
                    {count}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="customize-practice-option-section">
            <h2
              id="customize-practice-language-title"
              className="customize-practice-section-title customize-practice-language-title"
            >
              Select language
            </h2>
            <div
              className="customize-practice-language-options"
              role="radiogroup"
              aria-labelledby="customize-practice-language-title"
            >
              {languageDirections.map(({ value, from, to }, index) => {
                const isSelected = selectedLanguageDirection === value

                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    className={`customize-practice-language-option ${
                      isSelected ? 'customize-practice-option-selected' : ''
                    }`}
                    aria-checked={isSelected}
                    tabIndex={
                      isSelected || (selectedLanguageDirection === null && index === 0) ? 0 : -1
                    }
                    onClick={() => setSelectedLanguageDirection(value)}
                    onKeyDown={(event) =>
                      moveRadioSelection(
                        event,
                        languageDirectionValues,
                        index,
                        setSelectedLanguageDirection,
                      )
                    }
                  >
                    <span>{from}</span>
                    <svg
                      className="customize-practice-direction-icon"
                      width="22"
                      height="27"
                      viewBox="0 0 22 27"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M7 0H15V14H22L11 27L0 14H7V0Z" fill="currentColor" />
                    </svg>
                    <span>{to}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <button
          type="button"
          className="customize-practice-next-button"
          disabled={!selectedQuestionCount || !selectedLanguageDirection}
          onClick={() => {
            if (selectedQuestionCount && selectedLanguageDirection) {
              onNext(selectedQuestionCount, selectedLanguageDirection)
            }
          }}
        >
          NEXT
        </button>
      </section>
    </main>
  )
}

export default CustomizePracticePage
