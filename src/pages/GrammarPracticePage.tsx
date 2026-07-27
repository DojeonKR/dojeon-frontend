import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  contentTextDirection,
  isRtlContentLanguage,
  pickContentExplanation,
  pickDialogueTranslation,
  toContentLanguage,
} from '../data/contentLanguage.ts'
import type {
  DialogueLine,
  MaterialPracticeKind,
  SectionMaterial,
  SectionQuestion,
} from '../types/section,types.ts'
import { useCheckSectionAnswer } from '../hooks/useCheckSectionAnswer.ts'
import { useSaveSectionProgress } from '../hooks/useSaveSectionProgress.ts'
import { useCreateScrap } from '../hooks/useCreateScrap.ts'
import { useSectionPageTimer } from '../hooks/useSectionPageTimer.ts'

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
  // 한 단계 안에서 여러 연습 문항을 순서대로 풀기 때문에 문항 위치와 채점 결과도 함께 되돌린다.
  choiceItemIndex: number
  fillItemIndex: number
  makeItemIndex: number
  serverGradedAnswers: Record<string, boolean>
  fillGrade: TextAnswerGrade | null
  makeGrade: TextAnswerGrade | null
  readingQuestionIndex: number
  readingAnswers: Record<number, string>
  readingBlankAnswers: {
    meeting: string
    reason: string
  }
  listeningQuestionIndex: number
  listeningAnswers: Record<number, string>
  listeningGradedAnswers: Record<number, boolean>
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

// 서버 material/question 을 화면 모델로 바꾸는 헬퍼.
// material.type 문자열이 섹션 종류마다 다르게 내려올 수 있어서 키워드로 느슨하게 찾고,
// 못 찾으면 대화가 들어 있는 첫 material 로 폴백한다.
function findMaterialByKeywords(
  materials: SectionMaterial[],
  keywords: string[],
): SectionMaterial | null {
  const byType = materials.find((material) =>
    keywords.some((keyword) => (material.type ?? '').toUpperCase().includes(keyword)),
  )
  if (byType) return byType

  return materials.find((material) => (material.contentText?.dialogues?.length ?? 0) > 0) ?? null
}

function toDialogueLines(material: SectionMaterial | null): DialogueLine[] {
  return (material?.contentText?.dialogues ?? []).flatMap((dialogue) => dialogue.lines ?? [])
}

interface TextAnswerGrade {
  answer: string
  correct: boolean
  correctAnswer?: string
}

interface PracticeQuestionModel {
  questionId: number
  title: string
  prompt: string
  type: 'choice' | 'blank'
  options: string[]
  answer: string | null
}

// contentText.practices 한 문항을 화면 모델로 바꾼 것.
// prompt("1. 그것은 ____예요.")는 빈칸 기준으로 prefix/suffix 로 쪼개서 기존 카드 레이아웃
// (문장 - 답 칸 - 문장)에 그대로 끼워 넣는다.
interface PracticeItemModel {
  key: string
  kind: MaterialPracticeKind
  fixedQuestion: string
  hasImagePlaceholder: boolean
  prefix: string
  suffix: string
  options: string[]
  answers: string[]
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => typeof entry === 'string' || typeof entry === 'number')
    .map((entry) => String(entry))
}

// "1. 그것은 ____예요." -> { prefix: '그것은', suffix: '예요.' }
// 번호와 빈칸 표기(밑줄 개수)가 문항마다 달라서 정규식으로 느슨하게 걷어낸다.
function splitPracticePrompt(prompt: string): { prefix: string; suffix: string } {
  const withoutNumber = (prompt ?? '').replace(/^\s*\d+\s*[.)]\s*/, '')
  const blank = withoutNumber.match(/_{2,}/)
  if (!blank || blank.index === undefined) {
    return { prefix: withoutNumber.trim(), suffix: '' }
  }
  return {
    prefix: withoutNumber.slice(0, blank.index).trim(),
    suffix: withoutNumber.slice(blank.index + blank[0].length).trim(),
  }
}

// 자료에 실린 연습 문항을 kind 별로 펼친다. 블록(fixedQuestion + items) 순서를 그대로 유지해
// choose 는 보기 선택 단계, fill 은 빈칸 단계, free 는 문장 만들기 단계로 이어 붙인다.
function toPracticeItems(
  materials: SectionMaterial[],
  kind: MaterialPracticeKind,
): PracticeItemModel[] {
  const items: PracticeItemModel[] = []

  materials.forEach((material) => {
    ;(material.contentText?.practices ?? []).forEach((practice, blockIndex) => {
      if ((practice?.kind ?? '').toLowerCase() !== kind) return

      ;(practice.items ?? []).forEach((item, itemIndex) => {
        const answers = toStringList(item?.answers)
        const sample = typeof item?.sample === 'string' ? item.sample.trim() : ''
        const { prefix, suffix } = splitPracticePrompt(item?.prompt ?? '')

        items.push({
          key: `${material.id}-${kind}-${blockIndex}-${itemIndex}`,
          kind,
          fixedQuestion: (practice.fixedQuestion ?? '').trim(),
          hasImagePlaceholder: practice.imagePlaceholder === true,
          prefix,
          suffix,
          options: toStringList(item?.options),
          // 자유 작문(free)은 answers 없이 sample(모범 답안)만 온다.
          answers: answers.length > 0 ? answers : sample.length > 0 ? [sample] : [],
        })
      })
    })
  })

  return items
}

function normalizeAnswerText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function matchesPracticeAnswer(item: PracticeItemModel, answer: string): boolean {
  const normalized = normalizeAnswerText(answer)
  return item.answers.some((candidate) => normalizeAnswerText(candidate) === normalized)
}

interface GrammarTableModel {
  headers: string[]
  rows: string[][]
}

// 행 객체의 키 순서. 서버 표는 headers 순서대로 condition -> form -> examples 를 채워 내려준다.
// (예: headers ["받침","형태","예시"] / row { condition: "받침 O", form: "N이에요", examples: [...] })
const TABLE_ROW_KEYS = ['condition', 'form', 'examples']

function toTableCellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value
      .map(toTableCellText)
      .filter((text) => text.length > 0)
      .join('\n')
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return ''
}

function toTableRowCells(row: unknown): string[] {
  if (Array.isArray(row)) return row.map(toTableCellText)
  if (row && typeof row === 'object') {
    const record = row as Record<string, unknown>
    const knownKeys = TABLE_ROW_KEYS.filter((key) => key in record)
    const extraKeys = Object.keys(record).filter((key) => !TABLE_ROW_KEYS.includes(key))
    const orderedKeys = knownKeys.length > 0 ? [...knownKeys, ...extraKeys] : extraKeys
    return orderedKeys.map((key) => toTableCellText(record[key]))
  }
  return [toTableCellText(row)]
}

// contentText.table 은 { headers, rows } 객체로 오고, 예전 목 데이터처럼 행 배열([[...], ...])로
// 오는 경우도 있어 둘 다 받는다. 표로 그릴 게 없으면 null 을 돌려 기존 표를 그대로 쓰게 한다.
function toGrammarTable(table: unknown): GrammarTableModel | null {
  let headers: string[] = []
  let rawRows: unknown[] = []

  if (Array.isArray(table)) {
    rawRows = table
  } else if (table && typeof table === 'object') {
    const record = table as Record<string, unknown>
    headers = toStringList(record.headers)
    rawRows = Array.isArray(record.rows) ? record.rows : []
  } else {
    return null
  }

  const rows = rawRows
    .map(toTableRowCells)
    .filter((cells) => cells.some((cell) => cell.length > 0))
  if (rows.length === 0) return null

  const columnCount = Math.max(headers.length, ...rows.map((cells) => cells.length), 0)
  if (columnCount === 0) return null

  const padRow = (cells: string[]) => Array.from({ length: columnCount }, (_, index) => cells[index] ?? '')

  return {
    headers: headers.length > 0 ? padRow(headers) : [],
    rows: rows.map(padRow),
  }
}

function matchesQuestionType(question: SectionQuestion, keywords: string[]): boolean {
  const type = (question.type ?? '').toUpperCase()
  return keywords.some((keyword) => type.includes(keyword))
}

// 문장 만들기 단계에 보여줄 제시어. 서버가 "준호 / 커피 / 마시다" 처럼 구분자로 내려주면 쪼개고,
// 아니면 문항 텍스트를 그대로 한 덩어리로 보여준다.
function toSentenceTokens(questionText: string | undefined): string[] {
  const tokens = (questionText ?? '')
    .split(/[/,·|]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)

  return tokens.length > 0 ? tokens : []
}

function toPracticeQuestions(questions: SectionQuestion[]): PracticeQuestionModel[] {
  return questions.map((question, index) => ({
    questionId: question.id,
    title: `Question ${index + 1}`,
    prompt: question.questionText,
    type: (question.options?.length ?? 0) > 0 ? 'choice' : 'blank',
    options: question.options ?? [],
    answer: question.answer,
  }))
}

const grammarPageByStep: Partial<Record<PracticeStep, number>> = {
  choice: 0,
  'fill-intro': 1,
  fill: 2,
  'make-intro': 3,
  make: 4,
  review: 5,
  'next-grammar': 6,
  'next-grammar-rules': 7,
}

function GrammarPracticePage({
  onBack,
  language,
  sectionId,
  initialPracticeStep = 'choice',
}: GrammarPracticePageProps) {
  const { data: questionsData, loading: questionsLoading } = useSectionQuestions(sectionId)
  const { data: materialsData, loading: materialsLoading } = useSectionMaterials(sectionId)
  const checkAnswer = useCheckSectionAnswer()
  const saveProgress = useSaveSectionProgress()
  const createScrap = useCreateScrap()

  const firstMcq = useMemo(() => {
    const questions = questionsData?.questions ?? []
    return (
      questions.find((q) => matchesQuestionType(q, ['MCQ', 'CHOICE'])) ??
      questions.find((q) => (q.options?.length ?? 0) > 0) ??
      null
    )
  }, [questionsData])

  // 주관식 문항: 빈칸 채우기(fill) / 문장 만들기(make) 단계에 각각 연결한다.
  // 서버 type 문자열이 확정되지 않아 키워드로 찾고, 없으면 보기 없는 문항을 순서대로 쓴다.
  const textQuestions = useMemo(
    () => (questionsData?.questions ?? []).filter((q) => (q.options?.length ?? 0) === 0),
    [questionsData],
  )
  const fillQuestion = useMemo(
    () =>
      textQuestions.find((q) => matchesQuestionType(q, ['BLANK', 'FILL', 'SHORT', 'WORD'])) ??
      textQuestions[0] ??
      null,
    [textQuestions],
  )
  const makeQuestion = useMemo(() => {
    const byType = textQuestions.find((q) =>
      matchesQuestionType(q, ['SENTENCE', 'MAKE', 'WRITE', 'COMPOSE']),
    )
    if (byType) return byType
    return textQuestions.find((q) => q.id !== fillQuestion?.id) ?? null
  }, [textQuestions, fillQuestion])

  const grammarMaterial = useMemo(() => {
    return materialsData?.materials.find((m) => m.type === 'GRAMMAR_TABLE') ?? null
  }, [materialsData])
  const grammarMaterialId = grammarMaterial?.id ?? null
  const grammarContent = grammarMaterial?.contentText ?? null

  const sectionMaterials = useMemo(() => materialsData?.materials ?? [], [materialsData])
  const grammarDialogueLines = useMemo(
    () => toDialogueLines(grammarMaterial),
    [grammarMaterial],
  )
  const readingDialogueLines = useMemo(
    () => toDialogueLines(findMaterialByKeywords(sectionMaterials, ['READING', 'TEXT'])),
    [sectionMaterials],
  )
  const listeningMaterial = useMemo(
    () => findMaterialByKeywords(sectionMaterials, ['LISTENING', 'SCRIPT', 'AUDIO']),
    [sectionMaterials],
  )
  const listeningDialogueLines = useMemo(
    () => toDialogueLines(listeningMaterial),
    [listeningMaterial],
  )
  const listeningTranscriptLines = useMemo(
    () =>
      (listeningMaterial?.contentText.transcript ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [listeningMaterial],
  )
  const serverPracticeQuestions = useMemo(
    () => toPracticeQuestions(questionsData?.questions ?? []),
    [questionsData],
  )
  // 자료(contentText.practices)에 연습 문항이 실려 있으면 그것을 우선 쓰고,
  // 없을 때 문항 API -> 데모 문항 순으로 폴백한다.
  const choicePracticeItems = useMemo(
    () => toPracticeItems(sectionMaterials, 'choose'),
    [sectionMaterials],
  )
  const fillPracticeItems = useMemo(
    () => toPracticeItems(sectionMaterials, 'fill'),
    [sectionMaterials],
  )
  const makePracticeItems = useMemo(
    () => toPracticeItems(sectionMaterials, 'free'),
    [sectionMaterials],
  )

  const fallbackChoicePrompt = '준호씨가 커피를'
  const fallbackChoiceOptions = ['마시다', '먹다', '보다', '가다']
  const fallbackCorrectChoice = '마시다'

  const fillCorrectAnswer = '마시다'
  const makeCorrectAnswer = '준호씨가 커피를 마신다.'

  const choicePrompt = firstMcq?.questionText ?? fallbackChoicePrompt
  const fillPrompt = fillQuestion?.questionText ?? choicePrompt
  const fallbackSentenceTokens = ['준호', '커피', '마시다']
  const serverSentenceTokens = toSentenceTokens(makeQuestion?.questionText)

  const [serverGradedAnswers, setServerGradedAnswers] = useState<Record<string, boolean>>({})
  const [fillGrade, setFillGrade] = useState<TextAnswerGrade | null>(null)
  const [makeGrade, setMakeGrade] = useState<TextAnswerGrade | null>(null)

  const [practiceStep, setPracticeStep] = useState<PracticeStep>(initialPracticeStep)
  const [choiceItemIndex, setChoiceItemIndex] = useState(0)
  const [fillItemIndex, setFillItemIndex] = useState(0)
  const [makeItemIndex, setMakeItemIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [revealedAnswers, setRevealedAnswers] = useState<string[]>([])
  const [choiceFeedback, setChoiceFeedback] = useState<ChoiceFeedback | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [submittedTypedAnswer, setSubmittedTypedAnswer] = useState('')
  const [makeSentenceAnswer, setMakeSentenceAnswer] = useState('')
  const [submittedMakeSentenceAnswer, setSubmittedMakeSentenceAnswer] = useState('')
  const [history, setHistory] = useState<PracticeStateSnapshot[]>([])
  const [showGrammar, setShowGrammar] = useState(false)
  const [showVocab, setShowVocab] = useState(false)
  const [readingQuestionIndex, setReadingQuestionIndex] = useState(0)
  const [readingAnswers, setReadingAnswers] = useState<Record<number, string>>({})
  const [readingGradedAnswers, setReadingGradedAnswers] = useState<Record<number, boolean>>({})
  const [readingBlankAnswers, setReadingBlankAnswers] = useState({ meeting: '', reason: '' })
  const [listeningQuestionIndex, setListeningQuestionIndex] = useState(0)
  const [listeningAnswers, setListeningAnswers] = useState<Record<number, string>>({})
  const [listeningGradedAnswers, setListeningGradedAnswers] = useState<Record<number, boolean>>({})
  const [visibleExampleTranslations, setVisibleExampleTranslations] = useState<Record<string, boolean>>({})
  const [activeNextGrammarDialog, setActiveNextGrammarDialog] = useState<NextGrammarDialogState | null>(null)
  const [readingDragOffset, setReadingDragOffset] = useState(0)
  const [isReadingDragging, setIsReadingDragging] = useState(false)
  const [listeningDragOffset, setListeningDragOffset] = useState(0)
  const [isListeningDragging, setIsListeningDragging] = useState(false)

  const [reviewDifficulty, setReviewDifficulty] = useState<ReviewDifficulty>('NORMAL')
  const [reviewMarkComplete, setReviewMarkComplete] = useState<boolean | null>(null)
  const [reviewSaveScrap, setReviewSaveScrap] = useState<boolean | null>(null)

  const trackedPageNumber =
    practiceStep === 'reading'
      ? readingQuestionIndex
      : practiceStep === 'listening'
        ? listeningQuestionIndex
        : grammarPageByStep[practiceStep] ?? -1

  useSectionPageTimer({
    sectionId,
    pageNumber: trackedPageNumber,
    enabled: trackedPageNumber >= 0,
  })

  const readingDragStartXRef = useRef<number | null>(null)
  const readingDragOffsetRef = useRef(0)
  const readingDidDragRef = useRef(false)
  const listeningDragStartXRef = useRef<number | null>(null)
  const listeningDragOffsetRef = useRef(0)
  const listeningDidDragRef = useRef(false)
  const listeningAnswersRef = useRef<Record<number, string>>({})
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

  const activeChoicePractice = choicePracticeItems[choiceItemIndex] ?? null
  const activeFillPractice = fillPracticeItems[fillItemIndex] ?? null
  const activeMakePractice = makePracticeItems[makeItemIndex] ?? null

  const choiceOptions =
    activeChoicePractice && activeChoicePractice.options.length > 0
      ? activeChoicePractice.options
      : firstMcq?.options ?? fallbackChoiceOptions
  // 자유 작문 연습에는 제시어가 없고 고정 질문("이것은 뭐예요?")에 답하는 형태라 제시어 줄을 숨긴다.
  const sentenceTokens = activeMakePractice
    ? []
    : serverSentenceTokens.length > 0
    ? serverSentenceTokens
    : fallbackSentenceTokens

  // 지금 단계에서 풀고 있는 자료 연습 문항. 단계 안에서 문항을 순서대로 넘기며 푼다.
  const activePractice = isMakeStep
    ? activeMakePractice
    : isFillStep
    ? activeFillPractice
    : isChoiceStep
    ? activeChoicePractice
    : null
  const practiceItemCount = isMakeStep
    ? makePracticeItems.length
    : isFillStep
    ? fillPracticeItems.length
    : isChoiceStep
    ? choicePracticeItems.length
    : 0
  const practiceItemIndex = isMakeStep
    ? makeItemIndex
    : isFillStep
    ? fillItemIndex
    : choiceItemIndex
  const hasNextPracticeItem = practiceItemIndex < practiceItemCount - 1

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

  // fill/make 는 자료 연습 문항 -> 서버 문항 -> 데모 정답 순으로 채점 기준을 고른다.
  const activeTextPractice = isMakeStep ? activeMakePractice : activeFillPractice
  const activeTextQuestion = isMakeStep ? makeQuestion : fillQuestion
  const activeTextGrade = isMakeStep ? makeGrade : fillGrade
  const matchedTextGrade =
    activeTextGrade && activeTextGrade.answer === currentAnswer ? activeTextGrade : null
  const correctAnswer =
    matchedTextGrade?.correctAnswer ??
    activeTextPractice?.answers[0] ??
    (isMakeStep ? makeCorrectAnswer : fillCorrectAnswer)
  const isAnswered = currentAnswer.length > 0
  // free 연습은 정답이 하나로 정해지지 않고 sample(모범 답안)만 오므로 정/오답을 매기지 않는다.
  const isFreeWritingPractice = activeTextPractice?.kind === 'free'
  const showMakeSample = isFreeWritingPractice && isAnswered

  let isCorrectAnswer: boolean
  let isWrongAnswer: boolean
  if (isFillIntroStep || isMakeIntroStep || isReviewStep || isReadingStep || isListeningStep || isNextGrammarStep || isNextGrammarRulesStep) {
    isCorrectAnswer = false
    isWrongAnswer = false
  } else if (isFreeWritingPractice) {
    isCorrectAnswer = false
    isWrongAnswer = false
  } else if (!isFillStep && !isMakeStep) {
    isCorrectAnswer = isAnswered && serverGradedAnswers[currentAnswer] === true
    isWrongAnswer = isAnswered && serverGradedAnswers[currentAnswer] === false
  } else if (activeTextPractice || activeTextQuestion) {
    isCorrectAnswer = matchedTextGrade?.correct === true
    isWrongAnswer = matchedTextGrade?.correct === false
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
  const hasCompletedTextGrade = matchedTextGrade !== null
  const canMoveToNextPracticeStep =
    isAnswered &&
    !checkAnswer.isPending &&
    (!isChoiceStep || showChoiceFeedbackPanel) &&
    (!(isFillStep || isMakeStep) || hasCompletedTextGrade)
  const currentTextAnswer = isMakeStep ? makeSentenceAnswer : typedAnswer
  const submittedTextAnswer = isMakeStep ? submittedMakeSentenceAnswer : submittedTypedAnswer
  const canSubmitTextAnswer =
    (isFillStep || isMakeStep) &&
    !checkAnswer.isPending &&
    currentTextAnswer.trim().length > 0 &&
    currentTextAnswer.trim() !== submittedTextAnswer
  const isNextPracticeStepEnabled = canSubmitTextAnswer || canMoveToNextPracticeStep

  // 서버 문항이 내려오면 그것을 쓰고, 없을 때만 기존 데모 문항으로 폴백한다.
  const hasServerQuestions = serverPracticeQuestions.length > 0
  const fallbackReadingQuestions: PracticeQuestionModel[] = [
    {
      questionId: -1,
      title: 'Question 1',
      prompt: '두 사람은 며칠에 만났어요?',
      type: 'choice',
      options: ['월요일', '수요일', '토요일', '일요일'],
      answer: '토요일',
    },
    {
      questionId: -2,
      title: 'Question 2',
      prompt: '마리 씨는 왜 오늘 영화를 못 봐요?',
      type: 'blank',
      options: [],
      answer: null,
    },
  ]
  const readingQuestions: PracticeQuestionModel[] = hasServerQuestions
    ? serverPracticeQuestions
    : fallbackReadingQuestions
  const isReadingComplete = hasServerQuestions
    ? readingQuestions.every((_, index) => (readingAnswers[index] ?? '').trim().length > 0)
    : Boolean(readingAnswers[0]) &&
      readingBlankAnswers.meeting.trim().length > 0 &&
      readingBlankAnswers.reason.trim().length > 0
  const readingCardWidth = 350
  const readingCardGap = 8
  const readingTrackOffset = 24
  const readingTrackStride = readingCardWidth + readingCardGap
  const readingTrackTranslate =
    readingTrackOffset - readingQuestionIndex * readingTrackStride + readingDragOffset
  const fallbackListeningQuestions: PracticeQuestionModel[] = [
    {
      questionId: -11,
      title: 'Question 1',
      prompt: '두 사람은 몇시에 만나요?',
      type: 'choice',
      options: ['2:00', '2:30', '3:00', '3:30'],
      answer: '2:00',
    },
  ]
  const isInitialMaterialsLoading = materialsLoading && materialsData === null
  const isInitialQuestionsLoading = questionsLoading && questionsData === null
  const listeningQuestions = isInitialQuestionsLoading
    ? []
    : hasServerQuestions
      ? serverPracticeQuestions
      : fallbackListeningQuestions
  const isListeningComplete =
    listeningQuestions.length > 0 &&
    listeningQuestions.every(
      (question) => {
        return (
          (listeningAnswers[question.questionId] ?? '').trim().length > 0 &&
          listeningGradedAnswers[question.questionId] !== undefined
        )
      },
    ) &&
    !checkAnswer.isPending
  const listeningQuestionIndexForDisplay = Math.min(
    listeningQuestionIndex,
    Math.max(0, listeningQuestions.length - 1),
  )
  const listeningCardWidth = 350
  const listeningCardGap = 8
  const listeningTrackOffset = 20
  const listeningTrackStride = listeningCardWidth + listeningCardGap
  const listeningTrackTranslate =
    listeningTrackOffset -
    listeningQuestionIndexForDisplay * listeningTrackStride +
    listeningDragOffset
  const progressDotPositions = [3, 21.8, 40.6, 59.4, 78.2, 97]
  const contentLanguage = toContentLanguage(language)
  const isTranslationRtl = isRtlContentLanguage(contentLanguage)
  // 서버 설명이 있으면 mother language에 맞는 것을 쓰고, 없으면 언어별 기본 문구로 폴백한다.
  const grammarExplanation = pickContentExplanation(grammarContent, contentLanguage)
  const fallbackGrammarExplanationLines =
    contentLanguage === 'he'
      ? [
          'הזמנה לפעולה.',
          '"שנעשה (משהו)?"',
          'זו צורת דיבור בלבד בפנייה לאדם כלשהו, עם',
          'כוונה להציע לעשות משהו יחד.',
        ]
      : [
          'A suggestion to do something.',
          '"Shall we (do something)?"',
          'This spoken form is used when you address someone',
          'to suggest doing something together.',
        ]
  const grammarExplanationLines = grammarExplanation?.text
    ?.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0) ?? fallbackGrammarExplanationLines
  const grammarExplanationDir = grammarExplanation
    ? contentTextDirection(toContentLanguage(grammarExplanation.lang))
    : contentTextDirection(contentLanguage)
  const fallbackNextGrammarExamples: NextGrammarExampleMessage[] = [
    {
      id: 'proposal',
      side: 'left',
      translation:
        contentLanguage === 'he'
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
        contentLanguage === 'he'
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
  // 서버가 이 섹션의 대화를 내려주면 레슨별 예문을 그대로 쓰고, 없을 때만 데모 예문으로 폴백한다.
  // 서버 예문에는 문법/단어 마크 좌표가 없어서 Mark Grammar / Mark Vocab 하이라이트는 붙지 않는다.
  const serverNextGrammarExamples: NextGrammarExampleMessage[] = grammarDialogueLines.map(
    (line, index) => ({
      id: `grammar-dialogue-${index}`,
      side: line.speaker === grammarDialogueLines[0]?.speaker ? 'left' : 'right',
      translation: pickDialogueTranslation(line, contentLanguage),
      tokens: [{ text: line.ko, emphasis: 'medium' as const }],
    }),
  )
  const nextGrammarExamples =
    serverNextGrammarExamples.length > 0 ? serverNextGrammarExamples : fallbackNextGrammarExamples
  const fallbackGrammarGridItems = ['', 'V -ㄹ까요?', '가다', '갈까요?', '', 'V-을까요?', '먹다', '먹을까요?']
  // 서버 표가 있으면 헤더/행 그대로 표를 그리고, 없을 때만 데모 그리드로 폴백한다.
  const grammarTable = toGrammarTable(grammarContent?.table)
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
    setChoiceItemIndex(0)
    setFillItemIndex(0)
    setMakeItemIndex(0)
    setSelectedAnswer('')
    setRevealedAnswers([])
    setChoiceFeedback(null)
    setTypedAnswer('')
    setSubmittedTypedAnswer('')
    setMakeSentenceAnswer('')
    setSubmittedMakeSentenceAnswer('')
    setServerGradedAnswers({})
    setFillGrade(null)
    setMakeGrade(null)
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
    choiceItemIndex,
    fillItemIndex,
    makeItemIndex,
    serverGradedAnswers,
    fillGrade,
    makeGrade,
    readingQuestionIndex,
    readingAnswers,
    readingBlankAnswers,
    listeningQuestionIndex,
    listeningAnswers,
    listeningGradedAnswers,
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
    setChoiceItemIndex(snapshot.choiceItemIndex)
    setFillItemIndex(snapshot.fillItemIndex)
    setMakeItemIndex(snapshot.makeItemIndex)
    setServerGradedAnswers(snapshot.serverGradedAnswers)
    setFillGrade(snapshot.fillGrade)
    setMakeGrade(snapshot.makeGrade)
    setReadingQuestionIndex(snapshot.readingQuestionIndex)
    setReadingAnswers(snapshot.readingAnswers)
    setReadingBlankAnswers(snapshot.readingBlankAnswers)
    setListeningQuestionIndex(snapshot.listeningQuestionIndex)
    setListeningAnswers(snapshot.listeningAnswers)
    listeningAnswersRef.current = snapshot.listeningAnswers
    setListeningGradedAnswers(snapshot.listeningGradedAnswers)
  }
  const pushHistory = () => {
    setHistory((prev) => [
      ...prev,
      {
        ...currentSnapshot,
        revealedAnswers: [...currentSnapshot.revealedAnswers],
        serverGradedAnswers: { ...currentSnapshot.serverGradedAnswers },
        readingAnswers: { ...currentSnapshot.readingAnswers },
        readingBlankAnswers: { ...currentSnapshot.readingBlankAnswers },
        listeningAnswers: { ...currentSnapshot.listeningAnswers },
        listeningGradedAnswers: { ...currentSnapshot.listeningGradedAnswers },
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

    // 자료 연습 문항에는 정답이 함께 실려 있어 채점 API 없이 바로 판정한다.
    if (activeChoicePractice) {
      const isCorrectChoice = matchesPracticeAnswer(activeChoicePractice, option)
      setServerGradedAnswers((prev) => ({ ...prev, [option]: isCorrectChoice }))
      setChoiceFeedback({
        answer: option,
        result: isCorrectChoice ? 'correct' : 'wrong',
        phase: 'flash',
      })
      return
    }

    if (!firstMcq) {
      const isCorrectChoice = option === fallbackCorrectChoice
      setServerGradedAnswers((prev) => ({
        ...prev,
        [option]: isCorrectChoice,
      }))
      setChoiceFeedback({ answer: option, result: isCorrectChoice ? 'correct' : 'wrong', phase: 'flash' })
      return
    }

    // 문항에 정답이 함께 내려오면 채점 API를 기다리지 않고 바로 판정한다.
    if (firstMcq.answer) {
      const isCorrectChoice = option.trim() === firstMcq.answer.trim()
      setServerGradedAnswers((prev) => ({ ...prev, [option]: isCorrectChoice }))
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

  const handleTextAnswerSubmit = async (kind: 'fill' | 'make', rawAnswer: string) => {
    const answer = rawAnswer.trim()
    if (kind === 'fill') setSubmittedTypedAnswer(answer)
    else setSubmittedMakeSentenceAnswer(answer)

    if (answer.length === 0) return

    const practiceItem = kind === 'fill' ? activeFillPractice : activeMakePractice
    if (practiceItem) {
      const grade: TextAnswerGrade = {
        answer,
        correct: matchesPracticeAnswer(practiceItem, answer),
        correctAnswer: practiceItem.answers[0],
      }
      if (kind === 'fill') setFillGrade(grade)
      else setMakeGrade(grade)
      return
    }

    const question = kind === 'fill' ? fillQuestion : makeQuestion
    if (!question) {
      const correctAnswer = kind === 'fill' ? fillCorrectAnswer : makeCorrectAnswer
      const grade: TextAnswerGrade = {
        answer,
        correct: answer === correctAnswer,
        correctAnswer,
      }
      if (kind === 'fill') setFillGrade(grade)
      else setMakeGrade(grade)
      return
    }

    if (question.answer) {
      const grade: TextAnswerGrade = {
        answer,
        correct: answer === question.answer.trim(),
        correctAnswer: question.answer,
      }
      if (kind === 'fill') setFillGrade(grade)
      else setMakeGrade(grade)
      return
    }

    if (sectionId === null) return

    try {
      const result = await checkAnswer.mutateAsync({
        sectionId,
        payload: { questionId: question.id, userAnswer: answer },
      })
      const grade: TextAnswerGrade = {
        answer,
        correct: Boolean(result?.correct),
        correctAnswer: result?.correctAnswer,
      }
      if (kind === 'fill') setFillGrade(grade)
      else setMakeGrade(grade)
    } catch {
      // 채점 요청 실패는 오답으로 표시하지 않는다.
    }
  }

  const handleReadingAnswerChange = async (
    index: number,
    question: PracticeQuestionModel,
    answer: string,
  ) => {
    setReadingAnswers((prev) => ({ ...prev, [index]: answer }))

    if (answer.trim().length === 0) return

    // 문항에 정답이 함께 오면 바로 채점한다.
    if (question.answer) {
      const isCorrect = answer.trim() === question.answer.trim()
      setReadingGradedAnswers((prev) => ({ ...prev, [index]: isCorrect }))
      return
    }

    if (sectionId === null || question.questionId < 0) return

    try {
      const result = await checkAnswer.mutateAsync({
        sectionId,
        payload: { questionId: question.questionId, userAnswer: answer },
      })
      setReadingGradedAnswers((prev) => ({ ...prev, [index]: Boolean(result?.correct) }))
    } catch {
      // 채점 요청 실패는 오답으로 표시하지 않는다.
    }
  }

  const handleListeningAnswerChange = async (
    question: PracticeQuestionModel,
    answer: string,
  ) => {
    const questionId = question.questionId
    listeningAnswersRef.current = {
      ...listeningAnswersRef.current,
      [questionId]: answer,
    }
    setListeningAnswers((prev) => ({ ...prev, [questionId]: answer }))
    setListeningGradedAnswers((prev) => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })

    if (answer.trim().length === 0) return

    if (question.answer) {
      setListeningGradedAnswers((prev) => ({
        ...prev,
        [questionId]: answer.trim() === question.answer?.trim(),
      }))
      return
    }

    if (sectionId === null || question.questionId < 0) return

    try {
      const result = await checkAnswer.mutateAsync({
        sectionId,
        payload: { questionId: question.questionId, userAnswer: answer },
      })
      if (listeningAnswersRef.current[questionId] !== answer) return
      setListeningGradedAnswers((prev) => ({
        ...prev,
        [questionId]: Boolean(result?.correct),
      }))
    } catch {
      // 채점 요청 실패는 오답으로 표시하지 않고 Next 버튼도 활성화하지 않는다.
    }
  }

  const handleListeningComplete = async () => {
    if (!isListeningComplete || saveProgress.isPending) return

    if (sectionId === null || sectionId < 0) {
      onBack()
      return
    }

    try {
      await saveProgress.mutateAsync({
        sectionId,
        payload: {
          currentPage: Math.max(1, listeningQuestions.length),
          stayTimeSeconds: 0,
          isCompleted: true,
        },
      })
      onBack()
    } catch {
      // 저장 실패 시 현재 화면을 유지해 사용자가 다시 시도할 수 있게 한다.
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
    if (reviewMarkComplete === null) return

    if (sectionId !== null) {
      try {
        await saveProgress.mutateAsync({
          sectionId,
          payload: {
            currentPage: 1,
            stayTimeSeconds: 0,
            isCompleted: reviewMarkComplete === true,
            difficulty: reviewMarkComplete === true ? reviewDifficulty : undefined,
          },
        })
      } catch {
        return
      }

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
                ? grammarContent?.title || '을까요? 1)'
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

        {activePractice ? (
          <section className="grammar-practice-practice-intro" aria-label="practice question">
            {activePractice.hasImagePlaceholder ? (
              <span className="grammar-practice-practice-image" aria-hidden="true" />
            ) : null}
            <div className="grammar-practice-practice-intro-copy">
              {activePractice.fixedQuestion ? (
                <p className="grammar-practice-practice-question">{activePractice.fixedQuestion}</p>
              ) : null}
              {practiceItemCount > 1 ? (
                <div
                  className="grammar-practice-practice-dots"
                  role="list"
                  aria-label="practice item progress"
                >
                  {Array.from({ length: practiceItemCount }).map((_, index) => (
                    <span
                      key={index}
                      role="listitem"
                      className={`grammar-practice-practice-dot ${
                        index === practiceItemIndex ? 'grammar-practice-practice-dot-active' : ''
                      }`}
                      aria-current={index === practiceItemIndex ? 'step' : undefined}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

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
                disabled={
                  reviewMarkComplete === null ||
                  saveProgress.isPending ||
                  createScrap.isPending
                }
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
              <div className="grammar-practice-next-grammar-description" dir={grammarExplanationDir}>
                {grammarExplanationLines.map((line, index) => (
                  <p key={`${index}-${line}`} className="grammar-practice-next-grammar-description-line">
                    {line}
                  </p>
                ))}
              </div>
              {grammarTable ? (
                <table className="grammar-practice-next-grammar-table">
                  {grammarTable.headers.length > 0 ? (
                    <thead>
                      <tr>
                        {grammarTable.headers.map((header, index) => (
                          <th key={`${index}-${header}`} scope="col">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {grammarTable.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>
                            {/* 예시처럼 셀 안에 값이 여러 개면 줄바꿈으로 이어 내려준다. */}
                            {cell.split('\n').map((line, lineIndex) => (
                              <span key={lineIndex} className="grammar-practice-next-grammar-table-line">
                                {line}
                              </span>
                            ))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="grammar-practice-next-grammar-grid" aria-hidden="true">
                  {fallbackGrammarGridItems.map((item, index) => (
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
              )}
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
          <section className="grammar-practice-listening-screen grammar-practice-listening-screen-script-visible">
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
            <div className="grammar-practice-listening-audio-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 9.5H7.5L12 5.5V18.5L7.5 14.5H4V9.5Z"
                  fill="currentColor"
                />
                <path
                  d="M15.5 8.5C16.5 9.5 17 10.7 17 12C17 13.3 16.5 14.5 15.5 15.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M18 6C19.6 7.6 20.5 9.7 20.5 12C20.5 14.3 19.6 16.4 18 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="grammar-practice-listening-scroll-area">
              <section className="grammar-practice-listening-script-card">
                {isInitialMaterialsLoading ? null : listeningDialogueLines.length > 0 ? (
                  listeningDialogueLines.map((line, index) => (
                    <p key={`${index}-${line.ko}`} className="grammar-practice-listening-script-line">
                      <span className="grammar-practice-listening-script-speaker">{line.speaker}</span> {line.ko}
                    </p>
                  ))
                ) : listeningTranscriptLines.length > 0 ? (
                  listeningTranscriptLines.map((line, index) => (
                    <p key={`${index}-${line}`} className="grammar-practice-listening-script-line">
                      {line}
                    </p>
                  ))
                ) : (
                  <>
                    <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">남자</span> 토요일 몇 시에 만날까요?</p>
                    <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">여자</span> 2시나 3시에 만나요.</p>
                    <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">남자</span> 그럼 2시에 만나요.</p>
                    <p className="grammar-practice-listening-script-line grammar-practice-listening-script-line-indented">그런데 어디에서 만날까요?</p>
                    <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">여자</span> 백화점 앞에서 만날까요?</p>
                    <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">남자</span> 백화점 앞에는 사람이 많아요.</p>
                    <p className="grammar-practice-listening-script-line grammar-practice-listening-script-line-indented">2시에 서점 앞에서 만나요.</p>
                    <p className="grammar-practice-listening-script-line"><span className="grammar-practice-listening-script-speaker">여자</span> 네, 알았어요.</p>
                  </>
                )}
              </section>
              <div
                className="grammar-practice-listening-question-viewport"
              onPointerDown={(event) => {
                listeningDragStartXRef.current = event.clientX
                listeningDragOffsetRef.current = 0
                listeningDidDragRef.current = false
                setIsListeningDragging(true)
              }}
              onPointerMove={(event) => {
                if (listeningDragStartXRef.current === null) return
                const deltaX = event.clientX - listeningDragStartXRef.current
                if (Math.abs(deltaX) > 8) listeningDidDragRef.current = true
                listeningDragOffsetRef.current = deltaX
                setListeningDragOffset(deltaX)
              }}
              onPointerUp={() => {
                if (listeningDragStartXRef.current === null) return
                const finalDragOffset = listeningDragOffsetRef.current
                if (
                  finalDragOffset <= -32 &&
                  listeningQuestionIndexForDisplay < listeningQuestions.length - 1
                ) {
                  setListeningQuestionIndex(listeningQuestionIndexForDisplay + 1)
                }
                if (finalDragOffset >= 32 && listeningQuestionIndexForDisplay > 0) {
                  setListeningQuestionIndex(listeningQuestionIndexForDisplay - 1)
                }
                listeningDragStartXRef.current = null
                listeningDragOffsetRef.current = 0
                setListeningDragOffset(0)
                setIsListeningDragging(false)
                window.setTimeout(() => {
                  listeningDidDragRef.current = false
                }, 0)
              }}
              onPointerLeave={() => {
                if (listeningDragStartXRef.current === null) return
                listeningDragStartXRef.current = null
                listeningDragOffsetRef.current = 0
                setListeningDragOffset(0)
                setIsListeningDragging(false)
                window.setTimeout(() => {
                  listeningDidDragRef.current = false
                }, 0)
              }}
              onPointerCancel={() => {
                listeningDragStartXRef.current = null
                listeningDragOffsetRef.current = 0
                setListeningDragOffset(0)
                setIsListeningDragging(false)
                listeningDidDragRef.current = false
              }}
              >
                <div
                  className={`grammar-practice-listening-question-track ${
                    isListeningDragging ? 'is-dragging' : ''
                  }`}
                  style={{ transform: `translateX(${listeningTrackTranslate}px)` }}
                >
                  {listeningQuestions.map((question) => {
                  const selectedListeningAnswer = listeningAnswers[question.questionId] ?? ''
                  const listeningGrade = listeningGradedAnswers[question.questionId]
                  const hasListeningResult = listeningGrade !== undefined

                  return (
                    <section
                      key={question.questionId}
                      className="grammar-practice-listening-question-slide"
                    >
                      {hasListeningResult ? (
                        <span
                          className={`grammar-practice-reading-result-art ${
                            listeningGrade
                              ? 'grammar-practice-reading-result-art-correct'
                              : 'grammar-practice-reading-result-art-wrong'
                          }`}
                          aria-hidden="true"
                        >
                          <span className="grammar-practice-reading-result-mark" />
                          <img src={listeningGrade ? choiceCorrectImage : choiceWrongImage} alt="" />
                        </span>
                      ) : null}
                      <div className="grammar-practice-listening-question-card">
                        <p className="grammar-practice-listening-question-title">{question.title}</p>
                        <p className="grammar-practice-listening-question-prompt">{question.prompt}</p>
                        {question.options.length > 0 ? (
                          <div className="grammar-practice-listening-options">
                            {question.options.map((option) => {
                              const isSelected = selectedListeningAnswer === option
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  className={`grammar-practice-listening-option-button ${
                                    isSelected ? 'grammar-practice-listening-option-button-selected' : ''
                                  } ${
                                    isSelected && listeningGrade === true
                                      ? 'grammar-practice-listening-option-button-correct'
                                      : ''
                                  } ${
                                    isSelected && listeningGrade === false
                                      ? 'grammar-practice-listening-option-button-wrong'
                                      : ''
                                  }`}
                                  onClick={() => {
                                    if (listeningDidDragRef.current) return
                                    void handleListeningAnswerChange(question, option)
                                  }}
                                >
                                  {option}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="grammar-practice-answer-input"
                            value={selectedListeningAnswer}
                            onPointerDown={(event) => event.stopPropagation()}
                            onPointerUp={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            const nextAnswer = event.target.value
                            listeningAnswersRef.current = {
                              ...listeningAnswersRef.current,
                              [question.questionId]: nextAnswer,
                            }
                            setListeningAnswers((previousAnswers) => ({
                              ...previousAnswers,
                              [question.questionId]: nextAnswer,
                            }))
                            setListeningGradedAnswers((previousGrades) => {
                              const nextGrades = { ...previousGrades }
                              delete nextGrades[question.questionId]
                              return nextGrades
                            })
                          }}
                            onBlur={(event) =>
                              void handleListeningAnswerChange(question, event.target.value)
                            }
                          />
                        )}
                      </div>
                    </section>
                  )
                  })}
                </div>
              </div>
              <div className="grammar-practice-listening-dots" aria-label="listening question progress">
                {listeningQuestions.map((question, index) => (
                  <span
                    key={question.questionId}
                    className={`grammar-practice-listening-dot ${
                      index === listeningQuestionIndexForDisplay
                        ? 'grammar-practice-listening-dot-active'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grammar-practice-listening-action-row">
              <button
                type="button"
                className={`grammar-practice-listening-next-button ${
                  isListeningComplete && !saveProgress.isPending
                    ? 'grammar-practice-listening-next-button-active'
                    : ''
                }`}
                disabled={!isListeningComplete || saveProgress.isPending}
                onClick={() => void handleListeningComplete()}
              >
                {saveProgress.isPending ? 'SAVING...' : 'Next'}
              </button>
              {saveProgress.error ? (
                <p className="grammar-practice-review-error grammar-practice-listening-save-error">
                  {saveProgress.error.message}
                </p>
              ) : null}
            </div>
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
              {readingDialogueLines.length > 0 ? (
                readingDialogueLines.map((line, index) => (
                  <p key={`${index}-${line.ko}`} className="grammar-practice-reading-line">
                    <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                      {line.speaker}
                    </span>{' '}
                    {line.ko}
                  </p>
                ))
              ) : (
                <>
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
                </>
              )}
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
                  const isReadingChoiceCorrect = readingGradedAnswers[index] === true
                  const hasReadingChoiceResult =
                    question.type === 'choice' &&
                    Boolean(selectedReadingAnswer) &&
                    readingGradedAnswers[index] !== undefined

                  return (
                    <section key={question.questionId} className="grammar-practice-reading-question-slide">
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
                              const isAnsweredChoice = hasReadingChoiceResult
                              const isCorrectOption = isReadingChoiceCorrect
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
                                    void handleReadingAnswerChange(index, question, option)
                                  }}
                                >
                                  {option}
                                </button>
                              )
                            })}
                          </div>
                        ) : hasServerQuestions ? (
                          <div className="grammar-practice-reading-blank-group">
                            <input
                              type="text"
                              className="grammar-practice-answer-input"
                              value={selectedReadingAnswer ?? ''}
                              onPointerDown={(event) => event.stopPropagation()}
                              onPointerUp={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setReadingAnswers((prev) => ({ ...prev, [index]: event.target.value }))
                              }
                              onBlur={(event) =>
                                void handleReadingAnswerChange(index, question, event.target.value)
                              }
                            />
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
                  key={question.questionId}
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
                setListeningQuestionIndex(0)
                setListeningAnswers({})
                listeningAnswersRef.current = {}
                setListeningGradedAnswers({})
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
                {sentenceTokens.length > 0 ? (
                  <div className="grammar-practice-make-row" aria-label="sentence building prompt">
                    {sentenceTokens.map((token, index) => (
                      <Fragment key={`${index}-${token}`}>
                        {index > 0 ? (
                          <span className="grammar-practice-make-divider" aria-hidden="true" />
                        ) : null}
                        <span className="grammar-practice-make-token">{token}</span>
                      </Fragment>
                    ))}
                  </div>
                ) : null}
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
                          void handleTextAnswerSubmit('make', makeSentenceAnswer)
                        }
                      }}
                    />
                  </div>
                  {isWrongAnswer || showMakeSample ? (
                    <p className="grammar-practice-correct-answer grammar-practice-correct-answer-make">
                      {showMakeSample ? `Sample: ${correctAnswer}` : correctAnswer}
                    </p>
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
                  <p className="grammar-practice-question-text">
                    {activePractice ? activePractice.prefix : isFillStep ? fillPrompt : choicePrompt}
                  </p>
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
                            void handleTextAnswerSubmit('fill', typedAnswer)
                          }
                        }}
                      />
                    ) : (
                      <div className="grammar-practice-answer-slot">{isAnswered ? selectedAnswer : null}</div>
                    )}
                    {isFillStep && isWrongAnswer ? (
                      <p className="grammar-practice-correct-answer grammar-practice-correct-answer-fill">
                        {correctAnswer}
                      </p>
                    ) : null}
                  </div>
                  {activePractice ? (
                    // 연습 문항은 빈칸 뒤 어미("예요.")까지 prompt 에 들어 있어 마침표를 따로 찍지 않는다.
                    activePractice.suffix ? (
                      <p className="grammar-practice-question-text">{activePractice.suffix}</p>
                    ) : null
                  ) : (
                    <span className="grammar-practice-question-dot">.</span>
                  )}
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
            disabled={!isNextPracticeStepEnabled}
            onClick={() => {
              if (canSubmitTextAnswer) {
                pushHistory()
                void handleTextAnswerSubmit(isMakeStep ? 'make' : 'fill', currentTextAnswer)
                return
              }
              if (!canMoveToNextPracticeStep) return
              if (practiceStep === 'choice') {
                pushHistory()
                // 같은 단계에 남은 연습 문항이 있으면 다음 문항으로, 없으면 다음 단계로 넘어간다.
                if (hasNextPracticeItem) {
                  setChoiceItemIndex(choiceItemIndex + 1)
                  setSelectedAnswer('')
                  setRevealedAnswers([])
                  setChoiceFeedback(null)
                  setServerGradedAnswers({})
                  return
                }
                setPracticeStep('fill-intro')
                return
              }
              if (practiceStep === 'fill') {
                pushHistory()
                if (hasNextPracticeItem) {
                  setFillItemIndex(fillItemIndex + 1)
                  setTypedAnswer('')
                  setSubmittedTypedAnswer('')
                  setFillGrade(null)
                  return
                }
                setPracticeStep('make-intro')
                setMakeSentenceAnswer('')
                setSubmittedMakeSentenceAnswer('')
                return
              }
              if (practiceStep === 'make') {
                pushHistory()
                if (hasNextPracticeItem) {
                  setMakeItemIndex(makeItemIndex + 1)
                  setMakeSentenceAnswer('')
                  setSubmittedMakeSentenceAnswer('')
                  setMakeGrade(null)
                  return
                }
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
