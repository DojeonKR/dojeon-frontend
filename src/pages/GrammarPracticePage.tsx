import { useState } from 'react'
import './GrammarPracticePage.css'
import checkIconWhite from '../assets/check_icon_white.svg'

interface GrammarPracticePageProps {
  onBack: () => void
}

interface PracticeStateSnapshot {
  practiceStep: 'choice' | 'fill' | 'make' | 'review'
  selectedAnswer: string
  revealedAnswers: string[]
  typedAnswer: string
  submittedTypedAnswer: string
  makeSentenceAnswer: string
  submittedMakeSentenceAnswer: string
}

function GrammarPracticePage({ onBack }: GrammarPracticePageProps) {
  const fillCorrectAnswer = '마시다'
  const makeCorrectAnswer = '준호씨가 커피를 마신다.'
  const [practiceStep, setPracticeStep] = useState<'choice' | 'fill' | 'make' | 'review'>('choice')
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [revealedAnswers, setRevealedAnswers] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [submittedTypedAnswer, setSubmittedTypedAnswer] = useState('')
  const [makeSentenceAnswer, setMakeSentenceAnswer] = useState('')
  const [submittedMakeSentenceAnswer, setSubmittedMakeSentenceAnswer] = useState('')
  const [history, setHistory] = useState<PracticeStateSnapshot[]>([])
  const isFillStep = practiceStep === 'fill'
  const isMakeStep = practiceStep === 'make'
  const isReviewStep = practiceStep === 'review'
  const currentAnswer = isReviewStep
    ? ''
    : isMakeStep
    ? submittedMakeSentenceAnswer
    : isFillStep
      ? submittedTypedAnswer
      : selectedAnswer
  const correctAnswer = isMakeStep ? makeCorrectAnswer : fillCorrectAnswer
  const isAnswered = currentAnswer.length > 0
  const isCorrectAnswer = currentAnswer === correctAnswer
  const isWrongAnswer = isAnswered && !isCorrectAnswer

  const currentSnapshot: PracticeStateSnapshot = {
    practiceStep,
    selectedAnswer,
    revealedAnswers,
    typedAnswer,
    submittedTypedAnswer,
    makeSentenceAnswer,
    submittedMakeSentenceAnswer,
  }

  const applySnapshot = (snapshot: PracticeStateSnapshot) => {
    setPracticeStep(snapshot.practiceStep)
    setSelectedAnswer(snapshot.selectedAnswer)
    setRevealedAnswers(snapshot.revealedAnswers)
    setTypedAnswer(snapshot.typedAnswer)
    setSubmittedTypedAnswer(snapshot.submittedTypedAnswer)
    setMakeSentenceAnswer(snapshot.makeSentenceAnswer)
    setSubmittedMakeSentenceAnswer(snapshot.submittedMakeSentenceAnswer)
  }

  const pushHistory = () => {
    setHistory((prev) => [
      ...prev,
      {
        ...currentSnapshot,
        revealedAnswers: [...currentSnapshot.revealedAnswers],
      },
    ])
  }

  const handleBackPress = () => {
    if (history.length > 0) {
      const previousSnapshot = history[history.length - 1]
      setHistory((prev) => prev.slice(0, -1))
      applySnapshot(previousSnapshot)
      return
    }

    onBack()
  }

  return (
    <main className="grammar-practice-screen">
      <section className="grammar-practice-content">
        {isReviewStep ? (
          <header className="grammar-practice-header grammar-practice-header-review">
            <button
              type="button"
              className="grammar-practice-close"
              onClick={onBack}
              aria-label="닫기"
            >
              <svg
                className="grammar-practice-close-icon"
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M21 9L9 21M9 9L21 21"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h1 className="grammar-practice-title">Review</h1>
          </header>
        ) : (
          <header className="grammar-practice-header">
            <button
              type="button"
              className="grammar-practice-back"
              onClick={handleBackPress}
              aria-label="뒤로 가기"
            >
              <svg
                className="grammar-practice-back-icon"
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
            <h1 className="grammar-practice-title">Practice</h1>
          </header>
        )}
        {isReviewStep ? null : (
        <div className="grammar-practice-progress" role="list" aria-label="grammar practice progress">
          <span className="grammar-practice-progress-track" aria-hidden="true" />
          <span
            className="grammar-practice-progress-fill"
            style={{ width: '17.5%' }}
            aria-hidden="true"
          />
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className={`grammar-practice-progress-dot ${
                index <= 0
                  ? 'grammar-practice-progress-dot-past'
                  : 'grammar-practice-progress-dot-upcoming'
              }`}
              style={{
                left: `${((index + 1) / 7) * 100}%`,
              }}
              role="listitem"
              aria-current={index === 0 ? 'step' : undefined}
            />
          ))}
        </div>
        )}
        {isReviewStep ? null : (
        <p className="grammar-practice-guide">
          {isMakeStep
            ? 'Make your own sentance.'
            : isFillStep
              ? 'Fill in the blanks.'
              : 'Choose the correct answer.'}
        </p>
        )}
        {isReviewStep ? (
          <section className="grammar-practice-review-screen">
            <section className="grammar-practice-review-section">
              <h2 className="grammar-practice-review-question">How was this class?</h2>
              <div className="grammar-practice-review-choice-row" role="list" aria-label="class difficulty">
                <button type="button" className="grammar-practice-review-choice-button" role="listitem" aria-label="Easy" />
                <button type="button" className="grammar-practice-review-choice-button" role="listitem" aria-label="Normal" />
                <button type="button" className="grammar-practice-review-choice-button" role="listitem" aria-label="Hard" />
              </div>
              <div className="grammar-practice-review-label-row grammar-practice-review-label-row-three">
                <span>easy</span>
                <span>normal</span>
                <span>hard</span>
              </div>
            </section>

            <section className="grammar-practice-review-section grammar-practice-review-section-complete">
              <h2 className="grammar-practice-review-subtitle">Mark has complete?</h2>
              <div className="grammar-practice-review-choice-row grammar-practice-review-choice-row-binary" role="list" aria-label="mark complete">
                <button type="button" className="grammar-practice-review-choice-button" role="listitem" aria-label="Yes" />
                <button type="button" className="grammar-practice-review-choice-button" role="listitem" aria-label="No" />
              </div>
              <div className="grammar-practice-review-label-row grammar-practice-review-label-row-binary">
                <span>YES</span>
                <span>NO</span>
              </div>
            </section>

            <section className="grammar-practice-review-section grammar-practice-review-section-notebook">
              <h2 className="grammar-practice-review-question">
                Save grammer to personal notebook?
              </h2>
              <div className="grammar-practice-review-choice-row grammar-practice-review-choice-row-binary" role="list" aria-label="save grammar to personal notebook">
                <button type="button" className="grammar-practice-review-choice-button" role="listitem" aria-label="Yes" />
                <button type="button" className="grammar-practice-review-choice-button" role="listitem" aria-label="No" />
              </div>
              <div className="grammar-practice-review-label-row grammar-practice-review-label-row-binary">
                <span>YES</span>
                <span>NO</span>
              </div>
            </section>

            <div className="grammar-practice-review-action-row">
              <button type="button" className="grammar-practice-review-action-button">
                Next grammer
              </button>
              <button type="button" className="grammar-practice-review-action-button">
                To reading
              </button>
            </div>
          </section>
        ) : null}
        {!isReviewStep && isMakeStep ? (
          <>
            <section
              className={`grammar-practice-question-card grammar-practice-question-card-make ${
                isCorrectAnswer ? 'grammar-practice-question-card-correct' : ''
              } ${
                isWrongAnswer ? 'grammar-practice-question-card-wrong' : ''
              }`}
            >
              <div className="grammar-practice-question-stack grammar-practice-question-stack-make">
                {isCorrectAnswer ? (
                  <div className="grammar-practice-correct-feedback grammar-practice-correct-feedback-make">
                    <span className="grammar-practice-correct-icon">
                      <img
                        src={checkIconWhite}
                        alt=""
                        className="grammar-practice-correct-icon-mark"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="grammar-practice-correct-text">잘했어요!</span>
                  </div>
                ) : null}
                {isWrongAnswer ? (
                  <div className="grammar-practice-wrong-feedback">
                    <span className="grammar-practice-wrong-icon" aria-hidden="true">
                      <svg
                        className="grammar-practice-wrong-icon-mark"
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M8 2L2 8M2 2L8 8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="grammar-practice-wrong-text">틀렸어요!</span>
                  </div>
                ) : null}
                <div className="grammar-practice-make-row" aria-label="sentence building prompt">
                  <span className="grammar-practice-make-token">준호</span>
                  <span className="grammar-practice-make-divider" aria-hidden="true" />
                  <span className="grammar-practice-make-token">커피</span>
                  <span className="grammar-practice-make-divider" aria-hidden="true" />
                  <span className="grammar-practice-make-token">마시다</span>
                </div>
                <div className="grammar-practice-answer-column grammar-practice-answer-column-make">
                  <div className="grammar-practice-make-input-wrap">
                    <input
                      type="text"
                      className="grammar-practice-answer-input"
                      value={makeSentenceAnswer}
                      enterKeyHint="done"
                      onChange={(e) => {
                        setMakeSentenceAnswer(e.target.value)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          pushHistory()
                          setSubmittedMakeSentenceAnswer(makeSentenceAnswer.trim())
                        }
                      }}
                    />
                  </div>
                  {isWrongAnswer ? (
                    <p className="grammar-practice-correct-answer grammar-practice-correct-answer-make">
                      {makeCorrectAnswer}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
            <div className="grammar-practice-learn-more-wrap">
              <button type="button" className="grammar-practice-learn-more-button">
                Learn more
              </button>
            </div>
          </>
        ) : !isReviewStep ? (
          <>
            <section
              className={`grammar-practice-question-card ${
                isCorrectAnswer ? 'grammar-practice-question-card-correct' : ''
              } ${
                isWrongAnswer ? 'grammar-practice-question-card-wrong' : ''
              }`}
            >
              <div className="grammar-practice-question-stack">
                {isCorrectAnswer ? (
                  <div className="grammar-practice-correct-feedback">
                    <span className="grammar-practice-correct-icon">
                      <img
                        src={checkIconWhite}
                        alt=""
                        className="grammar-practice-correct-icon-mark"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="grammar-practice-correct-text">잘했어요!</span>
                  </div>
                ) : null}
                {isWrongAnswer ? (
                  <div className="grammar-practice-wrong-feedback">
                    <span className="grammar-practice-wrong-icon" aria-hidden="true">
                      <svg
                        className="grammar-practice-wrong-icon-mark"
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M8 2L2 8M2 2L8 8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="grammar-practice-wrong-text">틀렸어요!</span>
                  </div>
                ) : null}
                <div className="grammar-practice-question-row">
                  <p className="grammar-practice-question-text">준호씨가 커피를</p>
                  <div className="grammar-practice-answer-column">
                    {isFillStep ? (
                      <input
                      type="text"
                      className="grammar-practice-answer-input"
                      value={typedAnswer}
                      enterKeyHint="done"
                        onChange={(e) => {
                          setTypedAnswer(e.target.value)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            pushHistory()
                            setSubmittedTypedAnswer(typedAnswer.trim())
                          }
                        }}
                      />
                    ) : (
                      <div className="grammar-practice-answer-slot">
                        {isAnswered ? selectedAnswer : null}
                      </div>
                    )}
                    {isFillStep && isWrongAnswer ? (
                      <p className="grammar-practice-correct-answer grammar-practice-correct-answer-fill">
                        마시다
                      </p>
                    ) : null}
                  </div>
                  <span className="grammar-practice-question-dot">.</span>
                </div>
              </div>
            </section>
            {isFillStep ? (
              <div className="grammar-practice-learn-more-wrap">
                <button type="button" className="grammar-practice-learn-more-button">
                  Learn more
                </button>
              </div>
            ) : (
              <>
                <div className="grammar-practice-options" role="list">
                  {['마시다', '먹다', '보다', '가다'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`grammar-practice-option-button ${
                        revealedAnswers.includes(option) && option === '마시다'
                          ? 'grammar-practice-option-button-correct'
                          : revealedAnswers.includes(option)
                            ? 'grammar-practice-option-button-wrong'
                          : ''
                      }`}
                      role="listitem"
                      onClick={() => {
                        pushHistory()
                        setSelectedAnswer(option)
                        setRevealedAnswers((prev) =>
                          prev.includes(option) ? prev : [...prev, option],
                        )
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="grammar-practice-hint-wrap">
                  <button type="button" className="grammar-practice-hint-button">
                    Show hint
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}
        {isReviewStep ? null : (
        <button
          type="button"
          className={`grammar-practice-next-button ${
            isFillStep || isMakeStep ? 'grammar-practice-next-button-fill' : ''
          }`}
          onClick={() => {
            if (isWrongAnswer) {
              return
            }

            if (practiceStep === 'choice') {
              pushHistory()
              setPracticeStep('fill')
              setTypedAnswer('')
              setSubmittedTypedAnswer('')
              return
            }

            if (practiceStep === 'fill') {
              pushHistory()
              setPracticeStep('make')
              setMakeSentenceAnswer('')
              setSubmittedMakeSentenceAnswer('')
              return
            }

            if (practiceStep === 'make') {
              pushHistory()
              setPracticeStep('review')
            }
          }}
        >
          Next
        </button>
        )}
      </section>
    </main>
  )
}

export default GrammarPracticePage
