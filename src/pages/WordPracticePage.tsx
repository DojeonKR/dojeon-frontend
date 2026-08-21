import { useState } from 'react'
import choiceCorrectImage from '../assets/1.png'
import choiceWrongImage from '../assets/11.png'
import { useSectionCards } from '../hooks/useSectionCards.ts'
import type { SectionCard } from '../types/section,types.ts'
import type { LanguageDirection } from './CustomizePracticePage.tsx'
import './WordPracticePage.css'

interface WordPracticePageProps {
  sectionId: number | null
  questionCount: number
  languageDirection: LanguageDirection
  sessionSeed: string
  onBack: () => void
  onExit: () => void
  onComplete: () => void
}

interface WordQuestion {
  id: string
  prompt: string
  answer: string
  options: string[]
}

interface WordPracticeSessionProps {
  cards: SectionCard[]
  questionCount: number
  languageDirection: LanguageDirection
  sessionSeed: string
  onExit: () => void
  onComplete: () => void
}

const hashSeed = (value: string) => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const shuffle = <T,>(items: readonly T[], seed: string) => {
  const result = [...items]
  let randomState = hashSeed(seed)

  for (let index = result.length - 1; index > 0; index -= 1) {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0
    const swapIndex = Math.floor((randomState / 4294967296) * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

const buildQuestions = (
  cards: SectionCard[],
  questionCount: number,
  languageDirection: LanguageDirection,
  sessionSeed: string,
): WordQuestion[] => {
  const isEnglishToKorean = languageDirection === 'english-to-korean'
  const practiceSeed = `${sessionSeed}:${languageDirection}:${questionCount}:${cards.map((card) => card.id).join(',')}`
  const selectedCards = shuffle(cards, practiceSeed).slice(
    0,
    Math.min(questionCount, cards.length),
  )

  return selectedCards.map((card, index) => {
    const prompt = isEnglishToKorean ? card.wordBack : card.wordFront
    const answer = isEnglishToKorean ? card.wordFront : card.wordBack
    const distractors = shuffle(
      cards
        .filter((candidate) => candidate.id !== card.id)
        .map((candidate) => (isEnglishToKorean ? candidate.wordFront : candidate.wordBack))
        .filter(
          (option, optionIndex, options) =>
            option !== answer && options.indexOf(option) === optionIndex,
        ),
      `${practiceSeed}:distractors:${card.id}`,
    ).slice(0, 3)

    return {
      id: `${card.id}-${index}`,
      prompt,
      answer,
      options: shuffle([answer, ...distractors], `${practiceSeed}:options:${card.id}`),
    }
  })
}

function WordPracticeSession({
  cards,
  questionCount,
  languageDirection,
  sessionSeed,
  onExit,
  onComplete,
}: WordPracticeSessionProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isGraded, setIsGraded] = useState(false)
  // 세션이 시작될 때 한 번만 생성해 background refetch가 진행 중 문제를 바꾸지 않게 한다.
  const [questions] = useState(() =>
    buildQuestions(cards, questionCount, languageDirection, sessionSeed),
  )

  const currentQuestion = questions[questionIndex]
  const isCorrect = isGraded && selectedAnswer === currentQuestion?.answer

  const handleNext = () => {
    if (!currentQuestion || selectedAnswer === null) return

    if (!isGraded) {
      setIsGraded(true)
      return
    }

    if (questionIndex >= questions.length - 1) {
      onComplete()
      return
    }

    setQuestionIndex((current) => current + 1)
    setSelectedAnswer(null)
    setIsGraded(false)
  }

  return (
    <main className={`word-practice-screen ${isGraded ? (isCorrect ? 'is-correct' : 'is-wrong') : ''}`}>
      <section className="word-practice-content">
        <header className="word-practice-header">
          <button type="button" className="word-practice-back" onClick={onExit} aria-label="Exit lesson">
            <svg className="word-practice-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1>Practice</h1>
        </header>

        {questions.length > 0 ? (
          <div
            className="word-practice-progress"
            role="list"
            aria-label={`${questionIndex + 1} of ${questions.length}`}
          >
            <span className="word-practice-progress-track" aria-hidden="true" />
            <span
              className="word-practice-progress-fill"
              style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
              aria-hidden="true"
            />
            {questions.map((question, index) => (
              <span
                key={question.id}
                role="listitem"
                aria-current={index === questionIndex ? 'step' : undefined}
                className={`word-practice-progress-dot ${
                  index <= questionIndex ? 'is-past' : 'is-upcoming'
                }`}
                style={{
                  left: `${
                    questions.length === 1 ? 3 : 3 + (index / (questions.length - 1)) * 94
                  }%`,
                }}
              />
            ))}
          </div>
        ) : null}

        {currentQuestion ? (
          <section className="word-practice-question">
            <p className="word-practice-instruction">Choose the correct answer</p>

            <article className="word-practice-card">
              <h2>{currentQuestion.prompt}</h2>
            </article>

            <div className="word-practice-options" role="radiogroup" aria-label="Answer options">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option
                const isCorrectOption = isGraded && option === currentQuestion.answer
                const isWrongOption = isGraded && isSelected && option !== currentQuestion.answer

                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`${isSelected && !isGraded ? 'is-selected' : ''} ${isCorrectOption ? 'is-correct' : ''} ${isWrongOption ? 'is-wrong' : ''}`}
                    disabled={isGraded}
                    onClick={() => setSelectedAnswer(option)}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}
      </section>

      {currentQuestion ? (
        <footer className="word-practice-footer">
          {isGraded ? (
            <div className="word-practice-feedback" aria-live="polite">
              <span className="word-practice-feedback-label">
                <span className="word-practice-feedback-icon" aria-hidden="true" />
                {isCorrect ? 'Good Job!' : 'Wrong'}
              </span>
              <span className="word-practice-feedback-art" aria-hidden="true">
                <span className="word-practice-feedback-mark" />
                <img src={isCorrect ? choiceCorrectImage : choiceWrongImage} alt="" />
              </span>
            </div>
          ) : null}
          <button
            type="button"
            className="word-practice-next"
            disabled={selectedAnswer === null}
            onClick={handleNext}
          >
            NEXT
          </button>
        </footer>
      ) : null}
    </main>
  )
}

function WordPracticeStatusPage({
  message,
  actionLabel,
  onAction,
  onExit,
}: {
  message: string
  actionLabel?: string
  onAction?: () => void
  onExit: () => void
}) {
  return (
    <main className="word-practice-screen">
      <section className="word-practice-content">
        <header className="word-practice-header">
          <button type="button" className="word-practice-back" onClick={onExit} aria-label="Exit lesson">
            <svg className="word-practice-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1>Practice</h1>
        </header>
        <div className="word-practice-status" role="status">
          <p>{message}</p>
          {actionLabel && onAction ? (
            <button type="button" onClick={onAction}>{actionLabel}</button>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function WordPracticePage({
  sectionId,
  questionCount,
  languageDirection,
  sessionSeed,
  onBack,
  onExit,
  onComplete,
}: WordPracticePageProps) {
  const { data, loading, error, refetch } = useSectionCards(sectionId)
  const cards = (data?.cards ?? []).filter(
    (card) => card.wordFront.trim().length > 0 && card.wordBack.trim().length > 0,
  )

  if (loading && !data) {
    return <WordPracticeStatusPage message="Loading vocabulary..." onExit={onExit} />
  }

  if (error && !data) {
    return (
      <WordPracticeStatusPage
        message="Could not load this lesson’s vocabulary."
        actionLabel="TRY AGAIN"
        onAction={() => void refetch()}
        onExit={onExit}
      />
    )
  }

  if (cards.length === 0) {
    return (
      <WordPracticeStatusPage
        message="There are no vocabulary cards in this lesson."
        actionLabel="BACK"
        onAction={onBack}
        onExit={onExit}
      />
    )
  }

  return (
    <WordPracticeSession
      key={sessionSeed}
      cards={cards}
      questionCount={questionCount}
      languageDirection={languageDirection}
      sessionSeed={sessionSeed}
      onExit={onExit}
      onComplete={onComplete}
    />
  )
}

export default WordPracticePage
