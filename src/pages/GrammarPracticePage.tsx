import { useRef, useState } from 'react'
import './GrammarPracticePage.css'
import checkIconWhite from '../assets/check_icon_white.svg'
import peopleIcon from '../assets/icon-park-solid_people.png'
import vectorIcon from '../assets/Vector1.png'

type PracticeStep =
  | 'choice'
  | 'fill'
  | 'make'
  | 'review'
  | 'reading'
  | 'listening'
  | 'next-grammar'

interface GrammarPracticePageProps {
  onBack: () => void
  language: string
  initialPracticeStep?: PracticeStep
}

interface PracticeStateSnapshot {
  practiceStep: PracticeStep
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
  listeningAnswer: string
  showListeningText: boolean
}

function GrammarPracticePage({
  onBack,
  language,
  initialPracticeStep = 'choice',
}: GrammarPracticePageProps) {
  const fillCorrectAnswer = '마시다'
  const makeCorrectAnswer = '준호씨가 커피를 마신다.'
  const [practiceStep, setPracticeStep] = useState<PracticeStep>(initialPracticeStep)
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
  const [listeningAnswer, setListeningAnswer] = useState('')
  const [showListeningText, setShowListeningText] = useState(false)
  const [listeningProgress, setListeningProgress] = useState(98 / 174)
  const [isListeningScrubbing, setIsListeningScrubbing] = useState(false)
  const [visibleExampleTranslations, setVisibleExampleTranslations] = useState<Record<number, boolean>>({})
  const [readingDragOffset, setReadingDragOffset] = useState(0)
  const [isReadingDragging, setIsReadingDragging] = useState(false)
  const readingDragStartXRef = useRef<number | null>(null)
  const readingDidDragRef = useRef(false)
  const listeningProgressRef = useRef<HTMLDivElement | null>(null)
  const isFillStep = practiceStep === 'fill'
  const isMakeStep = practiceStep === 'make'
  const isReviewStep = practiceStep === 'review'
  const isReadingStep = practiceStep === 'reading'
  const isListeningStep = practiceStep === 'listening'
  const isNextGrammarStep = practiceStep === 'next-grammar'
  const currentAnswer = isReviewStep
    ? ''
    : isReadingStep
    ? ''
    : isListeningStep
    ? ''
    : isNextGrammarStep
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
  const isListeningComplete = listeningAnswer.length > 0
  const listeningTotalSeconds = 174
  const listeningElapsedSeconds = Math.round(listeningTotalSeconds * listeningProgress)
  const listeningRemainingSeconds = Math.max(listeningTotalSeconds - listeningElapsedSeconds, 0)
  const isListeningTranscriptReady = listeningProgress >= 0.995
  const normalizedLanguage = language.trim().toLowerCase()
  const isTranslationRtl = normalizedLanguage === 'hebrew'
  const nextGrammarExamples =
    normalizedLanguage === 'hebrew'
      ? [
          { text: '같이 점심을 먹을까요?', translation: 'האם נאכל יחד צהריים?', side: 'left' as const },
          { text: '네, 같이 먹어요.', translation: 'כן, בוא/י נאכל יחד.', side: 'right' as const },
          { text: '그럼 12시에 만날까요?', translation: 'אז ניפגש ב-12?', side: 'left' as const },
          { text: '네, 좋아요.', translation: 'כן, מצוין.', side: 'right' as const },
        ]
      : [
          {
            text: '같이 점심을 먹을까요?',
            translation: 'Shall we eat lunch together?',
            side: 'left' as const,
          },
          { text: '네, 같이 먹어요.', translation: "Yes, let's eat together.", side: 'right' as const },
          {
            text: '그럼 12시에 만날까요?',
            translation: 'Then shall we meet at 12?',
            side: 'left' as const,
          },
          { text: '네, 좋아요.', translation: 'Yes, sounds good.', side: 'right' as const },
        ]
  const nextGrammarGridItems = ['', 'V -ㄹ까요?', '가다', '갈까요?', '', 'V-을까요?', '먹다', '먹을까요?']

  const formatListeningTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  }

  const updateListeningProgress = (clientX: number) => {
    const rect = listeningProgressRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    const nextProgress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setListeningProgress(nextProgress)
  }

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
    listeningAnswer,
    showListeningText,
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
    setListeningAnswer(snapshot.listeningAnswer)
    setShowListeningText(snapshot.showListeningText)
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
            <h1 className="grammar-practice-title">
              {isNextGrammarStep
                ? '을까요? 1)'
                : isListeningStep
                  ? 'Listening'
                  : isReadingStep
                    ? 'Reading'
                    : 'Practice'}
            </h1>
          </header>
        )}
        {isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep ? null : (
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
        {isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep ? null : (
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
              <button
                type="button"
                className="grammar-practice-review-action-button"
                onClick={() => {
                  pushHistory()
                  setPracticeStep('next-grammar')
                }}
              >
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
        {isNextGrammarStep ? (
          <section className="grammar-practice-next-grammar-screen">
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

            {showGrammar ? (
              <>
                <section className="grammar-practice-next-grammar-section">
                  <h2 className="grammar-practice-next-grammar-heading">Grammar explation</h2>
                  <div
                    className="grammar-practice-next-grammar-description"
                    dir="rtl"
                  >
                    <p className="grammar-practice-next-grammar-description-line">
                      הזמנה לפעולה.
                    </p>
                    <p className="grammar-practice-next-grammar-description-line">
                      "שנעשה (משהו)?"
                    </p>
                    <p className="grammar-practice-next-grammar-description-line">
                      זו צורת דיבור בלבד בפנייה לאדם כלשהו, עם
                    </p>
                    <p className="grammar-practice-next-grammar-description-line">
                      כוונה להציע לעשות משהו יחד.
                    </p>
                  </div>
                  <div className="grammar-practice-next-grammar-grid" aria-hidden="true">
                    {nextGrammarGridItems.map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        className={`grammar-practice-next-grammar-grid-box ${
                          index === 1 || index === 5
                            ? 'grammar-practice-next-grammar-grid-box-semibold'
                            : index === 2 || index === 3 || index === 6 || index === 7
                              ? 'grammar-practice-next-grammar-grid-box-medium'
                              : ''
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              </>
            ) : null}

            <section className="grammar-practice-next-grammar-examples-section">
              <h2 className="grammar-practice-next-grammar-heading">Examples</h2>
              <div className="grammar-practice-next-grammar-hero-row">
                <img
                  src={peopleIcon}
                  alt=""
                  className="grammar-practice-next-grammar-people-icon"
                  aria-hidden="true"
                />
                <div className="grammar-practice-next-grammar-bubble-stack">
                  <div className="grammar-practice-next-grammar-bubble-row">
                    <div className="grammar-practice-next-grammar-bubble">
                      <span className="grammar-practice-next-grammar-bubble-medium">
                        같이 점심을{' '}
                      </span>
                      <span className="grammar-practice-next-grammar-bubble-semibold">
                        먹을까요?
                      </span>
                    </div>
                    {showVocab ? (
                      <button
                        type="button"
                        className="grammar-practice-next-grammar-translation-toggle"
                        onClick={() =>
                          setVisibleExampleTranslations((prev) => ({
                            ...prev,
                            hero: !prev.hero,
                          }))
                        }
                        aria-label="번역 보기"
                      >
                        <img
                          src={vectorIcon}
                          alt=""
                          className="grammar-practice-next-grammar-translation-mark"
                          aria-hidden="true"
                        />
                      </button>
                    ) : null}
                  </div>
                  {showVocab && visibleExampleTranslations.hero ? (
                    <div
                      className="grammar-practice-next-grammar-translation grammar-practice-next-grammar-translation-left"
                      dir={isTranslationRtl ? 'rtl' : 'ltr'}
                    >
                      {nextGrammarExamples[0].translation}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grammar-practice-next-grammar-chat">
                {nextGrammarExamples.slice(1).map((example, index) => (
                  <div
                    key={`${example.text}-${index}`}
                    className={`grammar-practice-next-grammar-message grammar-practice-next-grammar-message-${example.side}`}
                  >
                    <img
                      src={peopleIcon}
                      alt=""
                      className="grammar-practice-next-grammar-avatar"
                      aria-hidden="true"
                    />
                    <div className="grammar-practice-next-grammar-bubble-stack">
                      <div className="grammar-practice-next-grammar-bubble-row">
                        <div className="grammar-practice-next-grammar-bubble">{example.text}</div>
                        {showVocab ? (
                          <button
                            type="button"
                            className="grammar-practice-next-grammar-translation-toggle"
                            onClick={() =>
                              setVisibleExampleTranslations((prev) => ({
                                ...prev,
                                [`chat-${index}`]: !prev[`chat-${index}`],
                              }))
                            }
                            aria-label="번역 보기"
                          >
                            <img
                              src={vectorIcon}
                              alt=""
                              className="grammar-practice-next-grammar-translation-mark"
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}
                      </div>
                      {showVocab && visibleExampleTranslations[`chat-${index}`] ? (
                        <div
                          className={`grammar-practice-next-grammar-translation grammar-practice-next-grammar-translation-${example.side}`}
                          dir={isTranslationRtl ? 'rtl' : 'ltr'}
                        >
                          {example.translation}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grammar-practice-next-grammar-actions">
              <button
                type="button"
                className="grammar-practice-next-grammar-action-button grammar-practice-next-grammar-action-button-back"
                onClick={handleBackPress}
              >
                BACK
              </button>
              <button type="button" className="grammar-practice-next-grammar-action-button">
                NEXT
              </button>
            </div>
          </section>
        ) : isListeningStep ? (
          <section className="grammar-practice-listening-screen">
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

            <div className="grammar-practice-listening-player">
              <button
                type="button"
                className="grammar-practice-listening-play"
                aria-label="재생"
              >
                <svg width="16" height="18" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                  <path d="M2 1.6L10 7L2 12.4V1.6Z" fill="currentColor" />
                </svg>
              </button>
              <span className="grammar-practice-listening-time">
                {formatListeningTime(listeningElapsedSeconds)}
              </span>
              <div
                ref={listeningProgressRef}
                className={`grammar-practice-listening-progress ${
                  isListeningScrubbing ? 'is-scrubbing' : ''
                }`}
                role="slider"
                aria-label="audio progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(listeningProgress * 100)}
                onPointerDown={(event) => {
                  setIsListeningScrubbing(true)
                  updateListeningProgress(event.clientX)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (!isListeningScrubbing) {
                    return
                  }

                  updateListeningProgress(event.clientX)
                }}
                onPointerUp={(event) => {
                  updateListeningProgress(event.clientX)
                  setIsListeningScrubbing(false)
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                }}
                onPointerCancel={(event) => {
                  setIsListeningScrubbing(false)
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                }}
              >
                <span
                  className="grammar-practice-listening-progress-fill"
                  style={{ width: `${Math.max(listeningProgress * 100, 2)}%` }}
                />
              </div>
              <span className="grammar-practice-listening-time">
                {formatListeningTime(listeningRemainingSeconds)}
              </span>
            </div>

            <div className="grammar-practice-listening-show-text-wrap">
              {showListeningText ? (
                <section className="grammar-practice-listening-script-card">
                  <p className="grammar-practice-listening-script-line">
                    <span className="grammar-practice-listening-script-speaker">남자</span>{' '}
                    토요일 몇 시에 만날까요?
                  </p>
                  <p className="grammar-practice-listening-script-line">
                    <span className="grammar-practice-listening-script-speaker">여자</span>{' '}
                    2시나 3시에 만나요.
                  </p>
                  <p className="grammar-practice-listening-script-line">
                    <span className="grammar-practice-listening-script-speaker">남자</span>{' '}
                    그럼 2시에 만나요.
                  </p>
                  <p className="grammar-practice-listening-script-line grammar-practice-listening-script-line-indented">
                    그런데 어디에서 만날까요?
                  </p>
                  <p className="grammar-practice-listening-script-line">
                    <span className="grammar-practice-listening-script-speaker">여자</span>{' '}
                    백화점 앞에서 만날까요?
                  </p>
                  <p className="grammar-practice-listening-script-line">
                    <span className="grammar-practice-listening-script-speaker">남자</span>{' '}
                    백화점 앞에는 사람이 많아요.
                  </p>
                  <p className="grammar-practice-listening-script-line grammar-practice-listening-script-line-indented">
                    2시에 서점 앞에서 만나요.
                  </p>
                  <p className="grammar-practice-listening-script-line">
                    <span className="grammar-practice-listening-script-speaker">여자</span>{' '}
                    네, 알았어요.
                  </p>
                </section>
              ) : (
                <button
                  type="button"
                  className={`grammar-practice-listening-show-text-button ${
                    isListeningTranscriptReady
                      ? 'grammar-practice-listening-show-text-button-active'
                      : ''
                  }`}
                  aria-hidden={!isListeningTranscriptReady}
                  tabIndex={isListeningTranscriptReady ? 0 : -1}
                  onClick={() => {
                    if (!isListeningTranscriptReady) {
                      return
                    }

                    setShowListeningText(true)
                  }}
                >
                  <svg
                    className="grammar-practice-listening-show-text-icon"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 4.5H17C18.1 4.5 19 5.4 19 6.5V17.5C19 18.6 18.1 19.5 17 19.5H7C5.9 19.5 5 18.6 5 17.5V6.5C5 5.4 5.9 4.5 7 4.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path d="M8 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 15H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>Show text</span>
                </button>
              )}
            </div>

            <div className="grammar-practice-listening-question-viewport">
              <div className="grammar-practice-listening-question-track">
                <section className="grammar-practice-reading-question-card grammar-practice-listening-question-card">
                  <p className="grammar-practice-reading-question-title">Question 1</p>
                  <p className="grammar-practice-reading-question-prompt">두 사람은 몇시에 만나요?</p>
                  <div className="grammar-practice-reading-options grammar-practice-listening-options">
                    {['2:00', '2:30', '3:00', '3:30'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`grammar-practice-reading-option-button grammar-practice-listening-option-button ${
                          listeningAnswer === option
                            ? 'grammar-practice-reading-option-button-selected'
                            : ''
                        }`}
                        onClick={() => setListeningAnswer(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </section>
                <section
                  className="grammar-practice-reading-question-card grammar-practice-listening-question-card grammar-practice-listening-question-card-peek"
                  aria-hidden="true"
                >
                  <p className="grammar-practice-reading-question-title">Question 2</p>
                </section>
              </div>
            </div>

            <div className="grammar-practice-reading-dots" aria-label="listening question progress">
              <span className="grammar-practice-reading-dot grammar-practice-reading-dot-active" />
              <span className="grammar-practice-reading-dot" />
            </div>

            <button
              type="button"
              className={`grammar-practice-reading-next-button ${
                isListeningComplete ? 'grammar-practice-reading-next-button-active' : ''
              }`}
              disabled={!isListeningComplete}
            >
              Next
            </button>
          </section>
        ) : isReadingStep ? (
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
              onClick={() => {
                if (!isReadingComplete) {
                  return
                }

                pushHistory()
                setListeningAnswer('')
                setShowListeningText(false)
                setPracticeStep('listening')
              }}
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
        {isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep ? null : (
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
