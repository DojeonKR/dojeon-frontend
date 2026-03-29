import { useRef, useState } from 'react'
import './GrammarPracticePage.css'
import checkIconWhite from '../assets/check_icon_white.svg'

interface GrammarPracticePageProps {
  onBack: () => void
}

interface PracticeStateSnapshot {
  practiceStep: 'choice' | 'fill' | 'make' | 'review' | 'reading'
  selectedAnswer: string
  revealedAnswers: string[]
  typedAnswer: string
  submittedTypedAnswer: string
  makeSentenceAnswer: string
  submittedMakeSentenceAnswer: string
  readingQuestionIndex: number
  readingAnswers: Record<number, string>
  readingBlankAnswers: {
    meeting: string
    reason: string
  }
}

function GrammarPracticePage({ onBack }: GrammarPracticePageProps) {
  const fillCorrectAnswer = '마시다'
  const makeCorrectAnswer = '준호씨가 커피를 마신다.'
  const [practiceStep, setPracticeStep] = useState<'choice' | 'fill' | 'make' | 'review' | 'reading'>('choice')
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [revealedAnswers, setRevealedAnswers] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [submittedTypedAnswer, setSubmittedTypedAnswer] = useState('')
  const [makeSentenceAnswer, setMakeSentenceAnswer] = useState('')
  const [submittedMakeSentenceAnswer, setSubmittedMakeSentenceAnswer] = useState('')
  const [history, setHistory] = useState<PracticeStateSnapshot[]>([])
  const [showGrammar, setShowGrammar] = useState(true)
  const [showVocab, setShowVocab] = useState(true)
  const [readingQuestionIndex, setReadingQuestionIndex] = useState(0)
  const [readingAnswers, setReadingAnswers] = useState<Record<number, string>>({})
  const [readingBlankAnswers, setReadingBlankAnswers] = useState({
    meeting: '',
    reason: '',
  })
  const [readingDragOffset, setReadingDragOffset] = useState(0)
  const [isReadingDragging, setIsReadingDragging] = useState(false)
  const readingDragStartXRef = useRef<number | null>(null)
  const readingDidDragRef = useRef(false)
  const isFillStep = practiceStep === 'fill'
  const isMakeStep = practiceStep === 'make'
  const isReviewStep = practiceStep === 'review'
  const isReadingStep = practiceStep === 'reading'
  const currentAnswer = isReviewStep
    ? ''
    : isReadingStep
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
  const readingQuestions = [
    {
      title: 'Question 1',
      prompt: '두 사람은 며칠에 만났어요?',
      type: 'choice',
      options: ['월요일', '수요일', '토요일', '일요일'],
    },
    {
      title: 'Question 2',
      prompt: '마리 씨는 왜 오늘 영화를 못 봐요?',
      type: 'blank',
    },
  ]
  const isReadingComplete =
    Boolean(readingAnswers[0]) &&
    readingBlankAnswers.meeting.trim().length > 0 &&
    readingBlankAnswers.reason.trim().length > 0
  const readingCardWidth = 350
  const readingCardGap = 8
  const readingTrackOffset = 24
  const readingTrackStride = readingCardWidth + readingCardGap
  const readingTrackTranslate =
    readingTrackOffset - readingQuestionIndex * readingTrackStride + readingDragOffset

  const currentSnapshot: PracticeStateSnapshot = {
    practiceStep,
    selectedAnswer,
    revealedAnswers,
    typedAnswer,
    submittedTypedAnswer,
    makeSentenceAnswer,
    submittedMakeSentenceAnswer,
    readingQuestionIndex,
    readingAnswers,
    readingBlankAnswers,
  }

  const applySnapshot = (snapshot: PracticeStateSnapshot) => {
    setPracticeStep(snapshot.practiceStep)
    setSelectedAnswer(snapshot.selectedAnswer)
    setRevealedAnswers(snapshot.revealedAnswers)
    setTypedAnswer(snapshot.typedAnswer)
    setSubmittedTypedAnswer(snapshot.submittedTypedAnswer)
    setMakeSentenceAnswer(snapshot.makeSentenceAnswer)
    setSubmittedMakeSentenceAnswer(snapshot.submittedMakeSentenceAnswer)
    setReadingQuestionIndex(snapshot.readingQuestionIndex)
    setReadingAnswers(snapshot.readingAnswers)
    setReadingBlankAnswers(snapshot.readingBlankAnswers)
  }

  const pushHistory = () => {
    setHistory((prev) => [
      ...prev,
      {
        ...currentSnapshot,
        revealedAnswers: [...currentSnapshot.revealedAnswers],
        readingAnswers: { ...currentSnapshot.readingAnswers },
        readingBlankAnswers: { ...currentSnapshot.readingBlankAnswers },
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
            <h1 className="grammar-practice-title">{isReadingStep ? 'Reading' : 'Practice'}</h1>
          </header>
        )}
        {isReviewStep || isReadingStep ? null : (
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
        {isReviewStep || isReadingStep ? null : (
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
              <button
                type="button"
                className="grammar-practice-review-action-button"
                onClick={() => {
                  pushHistory()
                  setPracticeStep('reading')
                }}
              >
                To reading
              </button>
            </div>
          </section>
        ) : null}
        {isReadingStep ? (
          <section className="grammar-practice-reading-screen">
            <div className="grammar-practice-reading-toggle-row">
              <div className="grammar-practice-reading-toggle-group">
                <span className="grammar-practice-reading-toggle-label">Show Grammar</span>
                <button
                  type="button"
                  className={`grammar-practice-reading-switch ${
                    showGrammar ? 'grammar-practice-reading-switch-active' : ''
                  }`}
                  onClick={() => setShowGrammar((prev) => !prev)}
                  aria-pressed={showGrammar}
                  aria-label="Show Grammar"
                >
                  <span className="grammar-practice-reading-switch-thumb" />
                </button>
              </div>

              <div className="grammar-practice-reading-toggle-group">
                <span className="grammar-practice-reading-toggle-label">Show Vocab</span>
                <button
                  type="button"
                  className={`grammar-practice-reading-switch ${
                    showVocab ? 'grammar-practice-reading-switch-active' : ''
                  }`}
                  onClick={() => setShowVocab((prev) => !prev)}
                  aria-pressed={showVocab}
                  aria-label="Show Vocab"
                >
                  <span className="grammar-practice-reading-switch-thumb" />
                </button>
              </div>
            </div>

            <section className="grammar-practice-reading-card">
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                  건우
                </span>{' '}
                마리{' '}
                씨, 오늘 같이 영화를 볼까요?
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                  마리
                </span>{' '}
                미안해요. 오늘은 회의가 있어요.
              </p>
              <p className="grammar-practice-reading-line grammar-practice-reading-line-indented">
                그래서 바빠요.
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                  건우
                </span>{' '}
                언제 시간이 있어요?
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                  마리
                </span>{' '}
                저는 토요일이나 일요일이 좋아요.
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                  건우
                </span>{' '}
                그럼 토요일에 만날까요?
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                  마리
                </span>{' '}
                네, 좋아요. 토요일에 만나요.
              </p>
            </section>

            <div
              className="grammar-practice-reading-question-viewport"
              onPointerDown={(e) => {
                readingDragStartXRef.current = e.clientX
                readingDidDragRef.current = false
                setIsReadingDragging(true)
              }}
              onPointerMove={(e) => {
                if (readingDragStartXRef.current === null) {
                  return
                }

                const deltaX = e.clientX - readingDragStartXRef.current
                if (Math.abs(deltaX) > 8) {
                  readingDidDragRef.current = true
                }
                setReadingDragOffset(deltaX)
              }}
              onPointerUp={() => {
                if (readingDragStartXRef.current === null) {
                  return
                }

                if (readingDragOffset <= -40 && readingQuestionIndex < readingQuestions.length - 1) {
                  setReadingQuestionIndex((prev) => prev + 1)
                }

                if (readingDragOffset >= 40 && readingQuestionIndex > 0) {
                  setReadingQuestionIndex((prev) => prev - 1)
                }

                readingDragStartXRef.current = null
                setReadingDragOffset(0)
                setIsReadingDragging(false)
                window.setTimeout(() => {
                  readingDidDragRef.current = false
                }, 0)
              }}
              onPointerLeave={() => {
                if (readingDragStartXRef.current === null) {
                  return
                }

                readingDragStartXRef.current = null
                setReadingDragOffset(0)
                setIsReadingDragging(false)
                window.setTimeout(() => {
                  readingDidDragRef.current = false
                }, 0)
              }}
              onPointerCancel={() => {
                readingDragStartXRef.current = null
                setReadingDragOffset(0)
                setIsReadingDragging(false)
                readingDidDragRef.current = false
              }}
            >
              <div
                className={`grammar-practice-reading-question-track ${
                  isReadingDragging ? 'is-dragging' : ''
                }`}
                style={{ transform: `translateX(${readingTrackTranslate}px)` }}
              >
                {readingQuestions.map((question, index) => (
                  <section key={question.title} className="grammar-practice-reading-question-card">
                    <p className="grammar-practice-reading-question-title">{question.title}</p>
                    <p className="grammar-practice-reading-question-prompt">{question.prompt}</p>
                    {question.type === 'choice' ? (
                      <div className="grammar-practice-reading-options">
                        {question.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`grammar-practice-reading-option-button ${
                              readingAnswers[index] === option
                                ? 'grammar-practice-reading-option-button-selected'
                                : ''
                            }`}
                            onClick={() => {
                              if (readingDidDragRef.current) {
                                return
                              }

                              setReadingAnswers((prev) => ({
                                ...prev,
                                [index]: option,
                              }))

                              if (index < readingQuestions.length - 1) {
                                setReadingQuestionIndex(index + 1)
                              }
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grammar-practice-reading-blank-group">
                        <p className="grammar-practice-reading-blank-line">
                          오늘은
                          <input
                            type="text"
                            className="grammar-practice-reading-inline-blank"
                            value={readingBlankAnswers.meeting}
                            onPointerDown={(event) => event.stopPropagation()}
                            onPointerUp={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              setReadingBlankAnswers((prev) => ({
                                ...prev,
                                meeting: event.target.value,
                              }))
                            }
                          />
                          이/가 있어요.
                        </p>
                        <p className="grammar-practice-reading-blank-line">
                          그래서
                          <input
                            type="text"
                            className="grammar-practice-reading-inline-blank"
                            value={readingBlankAnswers.reason}
                            onPointerDown={(event) => event.stopPropagation()}
                            onPointerUp={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              setReadingBlankAnswers((prev) => ({
                                ...prev,
                                reason: event.target.value,
                              }))
                            }
                          />
                          .
                        </p>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>

            <div className="grammar-practice-reading-dots" aria-label="reading question progress">
              {readingQuestions.map((question, index) => (
                <span
                  key={question.title}
                  className={`grammar-practice-reading-dot ${
                    index === readingQuestionIndex ? 'grammar-practice-reading-dot-active' : ''
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              className={`grammar-practice-reading-next-button ${
                isReadingComplete ? 'grammar-practice-reading-next-button-active' : ''
              }`}
              disabled={!isReadingComplete}
            >
              Next
            </button>
          </section>
        ) : !isReviewStep && isMakeStep ? (
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
        {isReviewStep || isReadingStep ? null : (
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
