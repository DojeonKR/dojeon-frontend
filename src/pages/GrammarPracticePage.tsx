import { useEffect, useMemo, useRef, useState } from 'react'
import './GrammarPracticePage.css'
import exampleRightImage from '../assets/7.png'
import exampleLeftImage from '../assets/10.png'
import rulesImage from '../assets/5.png'
import choiceCorrectImage from '../assets/1.png'
import choiceWrongImage from '../assets/11.png'
import reviewEasyImage from '../assets/2.png'
import reviewNormalImage from '../assets/10.png'
import reviewHardImage from '../assets/11.png'
import vectorIcon from '../assets/Vector1.png'
import { useSectionQuestions } from '../hooks/useSectionQuestioins.ts'
import { useSectionMaterials } from '../hooks/useSectionMaterials.ts'
import { useCheckSectionAnswer } from '../hooks/useCheckSectionAnswer.ts'
import { useSaveSectionProgress } from '../hooks/useSaveSectionProgress.ts'
import { useCreateScrap } from '../hooks/useCreateScrap.ts'

export type PracticeStep =
  | 'choice'
  | 'fill-intro'
  | 'fill'
  | 'make-intro'
  | 'make'
  | 'review'
  | 'reading'
  | 'listening'
  | 'next-grammar'
  | 'next-grammar-rules'

interface GrammarPracticePageProps {
  onBack: () => void
  language: string
  sectionId: number | null
  initialPracticeStep?: PracticeStep
}

interface PracticeStateSnapshot {
  practiceStep: PracticeStep
  selectedAnswer: string
  revealedAnswers: string[]
  choiceFeedback: ChoiceFeedback | null
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

type NextGrammarNoteId = 'future-proposal' | 'polite-ending'
type NextGrammarVocabId = 'yes' | 'together' | 'lunch' | 'eat'

type NextGrammarDialogState =
  | { kind: 'grammar'; id: NextGrammarNoteId }
  | { kind: 'vocab'; id: NextGrammarVocabId }

interface NextGrammarExampleToken {
  text: string
  grammarId?: NextGrammarNoteId
  vocabId?: NextGrammarVocabId
  emphasis?: 'medium' | 'semibold'
}

interface NextGrammarExampleMessage {
  id: string
  side: 'left' | 'right'
  translation: string
  tokens: NextGrammarExampleToken[]
}

type ReviewDifficulty = 'EASY' | 'NORMAL' | 'HARD'
type ChoiceFeedback = {
  answer: string
  result: 'correct' | 'wrong'
  phase: 'flash' | 'settled'
}

function GrammarPracticePage({
  onBack,
  language,
  sectionId,
  initialPracticeStep = 'choice',
}: GrammarPracticePageProps) {
  const { data: questionsData, loading: questionsLoading } = useSectionQuestions(sectionId)
  const { data: materialsData } = useSectionMaterials(sectionId)
  const checkAnswer = useCheckSectionAnswer()
  const saveProgress = useSaveSectionProgress()
  const createScrap = useCreateScrap()

  const firstMcq = useMemo(() => {
    return questionsData?.questions.find((q) => q.type === 'MCQ') ?? null
  }, [questionsData])

  const grammarMaterialId = useMemo(() => {
    return materialsData?.materials.find((m) => m.type === 'GRAMMAR_TABLE')?.id ?? null
  }, [materialsData])

  const fallbackChoicePrompt = '준호씨가 커피를'
  const fallbackChoiceOptions = ['마시다', '먹다', '보다', '가다']
  const fallbackCorrectChoice = '마시다'

  const fillCorrectAnswer = '마시다'
  const makeCorrectAnswer = '준호씨가 커피를 마신다.'

  const choicePrompt = firstMcq?.questionText ?? fallbackChoicePrompt
  const choiceOptions = firstMcq?.options ?? fallbackChoiceOptions

  const [serverGradedAnswers, setServerGradedAnswers] = useState<Record<string, boolean>>({})

  const [practiceStep, setPracticeStep] = useState<PracticeStep>(initialPracticeStep)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [revealedAnswers, setRevealedAnswers] = useState<string[]>([])
  const [choiceFeedback, setChoiceFeedback] = useState<ChoiceFeedback | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [submittedTypedAnswer, setSubmittedTypedAnswer] = useState('')
  const [makeSentenceAnswer, setMakeSentenceAnswer] = useState('')
  const [submittedMakeSentenceAnswer, setSubmittedMakeSentenceAnswer] = useState('')
  const [history, setHistory] = useState<PracticeStateSnapshot[]>([])
  const [showGrammar, setShowGrammar] = useState(true)
  const [showVocab, setShowVocab] = useState(false)
  const [readingQuestionIndex, setReadingQuestionIndex] = useState(0)
  const [readingAnswers, setReadingAnswers] = useState<Record<number, string>>({})
  const [readingBlankAnswers, setReadingBlankAnswers] = useState({ meeting: '', reason: '' })
  const [listeningAnswer, setListeningAnswer] = useState('')
  const [showListeningText, setShowListeningText] = useState(false)
  const [listeningProgress, setListeningProgress] = useState(98 / 174)
  const [isListeningScrubbing, setIsListeningScrubbing] = useState(false)
  const [visibleExampleTranslations, setVisibleExampleTranslations] = useState<Record<string, boolean>>({})
  const [activeNextGrammarDialog, setActiveNextGrammarDialog] = useState<NextGrammarDialogState | null>(null)
  const [readingDragOffset, setReadingDragOffset] = useState(0)
  const [isReadingDragging, setIsReadingDragging] = useState(false)

  const [reviewDifficulty, setReviewDifficulty] = useState<ReviewDifficulty>('NORMAL')
  const [reviewMarkComplete, setReviewMarkComplete] = useState<boolean | null>(null)
  const [reviewSaveScrap, setReviewSaveScrap] = useState<boolean | null>(null)

  const readingDragStartXRef = useRef<number | null>(null)
  const readingDragOffsetRef = useRef(0)
  const readingDidDragRef = useRef(false)
  const listeningProgressRef = useRef<HTMLDivElement | null>(null)
  const nextGrammarLessonRef = useRef<HTMLElement | null>(null)

  const isFillStep = practiceStep === 'fill'
  const isFillIntroStep = practiceStep === 'fill-intro'
  const isMakeIntroStep = practiceStep === 'make-intro'
  const isMakeStep = practiceStep === 'make'
  const isChoiceStep = practiceStep === 'choice'
  const isReviewStep = practiceStep === 'review'
  const isReadingStep = practiceStep === 'reading'
  const isListeningStep = practiceStep === 'listening'
  const isNextGrammarStep = practiceStep === 'next-grammar'
  const isNextGrammarRulesStep = practiceStep === 'next-grammar-rules'

  const currentAnswer = isFillIntroStep || isMakeIntroStep
    ? ''
    : isReviewStep
    ? ''
    : isReadingStep
    ? ''
    : isListeningStep
    ? ''
    : isNextGrammarRulesStep
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

  let isCorrectAnswer: boolean
  let isWrongAnswer: boolean
  if (isFillIntroStep || isMakeIntroStep || isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep || isNextGrammarRulesStep) {
    isCorrectAnswer = false
    isWrongAnswer = false
  } else if (!isFillStep && !isMakeStep) {
    isCorrectAnswer = isAnswered && serverGradedAnswers[currentAnswer] === true
    isWrongAnswer = isAnswered && serverGradedAnswers[currentAnswer] === false
  } else {
    isCorrectAnswer = currentAnswer === correctAnswer
    isWrongAnswer = isAnswered && !isCorrectAnswer
  }
  const shouldShowChoiceFeedback =
    isChoiceStep &&
    choiceFeedback !== null &&
    choiceFeedback.answer === selectedAnswer &&
    serverGradedAnswers[selectedAnswer] !== undefined
  const showChoiceFeedbackFlash = shouldShowChoiceFeedback && choiceFeedback.phase === 'flash'
  const showChoiceFeedbackPanel = shouldShowChoiceFeedback && choiceFeedback.phase === 'settled'
  const isChoiceCorrectFeedback = shouldShowChoiceFeedback && choiceFeedback?.result === 'correct'
  const choiceFeedbackImage = isChoiceCorrectFeedback ? choiceCorrectImage : choiceWrongImage
  const showFillResultPanel = isFillStep && isAnswered && (isCorrectAnswer || isWrongAnswer)
  const fillResultImage = isCorrectAnswer ? choiceCorrectImage : choiceWrongImage
  const showMakeResultPanel = isMakeStep && isAnswered && (isCorrectAnswer || isWrongAnswer)
  const makeResultImage = isCorrectAnswer ? choiceCorrectImage : choiceWrongImage
  const canMoveToNextPracticeStep =
    isAnswered && !checkAnswer.isPending && (!isChoiceStep || showChoiceFeedbackPanel)

  const readingQuestions = [
    {
      title: 'Question 1',
      prompt: '두 사람은 며칠에 만났어요?',
      type: 'choice',
      options: ['월요일', '수요일', '토요일', '일요일'],
      correctAnswer: '토요일',
    },
    { title: 'Question 2', prompt: '마리 씨는 왜 오늘 영화를 못 봐요?', type: 'blank' },
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
  const progressDotPositions = [3, 21.8, 40.6, 59.4, 78.2, 97]
  const normalizedLanguage = language.trim().toLowerCase()
  const isTranslationRtl = normalizedLanguage === 'hebrew'
  const nextGrammarExamples: NextGrammarExampleMessage[] = [
    {
      id: 'proposal',
      side: 'left',
      translation:
        normalizedLanguage === 'hebrew'
          ? 'האם נאכל יחד צהריים?'
          : 'Shall we eat lunch together?',
      tokens: [
        { text: '같이', vocabId: 'together' },
        { text: ' ', emphasis: 'medium' },
        { text: '점심', vocabId: 'lunch' },
        { text: '을 ', emphasis: 'medium' },
        { text: '먹을까요?', grammarId: 'future-proposal', vocabId: 'eat', emphasis: 'semibold' },
      ],
    },
    {
      id: 'reply',
      side: 'right',
      translation:
        normalizedLanguage === 'hebrew'
          ? 'כן, בוא/י נאכל יחד.'
          : 'Yes, let’s eat together.',
      tokens: [
        { text: '네', vocabId: 'yes' },
        { text: ', ', emphasis: 'medium' },
        { text: '같이', vocabId: 'together' },
        { text: ' ', emphasis: 'medium' },
        { text: '먹어요.', grammarId: 'polite-ending', vocabId: 'eat' },
      ],
    },
  ]
  const nextGrammarGridItems = ['', 'V -ㄹ까요?', '가다', '갈까요?', '', 'V-을까요?', '먹다', '먹을까요?']
  const nextGrammarNotes: Record<NextGrammarNoteId, { title: string; description: string }> = {
    'future-proposal': {
      title: '-(으)ㄹ까요?',
      description:
        '-(으)ㄹ까요? is used to suggest doing something together or to ask someone’s opinion in a polite way. Use -ㄹ까요? after a vowel or ㄹ, and -을까요? after other final consonants.',
    },
    'polite-ending': {
      title: '-아/어/해요',
      description:
        '아요/어요/해요 is a polite informal sentence ending used in everyday conversations with people you’re not very close to, but in casual settings. Use -아요 after ㅏ/ㅗ vowels, -어요 after other vowels, and -해요 with 하다 verbs.',
    },
  }
  const nextGrammarVocabNotes: Record<NextGrammarVocabId, { title: string; description: string }> = {
    yes: { title: '네', description: 'yes' },
    together: { title: '같이', description: 'together' },
    lunch: { title: '점심', description: 'lunch' },
    eat: { title: '먹다', description: 'to eat' },
  }

  const formatListeningTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  }
  const updateListeningProgress = (clientX: number) => {
    const rect = listeningProgressRef.current?.getBoundingClientRect()
    if (!rect) return
    const nextProgress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setListeningProgress(nextProgress)
  }
  const toggleShowGrammar = () => {
    if (showGrammar) {
      setShowGrammar(false)
      setActiveNextGrammarDialog(null)
      return
    }
    setShowGrammar(true)
    setShowVocab(false)
    setActiveNextGrammarDialog(null)
  }
  const toggleShowVocab = () => {
    if (showVocab) {
      setShowVocab(false)
      setActiveNextGrammarDialog(null)
      return
    }
    setShowVocab(true)
    setShowGrammar(false)
    setActiveNextGrammarDialog(null)
  }
  const handleNextGrammarMarkPress = (noteId: NextGrammarNoteId) => {
    if (!showGrammar) return
    setActiveNextGrammarDialog((prev) =>
      prev?.kind === 'grammar' && prev.id === noteId ? null : { kind: 'grammar', id: noteId },
    )
  }
  const handleNextVocabMarkPress = (noteId: NextGrammarVocabId) => {
    if (!showVocab) return
    setActiveNextGrammarDialog((prev) =>
      prev?.kind === 'vocab' && prev.id === noteId ? null : { kind: 'vocab', id: noteId },
    )
  }
  const handleGoToNextGrammarLesson = () => {
    setActiveNextGrammarDialog(null)
    nextGrammarLessonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const resetPracticeFlow = () => {
    setSelectedAnswer('')
    setRevealedAnswers([])
    setChoiceFeedback(null)
    setTypedAnswer('')
    setSubmittedTypedAnswer('')
    setMakeSentenceAnswer('')
    setSubmittedMakeSentenceAnswer('')
    setServerGradedAnswers({})
  }
  const isNextGrammarDialogActive = (
    kind: NextGrammarDialogState['kind'],
    id: NextGrammarNoteId | NextGrammarVocabId,
  ) => activeNextGrammarDialog?.kind === kind && activeNextGrammarDialog.id === id

  const renderNextGrammarExampleMark = (
    text: string,
    weightClass: 'grammar-practice-next-grammar-bubble-medium' | 'grammar-practice-next-grammar-bubble-semibold',
    options: { grammarId?: NextGrammarNoteId; vocabId?: NextGrammarVocabId },
  ) => {
    if (showGrammar && options.grammarId) {
      return (
        <button
          type="button"
          className={`grammar-practice-next-grammar-mark-button ${weightClass} grammar-practice-next-grammar-bubble-grammar-mark ${
            isNextGrammarDialogActive('grammar', options.grammarId) ? 'is-selected' : ''
          }`}
          onClick={() => handleNextGrammarMarkPress(options.grammarId!)}
        >
          {text}
        </button>
      )
    }
    if (showVocab && options.vocabId) {
      return (
        <button
          type="button"
          className={`grammar-practice-next-grammar-mark-button ${weightClass} grammar-practice-next-grammar-bubble-vocab-mark ${
            isNextGrammarDialogActive('vocab', options.vocabId) ? 'is-selected' : ''
          }`}
          onClick={() => handleNextVocabMarkPress(options.vocabId!)}
        >
          {text}
        </button>
      )
    }
    return <span className={weightClass}>{text}</span>
  }
  const renderNextGrammarExampleTokens = (tokens: NextGrammarExampleToken[]) =>
    tokens.map((token, index) => {
      const weightClass =
        token.emphasis === 'semibold'
          ? 'grammar-practice-next-grammar-bubble-semibold'
          : 'grammar-practice-next-grammar-bubble-medium'

      if (!token.grammarId && !token.vocabId) {
        return <span key={`${token.text}-${index}`} className={weightClass}>{token.text}</span>
      }

      return (
        <span key={`${token.text}-${index}`}>
          {renderNextGrammarExampleMark(token.text, weightClass, {
            grammarId: token.grammarId,
            vocabId: token.vocabId,
          })}
        </span>
      )
    })

  const currentSnapshot: PracticeStateSnapshot = {
    practiceStep,
    selectedAnswer,
    revealedAnswers,
    choiceFeedback,
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
    setChoiceFeedback(snapshot.choiceFeedback)
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

  const handleChoiceOptionClick = async (option: string) => {
    pushHistory()
    setSelectedAnswer(option)
    setChoiceFeedback(null)
    setRevealedAnswers((prev) => (prev.includes(option) ? prev : [...prev, option]))

    if (!firstMcq) {
      const isCorrectChoice = option === fallbackCorrectChoice
      setServerGradedAnswers((prev) => ({
        ...prev,
        [option]: isCorrectChoice,
      }))
      setChoiceFeedback({ answer: option, result: isCorrectChoice ? 'correct' : 'wrong', phase: 'flash' })
      return
    }

    if (sectionId === null) return

    try {
      const result = await checkAnswer.mutateAsync({
        sectionId,
        payload: { questionId: firstMcq.id, userAnswer: option },
      })
      const isCorrectChoice = Boolean(result?.correct)
      setServerGradedAnswers((prev) => ({
        ...prev,
        [option]: isCorrectChoice,
      }))
      setChoiceFeedback({ answer: option, result: isCorrectChoice ? 'correct' : 'wrong', phase: 'flash' })
    } catch {
      // Keep network/server failures separate from graded wrong answers.
    }
  }

  useEffect(() => {
    if (choiceFeedback?.phase !== 'flash') return

    const feedbackTimer = window.setTimeout(() => {
      setChoiceFeedback((prev) =>
        prev?.answer === choiceFeedback.answer && prev.result === choiceFeedback.result
          ? { ...prev, phase: 'settled' }
          : prev,
      )
    }, 1000)

    return () => window.clearTimeout(feedbackTimer)
  }, [choiceFeedback])

  const handleReviewSubmit = async (nextStep: 'next-grammar' | 'reading') => {
    if (sectionId !== null) {
      await saveProgress
        .mutateAsync({
          sectionId,
          payload: {
            currentPage: 1,
            stayTimeSeconds: 0,
            forceComplete: reviewMarkComplete === true,
            difficulty: reviewDifficulty ?? 'NORMAL',
          },
        })
        .catch(() => {})

      if (reviewSaveScrap === true && grammarMaterialId !== null) {
        await createScrap
          .mutateAsync({
            type: 'GRAMMAR',
            materialId: grammarMaterialId,
            sectionId,
          } as never)
          .catch(() => {})
      }
    }

    pushHistory()
    setPracticeStep(nextStep)
  }

  if (isFillIntroStep) {
    return (
      <main className="grammar-practice-fill-intro-page">
        <section className="grammar-practice-fill-intro-content" aria-label="word typing intro">
          <button
            type="button"
            className="grammar-practice-fill-intro-back"
            onClick={handleBackPress}
            aria-label="뒤로 가기"
          >
            <svg className="grammar-practice-fill-intro-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="grammar-practice-fill-intro-center">
            <div className="grammar-practice-fill-intro-copy">
              <h1 className="grammar-practice-fill-intro-title">Well done!</h1>
              <p className="grammar-practice-fill-intro-subtitle">Now let&apos;s try something harder</p>
            </div>
            <img
              src={rulesImage}
              alt=""
              className="grammar-practice-fill-intro-character"
              aria-hidden="true"
            />
          </div>
          <button
            type="button"
            className="grammar-practice-fill-intro-start"
            onClick={() => {
              pushHistory()
              setPracticeStep('fill')
              setTypedAnswer('')
              setSubmittedTypedAnswer('')
            }}
          >
            START
          </button>
        </section>
      </main>
    )
  }

  if (isMakeIntroStep) {
    return (
      <main className="grammar-practice-make-intro-page">
        <section className="grammar-practice-make-intro-content" aria-label="sentence typing intro">
          <button
            type="button"
            className="grammar-practice-make-intro-back"
            onClick={handleBackPress}
            aria-label="뒤로 가기"
          >
            <svg className="grammar-practice-make-intro-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="grammar-practice-make-intro-center">
            <div className="grammar-practice-make-intro-copy">
              <h1 className="grammar-practice-make-intro-title">Well done!</h1>
              <p className="grammar-practice-make-intro-subtitle">Now try to make the sentence on your own!</p>
            </div>
            <img
              src={rulesImage}
              alt=""
              className="grammar-practice-make-intro-character"
              aria-hidden="true"
            />
          </div>
          <button
            type="button"
            className="grammar-practice-make-intro-start"
            onClick={() => {
              pushHistory()
              setPracticeStep('make')
              setMakeSentenceAnswer('')
              setSubmittedMakeSentenceAnswer('')
            }}
          >
            START
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="grammar-practice-screen">
      <section className={`grammar-practice-content grammar-practice-content-${practiceStep}`}>
        {isReviewStep ? (
          <header className="grammar-practice-header grammar-practice-header-review">
            <button type="button" className="grammar-practice-close" onClick={onBack} aria-label="닫기">
              <svg className="grammar-practice-close-icon" width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
                <path d="M21 9L9 21M9 9L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className="grammar-practice-title">Review</h1>
          </header>
        ) : (
          <header className="grammar-practice-header">
            <button type="button" className="grammar-practice-back" onClick={handleBackPress} aria-label="뒤로 가기">
              <svg className="grammar-practice-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="grammar-practice-title">
              {isNextGrammarStep || isNextGrammarRulesStep
                ? '을까요? 1)'
                : isListeningStep
                ? 'Listening'
                : isReadingStep
                ? 'Reading'
                : 'Practice'}
            </h1>
          </header>
        )}

        {isFillIntroStep || isMakeIntroStep || isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep || isNextGrammarRulesStep ? null : (
          <div className="grammar-practice-progress" role="list" aria-label="grammar practice progress">
            <span className="grammar-practice-progress-track" aria-hidden="true" />
            <span className="grammar-practice-progress-fill" style={{ width: '17.5%' }} aria-hidden="true" />
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className={`grammar-practice-progress-dot ${
                  index <= 0 ? 'grammar-practice-progress-dot-past' : 'grammar-practice-progress-dot-upcoming'
                }`}
                style={{ left: `${progressDotPositions[index]}%` }}
                role="listitem"
                aria-current={index === 0 ? 'step' : undefined}
              />
            ))}
          </div>
        )}

        {isFillIntroStep || isMakeIntroStep || isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep || isNextGrammarRulesStep ? null : (
          <p className="grammar-practice-guide">
            {isMakeStep ? 'Make your own sentence.' : isFillStep ? 'Fill in the blanks.' : 'Choose the correct answer.'}
          </p>
        )}

        {isReviewStep ? (
          <section className="grammar-practice-review-screen">
            <div className="grammar-practice-review-main">
              <section className="grammar-practice-review-hero" aria-label="lesson completion">
                <h2 className="grammar-practice-review-hero-title">Well done!</h2>
                <p className="grammar-practice-review-hero-subtitle">You&apos;ve finished grammar</p>
              </section>

              <section className="grammar-practice-review-section">
                <h2 className="grammar-practice-review-question">How was this class?</h2>
                <div className="grammar-practice-review-choice-row" role="list" aria-label="class difficulty">
                  <button
                    type="button"
                    className={`grammar-practice-review-choice-button ${reviewDifficulty === 'EASY' ? 'is-selected' : ''}`}
                    role="listitem"
                    aria-label="Easy"
                    aria-pressed={reviewDifficulty === 'EASY'}
                    onClick={() => setReviewDifficulty('EASY')}
                  >
                    <img src={reviewEasyImage} alt="" className="grammar-practice-review-choice-image" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`grammar-practice-review-choice-button ${reviewDifficulty === 'NORMAL' ? 'is-selected' : ''}`}
                    role="listitem"
                    aria-label="Normal"
                    aria-pressed={reviewDifficulty === 'NORMAL'}
                    onClick={() => setReviewDifficulty('NORMAL')}
                  >
                    <img src={reviewNormalImage} alt="" className="grammar-practice-review-choice-image" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`grammar-practice-review-choice-button ${reviewDifficulty === 'HARD' ? 'is-selected' : ''}`}
                    role="listitem"
                    aria-label="Hard"
                    aria-pressed={reviewDifficulty === 'HARD'}
                    onClick={() => setReviewDifficulty('HARD')}
                  >
                    <img src={reviewHardImage} alt="" className="grammar-practice-review-choice-image" aria-hidden="true" />
                  </button>
                </div>
                <div className="grammar-practice-review-label-row grammar-practice-review-label-row-three">
                  <span>easy</span>
                  <span>normal</span>
                  <span>hard</span>
                </div>
              </section>

              <section className="grammar-practice-review-section grammar-practice-review-section-complete">
                <h2 className="grammar-practice-review-subtitle">Mark as complete?</h2>
                <div className="grammar-practice-review-pill-row" role="list" aria-label="mark complete">
                  <button
                    type="button"
                    className={`grammar-practice-review-pill-button ${reviewMarkComplete === true ? 'is-selected' : ''}`}
                    role="listitem"
                    aria-label="Yes"
                    aria-pressed={reviewMarkComplete === true}
                    onClick={() => setReviewMarkComplete(true)}
                  >
                    <span className="grammar-practice-review-pill-mark grammar-practice-review-pill-mark-yes" aria-hidden="true" />
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    className={`grammar-practice-review-pill-button ${reviewMarkComplete === false ? 'is-selected' : ''}`}
                    role="listitem"
                    aria-label="No"
                    aria-pressed={reviewMarkComplete === false}
                    onClick={() => setReviewMarkComplete(false)}
                  >
                    <span className="grammar-practice-review-pill-mark grammar-practice-review-pill-mark-no" aria-hidden="true" />
                    <span>No</span>
                  </button>
                </div>
              </section>

              <section className="grammar-practice-review-section grammar-practice-review-section-notebook">
                <h2 className="grammar-practice-review-question">Save grammar to personal notebook?</h2>
                <div className="grammar-practice-review-pill-row" role="list" aria-label="save grammar to personal notebook">
                  <button
                    type="button"
                    className={`grammar-practice-review-pill-button ${reviewSaveScrap === true ? 'is-selected' : ''}`}
                    role="listitem"
                    aria-label="Yes"
                    aria-pressed={reviewSaveScrap === true}
                    disabled={grammarMaterialId === null}
                    onClick={() => setReviewSaveScrap(true)}
                  >
                    <span className="grammar-practice-review-pill-mark grammar-practice-review-pill-mark-yes" aria-hidden="true" />
                    <span>Yes</span>
                  </button>
                  <button
                    type="button"
                    className={`grammar-practice-review-pill-button ${reviewSaveScrap === false ? 'is-selected' : ''}`}
                    role="listitem"
                    aria-label="No"
                    aria-pressed={reviewSaveScrap === false}
                    onClick={() => setReviewSaveScrap(false)}
                  >
                    <span className="grammar-practice-review-pill-mark grammar-practice-review-pill-mark-no" aria-hidden="true" />
                    <span>No</span>
                  </button>
                </div>
              </section>

              {(saveProgress.error || createScrap.error) && (
                <p className="grammar-practice-review-error">
                  {saveProgress.error?.message || createScrap.error?.message}
                </p>
              )}
            </div>

            <div className="grammar-practice-review-action-row">
              <button
                type="button"
                className="grammar-practice-review-action-button grammar-practice-review-action-button-primary"
                disabled={saveProgress.isPending || createScrap.isPending}
                onClick={() => void handleReviewSubmit('next-grammar')}
              >
                {saveProgress.isPending || createScrap.isPending ? 'SAVING...' : 'CONTINUE'}
              </button>
            </div>
          </section>
        ) : null}

        {isNextGrammarStep ? (
          <section className="grammar-practice-next-grammar-screen">
            <div className="grammar-practice-reading-toggle-row">
              <div className="grammar-practice-reading-toggle-group">
                <span className="grammar-practice-reading-toggle-label">Mark Grammar</span>
                <button
                  type="button"
                  className={`grammar-practice-reading-switch ${showGrammar ? 'grammar-practice-reading-switch-active' : ''}`}
                  onClick={toggleShowGrammar}
                  aria-pressed={showGrammar}
                  aria-label="Mark Grammar"
                >
                  <span className="grammar-practice-reading-switch-thumb" />
                </button>
              </div>
              <div className="grammar-practice-reading-toggle-group">
                <span className="grammar-practice-reading-toggle-label">Mark Vocab</span>
                <button
                  type="button"
                  className={`grammar-practice-reading-switch ${showVocab ? 'grammar-practice-reading-switch-active' : ''}`}
                  onClick={toggleShowVocab}
                  aria-pressed={showVocab}
                  aria-label="Mark Vocab"
                >
                  <span className="grammar-practice-reading-switch-thumb" />
                </button>
              </div>
            </div>

            <section className="grammar-practice-next-grammar-section" ref={nextGrammarLessonRef}>
              <h2 className="grammar-practice-next-grammar-heading">Grammar explanation</h2>
              <div className="grammar-practice-next-grammar-description" dir="rtl">
                <p className="grammar-practice-next-grammar-description-line">הזמנה לפעולה.</p>
                <p className="grammar-practice-next-grammar-description-line">"שנעשה (משהו)?"</p>
                <p className="grammar-practice-next-grammar-description-line">זו צורת דיבור בלבד בפנייה לאדם כלשהו, עם</p>
                <p className="grammar-practice-next-grammar-description-line">כוונה להציע לעשות משהו יחד.</p>
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

            <section className="grammar-practice-next-grammar-examples-section">
              <h2 className="grammar-practice-next-grammar-heading">Examples</h2>
              <div className="grammar-practice-next-grammar-hero-row">
                <span className="grammar-practice-next-grammar-example-avatar grammar-practice-next-grammar-example-avatar-left" aria-hidden="true">
                  <img src={exampleLeftImage} alt="" />
                </span>
                <div className="grammar-practice-next-grammar-bubble-stack">
                  <div className="grammar-practice-next-grammar-bubble-row">
                    <div className="grammar-practice-next-grammar-bubble">
                      <div>{renderNextGrammarExampleTokens(nextGrammarExamples[0].tokens)}</div>
                      {visibleExampleTranslations[nextGrammarExamples[0].id] ? (
                        <div
                          className="grammar-practice-next-grammar-translation grammar-practice-next-grammar-translation-left"
                          dir={isTranslationRtl ? 'rtl' : 'ltr'}
                        >
                          {nextGrammarExamples[0].translation}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="grammar-practice-next-grammar-translation-toggle"
                      onClick={() =>
                        setVisibleExampleTranslations((prev) => ({
                          ...prev,
                          [nextGrammarExamples[0].id]: !prev[nextGrammarExamples[0].id],
                        }))
                      }
                      aria-label="번역 보기"
                    >
                      <img src={vectorIcon} alt="" className="grammar-practice-next-grammar-translation-mark" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="grammar-practice-next-grammar-chat">
                {nextGrammarExamples.slice(1).map((example) => (
                  <div
                    key={example.id}
                    className={`grammar-practice-next-grammar-message grammar-practice-next-grammar-message-${example.side}`}
                  >
                    <span className="grammar-practice-next-grammar-example-avatar grammar-practice-next-grammar-example-avatar-right" aria-hidden="true">
                      <img src={exampleRightImage} alt="" />
                    </span>
                    <div className="grammar-practice-next-grammar-bubble-stack">
                      <div className="grammar-practice-next-grammar-bubble-row">
                        <div className="grammar-practice-next-grammar-bubble">
                          <div>{renderNextGrammarExampleTokens(example.tokens)}</div>
                          {visibleExampleTranslations[example.id] ? (
                            <div
                              className={`grammar-practice-next-grammar-translation grammar-practice-next-grammar-translation-${example.side}`}
                              dir={isTranslationRtl ? 'rtl' : 'ltr'}
                            >
                              {example.translation}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="grammar-practice-next-grammar-translation-toggle"
                          onClick={() =>
                            setVisibleExampleTranslations((prev) => ({
                              ...prev,
                              [example.id]: !prev[example.id],
                            }))
                          }
                          aria-label="번역 보기"
                        >
                          <img src={vectorIcon} alt="" className="grammar-practice-next-grammar-translation-mark" aria-hidden="true" />
                        </button>
                      </div>
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
              <button
                type="button"
                className="grammar-practice-next-grammar-action-button"
                onClick={() => {
                  pushHistory()
                  setActiveNextGrammarDialog(null)
                  setPracticeStep('next-grammar-rules')
                }}
              >
                NEXT
              </button>
            </div>

            {activeNextGrammarDialog ? (
              <div className="grammar-practice-next-grammar-note-backdrop" role="presentation" onClick={() => setActiveNextGrammarDialog(null)}>
                <div
                  className={`grammar-practice-next-grammar-note-dialog grammar-practice-next-grammar-note-dialog-${activeNextGrammarDialog.kind}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="next-grammar-note-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="grammar-practice-next-grammar-note-header">
                    <h3 id="next-grammar-note-title" className="grammar-practice-next-grammar-note-title">
                      {activeNextGrammarDialog.kind === 'grammar'
                        ? nextGrammarNotes[activeNextGrammarDialog.id].title
                        : nextGrammarVocabNotes[activeNextGrammarDialog.id].title}
                    </h3>
                    <span className="grammar-practice-next-grammar-note-plus" aria-hidden="true" />
                  </div>
                  <p
                    className={`grammar-practice-next-grammar-note-description ${
                      activeNextGrammarDialog.kind === 'vocab' ? 'grammar-practice-next-grammar-note-description-vocab' : ''
                    }`}
                  >
                    {activeNextGrammarDialog.kind === 'grammar'
                      ? nextGrammarNotes[activeNextGrammarDialog.id].description
                      : nextGrammarVocabNotes[activeNextGrammarDialog.id].description}
                  </p>
                  {activeNextGrammarDialog.kind === 'grammar' ? (
                    <button type="button" className="grammar-practice-next-grammar-note-button" onClick={handleGoToNextGrammarLesson}>
                      GO TO LESSON
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : isNextGrammarRulesStep ? (
          <section className="grammar-practice-next-grammar-rules-screen">
            <h2 className="grammar-practice-next-grammar-rules-heading">Grammar explanation</h2>
            <div className="grammar-practice-next-grammar-rules-english">
              <div className="grammar-practice-next-grammar-rules-english-row">
                <span className="grammar-practice-next-grammar-rules-bullet" aria-hidden="true">•</span>
                <p className="grammar-practice-next-grammar-rules-english-line">This form is used only in spoken language</p>
              </div>
              <div className="grammar-practice-next-grammar-rules-english-row">
                <span className="grammar-practice-next-grammar-rules-bullet" aria-hidden="true">•</span>
                <p className="grammar-practice-next-grammar-rules-english-line">When this form appears, it necessarily refers to two people</p>
              </div>
              <div className="grammar-practice-next-grammar-rules-english-row">
                <span className="grammar-practice-next-grammar-rules-bullet" aria-hidden="true">•</span>
                <p className="grammar-practice-next-grammar-rules-english-line">The syllable -까 appears in question forms, therefore this is a question form only</p>
              </div>
              <div className="grammar-practice-next-grammar-rules-english-row">
                <span className="grammar-practice-next-grammar-rules-bullet" aria-hidden="true">•</span>
                <p className="grammar-practice-next-grammar-rules-english-line">It is attached only to verbs (doing something together)</p>
              </div>
              <div className="grammar-practice-next-grammar-rules-english-row">
                <span className="grammar-practice-next-grammar-rules-bullet" aria-hidden="true">•</span>
                <p className="grammar-practice-next-grammar-rules-english-line">The word 같이 ("together") can be added or omitted, and the meaning remains the same</p>
              </div>
            </div>
            <div className="grammar-practice-next-grammar-rules-character-wrap" aria-hidden="true">
              <img src={rulesImage} alt="" className="grammar-practice-next-grammar-rules-character" />
            </div>
            <div className="grammar-practice-next-grammar-actions">
              <button
                type="button"
                className="grammar-practice-next-grammar-action-button grammar-practice-next-grammar-action-button-back"
                onClick={handleBackPress}
              >
                BACK
              </button>
              <button
                type="button"
                className="grammar-practice-next-grammar-action-button"
                onClick={() => {
                  pushHistory()
                  resetPracticeFlow()
                  setPracticeStep('choice')
                }}
              >
                NEXT
              </button>
            </div>
          </section>
        ) : isListeningStep ? (
          <section
            className={`grammar-practice-listening-screen ${
              showListeningText ? 'grammar-practice-listening-screen-script-visible' : ''
            }`}
          >
            <div className="grammar-practice-listening-toggle-row">
              <div className="grammar-practice-listening-toggle-group">
                <span className="grammar-practice-listening-toggle-label">Mark Grammar</span>
                <button
                  type="button"
                  className={`grammar-practice-listening-switch ${showGrammar ? 'grammar-practice-listening-switch-active' : ''}`}
                  onClick={toggleShowGrammar}
                  aria-pressed={showGrammar}
                  aria-label="Mark Grammar"
                >
                  <span className="grammar-practice-listening-switch-thumb" />
                </button>
              </div>
              <div className="grammar-practice-listening-toggle-group">
                <span className="grammar-practice-listening-toggle-label">Mark Vocab</span>
                <button
                  type="button"
                  className={`grammar-practice-listening-switch ${showVocab ? 'grammar-practice-listening-switch-active' : ''}`}
                  onClick={toggleShowVocab}
                  aria-pressed={showVocab}
                  aria-label="Mark Vocab"
                >
                  <span className="grammar-practice-listening-switch-thumb" />
                </button>
              </div>
            </div>
            <div className="grammar-practice-listening-player">
              <button type="button" className="grammar-practice-listening-play" aria-label="재생">
                <svg width="16" height="18" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                  <path d="M2 1.6L10 7L2 12.4V1.6Z" fill="currentColor" />
                </svg>
              </button>
              <span className="grammar-practice-listening-time">{formatListeningTime(listeningElapsedSeconds)}</span>
              <div
                ref={listeningProgressRef}
                className={`grammar-practice-listening-progress ${isListeningScrubbing ? 'is-scrubbing' : ''}`}
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
                  if (!isListeningScrubbing) return
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
              <span className="grammar-practice-listening-time">{formatListeningTime(listeningRemainingSeconds)}</span>
            </div>
            <div className="grammar-practice-listening-show-text-wrap">
              {showListeningText ? (
                <section className="grammar-practice-listening-script-card">
                  <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">남자</span> 토요일 몇 시에 만날까요?</p>
                  <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">여자</span> 2시나 3시에 만나요.</p>
                  <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">남자</span> 그럼 2시에 만나요.</p>
                  <p className="grammar-practice-listening-script-line grammar-practice-listening-script-line-indented">그런데 어디에서 만날까요?</p>
                  <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">여자</span> 백화점 앞에서 만날까요?</p>
                  <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">남자</span> 백화점 앞에는 사람이 많아요.</p>
                  <p className="grammar-practice-listening-script-line grammar-practice-listening-script-line-indented">2시에 서점 앞에서 만나요.</p>
                  <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">여자</span> 네, 알았어요.</p>
                </section>
              ) : (
                <button
                  type="button"
                  className={`grammar-practice-listening-show-text-button ${isListeningTranscriptReady ? 'grammar-practice-listening-show-text-button-active' : ''}`}
                  aria-hidden={!isListeningTranscriptReady}
                  tabIndex={isListeningTranscriptReady ? 0 : -1}
                  onClick={() => {
                    if (!isListeningTranscriptReady) return
                    setShowListeningText(true)
                  }}
                >
                  <svg className="grammar-practice-listening-show-text-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 4.5H17C18.1 4.5 19 5.4 19 6.5V17.5C19 18.6 18.1 19.5 17 19.5H7C5.9 19.5 5 18.6 5 17.5V6.5C5 5.4 5.9 4.5 7 4.5Z" stroke="currentColor" strokeWidth="1.5" />
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
                <section className="grammar-practice-listening-question-card">
                  <p className="grammar-practice-listening-question-title">Question 1</p>
                  <p className="grammar-practice-listening-question-prompt">두 사람은 몇시에 만나요?</p>
                  <div className="grammar-practice-listening-options">
                    {['2:00', '2:30', '3:00', '3:30'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`grammar-practice-listening-option-button ${
                          listeningAnswer === option ? 'grammar-practice-listening-option-button-selected' : ''
                        }`}
                        onClick={() => setListeningAnswer(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </section>
                <section
                  className="grammar-practice-listening-question-card grammar-practice-listening-question-card-peek"
                  aria-hidden="true"
                >
                  <p className="grammar-practice-listening-question-title">Question 2</p>
                </section>
              </div>
            </div>
            <div className="grammar-practice-listening-dots" aria-label="listening question progress">
              <span className="grammar-practice-listening-dot grammar-practice-listening-dot-active" />
              <span className="grammar-practice-listening-dot" />
            </div>
            <button
              type="button"
              className={`grammar-practice-listening-next-button ${isListeningComplete ? 'grammar-practice-listening-next-button-active' : ''}`}
              disabled={!isListeningComplete}
            >
              Next
            </button>
          </section>
        ) : isReadingStep ? (
          <section className="grammar-practice-reading-screen">
            <div className="grammar-practice-reading-toggle-row">
              <div className="grammar-practice-reading-toggle-group">
                <span className="grammar-practice-reading-toggle-label">Mark Grammar</span>
                <button
                  type="button"
                  className={`grammar-practice-reading-switch ${showGrammar ? 'grammar-practice-reading-switch-active' : ''}`}
                  onClick={toggleShowGrammar}
                  aria-pressed={showGrammar}
                  aria-label="Mark Grammar"
                >
                  <span className="grammar-practice-reading-switch-thumb" />
                </button>
              </div>
              <div className="grammar-practice-reading-toggle-group">
                <span className="grammar-practice-reading-toggle-label">Mark Vocab</span>
                <button
                  type="button"
                  className={`grammar-practice-reading-switch ${showVocab ? 'grammar-practice-reading-switch-active' : ''}`}
                  onClick={toggleShowVocab}
                  aria-pressed={showVocab}
                  aria-label="Mark Vocab"
                >
                  <span className="grammar-practice-reading-switch-thumb" />
                </button>
              </div>
            </div>
            <section className="grammar-practice-reading-card">
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>건우</span>{' '}
                마리 씨, 오늘 같이 영화를 볼까요?
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>마리</span>{' '}
                미안해요. 오늘은 회의가 있어요.
              </p>
              <p className="grammar-practice-reading-line grammar-practice-reading-line-indented">그래서 바빠요.</p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>건우</span> 언제 시간이 있어요?
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>마리</span> 저는 토요일이나 일요일이 좋아요.
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>건우</span> 그럼 토요일에 만날까요?
              </p>
              <p className="grammar-practice-reading-line">
                <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>마리</span> 네, 좋아요. 토요일에 만나요.
              </p>
            </section>
            <div
              className="grammar-practice-reading-question-viewport"
              onPointerDown={(e) => {
                readingDragStartXRef.current = e.clientX
                readingDragOffsetRef.current = 0
                readingDidDragRef.current = false
                setIsReadingDragging(true)
              }}
              onPointerMove={(e) => {
                if (readingDragStartXRef.current === null) return
                const deltaX = e.clientX - readingDragStartXRef.current
                if (Math.abs(deltaX) > 8) readingDidDragRef.current = true
                readingDragOffsetRef.current = deltaX
                setReadingDragOffset(deltaX)
              }}
              onPointerUp={() => {
                if (readingDragStartXRef.current === null) return
                const finalDragOffset = readingDragOffsetRef.current
                if (finalDragOffset <= -32 && readingQuestionIndex < readingQuestions.length - 1) {
                  setReadingQuestionIndex((prev) => prev + 1)
                }
                if (finalDragOffset >= 32 && readingQuestionIndex > 0) {
                  setReadingQuestionIndex((prev) => prev - 1)
                }
                readingDragStartXRef.current = null
                readingDragOffsetRef.current = 0
                setReadingDragOffset(0)
                setIsReadingDragging(false)
                window.setTimeout(() => { readingDidDragRef.current = false }, 0)
              }}
              onPointerLeave={() => {
                if (readingDragStartXRef.current === null) return
                readingDragStartXRef.current = null
                readingDragOffsetRef.current = 0
                setReadingDragOffset(0)
                setIsReadingDragging(false)
                window.setTimeout(() => { readingDidDragRef.current = false }, 0)
              }}
              onPointerCancel={() => {
                readingDragStartXRef.current = null
                readingDragOffsetRef.current = 0
                setReadingDragOffset(0)
                setIsReadingDragging(false)
                readingDidDragRef.current = false
              }}
            >
              <div
                className={`grammar-practice-reading-question-track ${isReadingDragging ? 'is-dragging' : ''}`}
                style={{ transform: `translateX(${readingTrackTranslate}px)` }}
              >
                {readingQuestions.map((question, index) => {
                  const selectedReadingAnswer = readingAnswers[index]
                  const hasReadingChoiceResult = question.type === 'choice' && Boolean(selectedReadingAnswer)
                  const isReadingChoiceCorrect = selectedReadingAnswer === question.correctAnswer

                  return (
                    <section key={question.title} className="grammar-practice-reading-question-slide">
                      {hasReadingChoiceResult ? (
                        <span
                          className={`grammar-practice-reading-result-art ${
                            isReadingChoiceCorrect
                              ? 'grammar-practice-reading-result-art-correct'
                              : 'grammar-practice-reading-result-art-wrong'
                          }`}
                          aria-hidden="true"
                        >
                          <span className="grammar-practice-reading-result-mark" />
                          <img
                            src={isReadingChoiceCorrect ? choiceCorrectImage : choiceWrongImage}
                            alt=""
                          />
                        </span>
                      ) : null}
                      <div
                        className={`grammar-practice-reading-question-card ${
                          question.type === 'blank' ? 'grammar-practice-reading-question-card-blank' : ''
                        }`}
                      >
                        <p className="grammar-practice-reading-question-title">{question.title}</p>
                        <p className="grammar-practice-reading-question-prompt">{question.prompt}</p>
                        {question.type === 'choice' && question.options ? (
                          <div className="grammar-practice-reading-options">
                            {question.options.map((option) => {
                              const isSelectedOption = selectedReadingAnswer === option
                              const isAnsweredChoice = Boolean(selectedReadingAnswer)
                              const isCorrectOption = question.correctAnswer === option
                              const isCorrectSelectedOption = isSelectedOption && isAnsweredChoice && isCorrectOption
                              const isWrongSelectedOption = isSelectedOption && isAnsweredChoice && !isCorrectOption

                              return (
                                <button
                                  key={option}
                                  type="button"
                                  className={`grammar-practice-reading-option-button ${
                                    isSelectedOption ? 'grammar-practice-reading-option-button-selected' : ''
                                  } ${
                                    isCorrectSelectedOption
                                      ? 'grammar-practice-reading-option-button-correct'
                                      : ''
                                  } ${
                                    isWrongSelectedOption
                                      ? 'grammar-practice-reading-option-button-wrong'
                                      : ''
                                  }`}
                                  onClick={() => {
                                    if (readingDidDragRef.current) return
                                    setReadingAnswers((prev) => ({ ...prev, [index]: option }))
                                  }}
                                >
                                  {option}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="grammar-practice-reading-blank-group">
                            <p className="grammar-practice-reading-blank-line">
                              오늘은
                              <input
                                type="text"
                                className={`grammar-practice-reading-inline-blank ${
                                  readingBlankAnswers.meeting.trim() === '회의'
                                    ? 'grammar-practice-reading-inline-blank-correct'
                                    : ''
                                }`}
                                value={readingBlankAnswers.meeting}
                                onPointerDown={(event) => event.stopPropagation()}
                                onPointerUp={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  setReadingBlankAnswers((prev) => ({ ...prev, meeting: event.target.value }))
                                }
                              />
                              이/가 있어요.
                            </p>
                            <p className="grammar-practice-reading-blank-line">
                              그래서
                              <input
                                type="text"
                                className={`grammar-practice-reading-inline-blank ${
                                  readingBlankAnswers.reason.trim() === '바빠요'
                                    ? 'grammar-practice-reading-inline-blank-correct'
                                    : ''
                                }`}
                                value={readingBlankAnswers.reason}
                                onPointerDown={(event) => event.stopPropagation()}
                                onPointerUp={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  setReadingBlankAnswers((prev) => ({ ...prev, reason: event.target.value }))
                                }
                              />
                              .
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
            <div className="grammar-practice-reading-dots" aria-label="reading question progress">
              {readingQuestions.map((question, index) => (
                <span
                  key={question.title}
                  className={`grammar-practice-reading-dot ${index === readingQuestionIndex ? 'grammar-practice-reading-dot-active' : ''}`}
                />
              ))}
            </div>
            <button
              type="button"
              className={`grammar-practice-reading-next-button ${isReadingComplete ? 'grammar-practice-reading-next-button-active' : ''}`}
              disabled={!isReadingComplete}
              onClick={() => {
                if (!isReadingComplete) return
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
                isWrongAnswer ? 'is-wrong' : ''
              }`}
            >
              <div className="grammar-practice-question-stack grammar-practice-question-stack-make">
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
                        setSubmittedMakeSentenceAnswer('')
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
                    <p className="grammar-practice-correct-answer grammar-practice-correct-answer-make">{makeCorrectAnswer}</p>
                  ) : null}
                </div>
              </div>
            </section>
            <div className="grammar-practice-learn-more-wrap">
              <button type="button" className="grammar-practice-learn-more-button">Show hint</button>
            </div>
            {showMakeResultPanel ? (
              <aside
                className={`grammar-practice-result-panel grammar-practice-make-result-panel ${
                  isCorrectAnswer
                    ? 'grammar-practice-result-panel-correct'
                    : 'grammar-practice-result-panel-wrong'
                }`}
                role="status"
                aria-live="polite"
              >
                <span
                    className={`grammar-practice-result-icon ${
                      isCorrectAnswer
                        ? 'grammar-practice-result-icon-correct'
                        : 'grammar-practice-result-icon-wrong'
                    }`}
                    aria-hidden="true"
                  />
                <span className="grammar-practice-result-text">
                  {isCorrectAnswer ? 'Good Job!' : 'Wrong'}
                </span>
                <span className="grammar-practice-result-art" aria-hidden="true">
                  <span className="grammar-practice-result-art-mark" />
                  <img src={makeResultImage} alt="" />
                </span>
              </aside>
            ) : null}
          </>
        ) : !isReviewStep ? (
          <>
            <section
              className={`grammar-practice-question-card ${
                isFillStep ? 'grammar-practice-question-card-fill' : ''
              } ${!isChoiceStep && !isFillStep && isCorrectAnswer ? 'grammar-practice-question-card-correct' : ''} ${
                !isChoiceStep && !isFillStep && isWrongAnswer ? 'grammar-practice-question-card-wrong' : ''
              }`}
            >
              <div className="grammar-practice-question-stack">
                <div className="grammar-practice-question-row">
                  <p className="grammar-practice-question-text">{choicePrompt}</p>
                  <div className="grammar-practice-answer-column">
                    {isFillStep ? (
                      <input
                        type="text"
                        className="grammar-practice-answer-input"
                        value={typedAnswer}
                        enterKeyHint="done"
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            pushHistory()
                            setSubmittedTypedAnswer(typedAnswer.trim())
                          }
                        }}
                      />
                    ) : (
                      <div className="grammar-practice-answer-slot">{isAnswered ? selectedAnswer : null}</div>
                    )}
                    {isFillStep && isWrongAnswer ? (
                      <p className="grammar-practice-correct-answer grammar-practice-correct-answer-fill">마시다</p>
                    ) : null}
                  </div>
                  <span className="grammar-practice-question-dot">.</span>
                </div>
              </div>
            </section>

            {isFillStep ? (
              <>
                <div className="grammar-practice-learn-more-wrap">
                  <button type="button" className="grammar-practice-learn-more-button">Show hint</button>
                </div>
                {showFillResultPanel ? (
                  <aside
                    className={`grammar-practice-fill-result-panel ${
                      isCorrectAnswer
                        ? 'grammar-practice-fill-result-panel-correct'
                        : 'grammar-practice-fill-result-panel-wrong'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className={`grammar-practice-choice-result-icon ${
                        isCorrectAnswer
                          ? 'grammar-practice-choice-result-icon-correct'
                          : 'grammar-practice-choice-result-icon-wrong'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="grammar-practice-fill-result-text">
                      {isCorrectAnswer ? 'Good Job!' : 'Wrong'}
                    </span>
                    <span className="grammar-practice-fill-result-art" aria-hidden="true">
                      <span className="grammar-practice-fill-result-art-mark" />
                      <img src={fillResultImage} alt="" />
                    </span>
                  </aside>
                ) : null}
              </>
            ) : (
              <>
                <div className="grammar-practice-options" role="list">
                  {questionsLoading && !firstMcq ? (
                    <p className="grammar-practice-status">Loading...</p>
                  ) : (
                    choiceOptions.map((option) => {
                      const wasRevealed = revealedAnswers.includes(option)
                      const wasCorrect = serverGradedAnswers[option] === true
                      const wasWrong = serverGradedAnswers[option] === false
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`grammar-practice-option-button ${
                            selectedAnswer === option ? 'grammar-practice-option-button-selected' : ''
                          } ${
                            wasRevealed && wasCorrect
                              ? 'grammar-practice-option-button-correct'
                              : wasRevealed && wasWrong
                              ? 'grammar-practice-option-button-wrong'
                              : ''
                          }`}
                          role="listitem"
                          disabled={checkAnswer.isPending}
                          onClick={() => void handleChoiceOptionClick(option)}
                        >
                          {option}
                        </button>
                      )
                    })
                  )}
                </div>
                {checkAnswer.error && (
                  <p className="grammar-practice-status">{checkAnswer.error.message}</p>
                )}
                <div className="grammar-practice-hint-wrap">
                  <button type="button" className="grammar-practice-hint-button">Show hint</button>
                </div>
                {showChoiceFeedbackPanel ? (
                  <aside
                    className={`grammar-practice-choice-result-panel ${
                      isChoiceCorrectFeedback
                        ? 'grammar-practice-choice-result-panel-correct'
                        : 'grammar-practice-choice-result-panel-wrong'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className={`grammar-practice-choice-result-icon ${
                        isChoiceCorrectFeedback
                          ? 'grammar-practice-choice-result-icon-correct'
                          : 'grammar-practice-choice-result-icon-wrong'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="grammar-practice-choice-result-text">
                      {isChoiceCorrectFeedback ? 'Good Job!' : 'Wrong'}
                    </span>
                    <span className="grammar-practice-choice-result-art" aria-hidden="true">
                      <span className="grammar-practice-choice-result-art-mark" />
                      <img src={choiceFeedbackImage} alt="" />
                    </span>
                  </aside>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {showChoiceFeedbackFlash ? (
          <div
            className={`grammar-practice-choice-flash ${
              isChoiceCorrectFeedback
                ? 'grammar-practice-choice-flash-correct'
                : 'grammar-practice-choice-flash-wrong'
            }`}
            role="alert"
            aria-live="assertive"
          >
            <span className="grammar-practice-choice-flash-mark" aria-hidden="true" />
            <img src={choiceFeedbackImage} alt="" className="grammar-practice-choice-flash-character" />
            <span className="grammar-practice-choice-flash-text">
              {isChoiceCorrectFeedback ? '잘했어요!' : '틀렸어요!'}
            </span>
          </div>
        ) : null}

        {isFillIntroStep || isMakeIntroStep || isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep || isNextGrammarRulesStep ? null : (
          <button
            type="button"
            className={`grammar-practice-next-button ${isFillStep || isMakeStep ? 'grammar-practice-next-button-fill' : ''}`}
            disabled={!canMoveToNextPracticeStep}
            onClick={() => {
              if (!canMoveToNextPracticeStep) return
              if (practiceStep === 'choice') {
                pushHistory()
                setPracticeStep('fill-intro')
                return
              }
              if (practiceStep === 'fill') {
                pushHistory()
                setPracticeStep('make-intro')
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
