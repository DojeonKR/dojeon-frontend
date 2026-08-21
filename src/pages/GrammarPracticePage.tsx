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
import type { DialogueLine, NextSection, SectionMaterial } from '../types/section,types.ts'
import { useCheckSectionAnswer } from '../hooks/useCheckSectionAnswer.ts'
import { useSaveSectionProgress } from '../hooks/useSaveSectionProgress.ts'
import { useCreateScrap } from '../hooks/useCreateScrap.ts'
import { useSectionPageTimer } from '../hooks/useSectionPageTimer.ts'
import { useSectionAnnotations } from '../hooks/useSectionAnnotations.ts'
import AnnotatedText from '../components/AnnotatedText.tsx'
import {
  annotationNoLessonMessage,
  clearAnnotationReturn,
  findAnnotationUnit,
  pickAnnotationExplanation,
  readAnnotationReturn,
  resolveAnnotationTarget,
  saveAnnotationReturn,
} from '../data/annotationText.ts'
import { isAnnotationTargetAvailable } from '../services/section.service.ts'
import type {
  AnnotationTarget,
  AnnotationUnit,
  MarkMode,
  SectionAnnotation,
} from '../types/annotation.types.ts'
import { PRACTICE_STAGE_ORDER } from '../types/grammarPractice.types.ts'
import type {
  AnnotatedLineSource,
  NextGrammarExampleMessage,
  NextGrammarExampleToken,
  NextGrammarNoteId,
  NextGrammarVocabId,
  PracticeItemModel,
  PracticeQuestionModel,
  PracticeStageId,
  PracticeStep,
} from '../types/grammarPractice.types.ts'
import {
  DEMO_PRACTICE_STAGES,
  PRACTICE_STAGE_BY_STEP,
  grammarPageByStep,
  isSampleAnswerItem,
  matchesPracticeAnswer,
  mergePracticeItems,
  resolvePracticeStep,
  toGrammarTable,
  toMaterialPracticeItems,
  toPracticeQuestions,
  toPracticeStages,
  toQuestionPracticeItems,
  toSentenceTokens,
  toStageEntryStep,
  toTextLines,
} from '../data/grammarPracticeModel.ts'
import { grammarPracticeDemo } from '../data/grammarPracticeDemo.ts'

export type { PracticeStep }

interface GrammarPracticePageProps {
  /** 수업 내부 한 단계 뒤로. 되돌아갈 단계가 없으면 수업 밖으로 나간다. */
  onBack: () => void
  /** 수업을 완전히 종료하고 수업 목록으로 나간다. */
  onExit: () => void
  language: string
  sectionId: number | null
  initialPracticeStep?: PracticeStep
  /**
   * 섹션을 완료 저장한 뒤, 진행도 API 가 알려준 다음 섹션으로 이동한다.
   * nextSection 이 null 이면 코스의 마지막 섹션이라 수업 밖으로 나간다.
   */
  onOpenNextSection: (
    nextSection: NextSection | null,
    options?: { openNextLessonWhenMissing?: boolean },
  ) => void
  /**
   * annotation 팝업의 GO TO LESSON 으로 열린 화면인지 여부.
   * target.mode 가 EXPLANATION_ONLY 면 하단 BACK/NEXT 를 비활성화한다.
   */
  explanationOnly?: boolean
  /**
   * annotation 팝업의 GO TO LESSON. 복귀 정보(현재 섹션/단계)를 함께 넘긴다.
   * 목적지 화면을 열지 못했으면 false 를 돌려준다(팝업이 안내 문구를 띄운다).
   */
  onOpenAnnotationTarget?: (
    target: AnnotationTarget,
    returnInfo: { sectionId: number; step: PracticeStep },
  ) => boolean
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
  practiceItemIndex: number
  serverGradedAnswers: Record<string, boolean>
  textGrade: TextAnswerGrade | null
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

type NextGrammarDialogState =
  | { kind: 'grammar'; id: NextGrammarNoteId }
  | { kind: 'vocab'; id: NextGrammarVocabId }
  // 서버 annotation 팝업. 한 구간에 여러 annotation 이 겹칠 수 있어 목록으로 들고,
  // GO TO LESSON 복귀용으로 unit id 도 함께 기억한다.
  | {
      kind: 'annotation'
      unitId: string
      annotations: SectionAnnotation[]
      index: number
    }

interface AnnotatedDialogueLineModel {
  key: string
  speaker: string
  line: DialogueLine
  source: AnnotatedLineSource
}

// 자료의 dialogues 를 대화/라인 인덱스를 유지한 채 펼쳐서
// 각 라인의 jsonPath($.dialogues[i].lines[j].ko)를 함께 만든다.
function toAnnotatedDialogueLines(material: SectionMaterial | null): AnnotatedDialogueLineModel[] {
  if (!material) return []

  const models: AnnotatedDialogueLineModel[] = []
  ;(material.contentText?.dialogues ?? []).forEach((dialogue, dialogueIndex) => {
    ;(dialogue.lines ?? []).forEach((line, lineIndex) => {
      models.push({
        key: `${dialogueIndex}-${lineIndex}`,
        speaker: line.speaker,
        line,
        source: {
          text: line.ko,
          materialId: material.id,
          jsonPath: `$.dialogues[${dialogueIndex}].lines[${lineIndex}].ko`,
        },
      })
    })
  })
  return models
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

interface TextAnswerGrade {
  answer: string
  correct: boolean
  correctAnswer?: string
  // 자유 작문(FREE)처럼 정답이 하나로 정해지지 않는 문항.
  // correctAnswer 는 예시 문장(sample)일 뿐이라 정/오답 판정에 쓰지 않는다.
  isSample?: boolean
}

function GrammarPracticePage({
  onBack,
  onExit,
  language,
  sectionId,
  initialPracticeStep = 'choice',
  onOpenNextSection,
  explanationOnly = false,
  onOpenAnnotationTarget,
}: GrammarPracticePageProps) {
  const {
    data: questionsData,
    loading: questionsLoading,
    error: questionsError,
    refetch: refetchQuestions,
  } = useSectionQuestions(sectionId)
  const {
    data: materialsData,
    loading: materialsLoading,
    error: materialsError,
    refetch: refetchMaterials,
  } = useSectionMaterials(sectionId)
  const { data: annotationsData } = useSectionAnnotations(sectionId)
  const checkAnswer = useCheckSectionAnswer()
  const saveProgress = useSaveSectionProgress()
  const createScrap = useCreateScrap()

  const sectionQuestions = useMemo(() => questionsData?.questions ?? [], [questionsData])

  // 문법 자료. type 문자열이 섹션마다 다르게 내려올 수 있어(GRAMMAR_TABLE / GRAMMAR / ...)
  // 키워드로 느슨하게 찾고, 그래도 못 찾으면 설명·표·대화가 실린 자료 -> 첫 자료 순으로 쓴다.
  // 여기서 null 로 두면 설명/표/예문이 전부 비어 보이기 때문에 폭넓게 받는다.
  const grammarMaterial = useMemo(() => {
    const materials = materialsData?.materials ?? []
    if (materials.length === 0) return null

    return (
      materials.find((material) => (material.type ?? '').toUpperCase().includes('GRAMMAR')) ??
      materials.find((material) => {
        const content = material.contentText
        return Boolean(
          content?.table ||
            (content?.explanations?.length ?? 0) > 0 ||
            (content?.dialogues?.length ?? 0) > 0,
        )
      }) ??
      materials[0]
    )
  }, [materialsData])
  const grammarMaterialId = grammarMaterial?.id ?? null
  const grammarContent = grammarMaterial?.contentText ?? null

  const sectionMaterials = useMemo(() => materialsData?.materials ?? [], [materialsData])
  const grammarDialogueLines = useMemo(
    () => toAnnotatedDialogueLines(grammarMaterial),
    [grammarMaterial],
  )
  const readingDialogueLines = useMemo(
    () => toAnnotatedDialogueLines(findMaterialByKeywords(sectionMaterials, ['READING', 'TEXT'])),
    [sectionMaterials],
  )
  const listeningMaterial = useMemo(
    () => findMaterialByKeywords(sectionMaterials, ['LISTENING', 'SCRIPT', 'AUDIO']),
    [sectionMaterials],
  )
  const listeningDialogueLines = useMemo(
    () => toAnnotatedDialogueLines(listeningMaterial),
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
    () => toPracticeQuestions(sectionQuestions),
    [sectionQuestions],
  )

  const isInitialMaterialsLoading = materialsLoading && materialsData === null
  const isInitialQuestionsLoading = questionsLoading && questionsData === null
  const isInitialSectionLoading = isInitialMaterialsLoading || isInitialQuestionsLoading
  const sectionLoadError = materialsError ?? questionsError

  // 이 섹션에 실제로 존재하는 연습 단계와 문항.
  // 자료(contentText.practices)와 문항 API 를 합쳐서 만들고, 어느 쪽에도 없는 단계는
  // 흐름에서 아예 빠진다. 즉 MCQ 가 없으면 choice 화면 자체가 나오지 않는다.
  const serverPracticeStages = useMemo(
    () => toPracticeStages(sectionMaterials, sectionQuestions),
    [sectionMaterials, sectionQuestions],
  )
  const serverPracticeItemsByStage = useMemo(() => {
    const byStage = {} as Record<PracticeStageId, PracticeItemModel[]>
    PRACTICE_STAGE_ORDER.forEach((stage) => {
      byStage[stage] = mergePracticeItems(
        toMaterialPracticeItems(sectionMaterials, stage),
        toQuestionPracticeItems(sectionQuestions, stage),
      )
    })
    return byStage
  }, [sectionMaterials, sectionQuestions])
  const availableServerStages = useMemo(
    () => serverPracticeStages.filter((stage) => serverPracticeItemsByStage[stage].length > 0),
    [serverPracticeStages, serverPracticeItemsByStage],
  )

  // 개발 서버 전용 시안 문항. 운영 빌드에서는 grammarPracticeDemo 가 null 이라 이 값도 null 이고,
  // 서버 데이터가 없으면 데모 대신 빈 상태 안내를 보여 준다.
  const demoPracticeItemsByStage = useMemo(() => {
    const demo = grammarPracticeDemo
    if (demo === null) return null

    const base = {
      questionId: null,
      fixedQuestion: '',
      hasImagePlaceholder: false,
      suffix: '',
      isSampleAnswer: false,
      cardBack: '',
    }
    const byStage: Record<PracticeStageId, PracticeItemModel[]> = {
      choice: [
        {
          ...base,
          key: 'demo-choice',
          stage: 'choice',
          kind: 'choose',
          prefix: demo.choice.prompt,
          options: demo.choice.options,
          answers: [demo.choice.correctAnswer],
        },
      ],
      fill: [
        {
          ...base,
          key: 'demo-fill',
          stage: 'fill',
          kind: 'fill',
          prefix: demo.choice.prompt,
          options: [],
          answers: [demo.fillCorrectAnswer],
        },
      ],
      cards: [],
      make: [
        {
          ...base,
          key: 'demo-make',
          stage: 'make',
          kind: 'free',
          prefix: demo.sentenceTokens.join(' / '),
          options: [],
          answers: [demo.makeCorrectAnswer],
        },
      ],
    }
    return byStage
  }, [])

  const useDemoPractice =
    availableServerStages.length === 0 &&
    !isInitialSectionLoading &&
    demoPracticeItemsByStage !== null
  const practiceStages: PracticeStageId[] =
    useDemoPractice && demoPracticeItemsByStage !== null
      ? DEMO_PRACTICE_STAGES
      : availableServerStages
  const practiceItemsByStage =
    useDemoPractice && demoPracticeItemsByStage !== null
      ? demoPracticeItemsByStage
      : serverPracticeItemsByStage
  const firstPracticeStep: PracticeStep | null =
    practiceStages.length > 0 ? toStageEntryStep(practiceStages[0], true) : null

  const [serverGradedAnswers, setServerGradedAnswers] = useState<Record<string, boolean>>({})
  const [textGrade, setTextGrade] = useState<TextAnswerGrade | null>(null)

  const [requestedPracticeStep, setPracticeStep] = useState<PracticeStep>(initialPracticeStep)
  const practiceStep = resolvePracticeStep(
    requestedPracticeStep,
    practiceStages,
    isInitialSectionLoading,
  )
  const [practiceItemCursor, setPracticeItemCursor] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [revealedAnswers, setRevealedAnswers] = useState<string[]>([])
  const [choiceFeedback, setChoiceFeedback] = useState<ChoiceFeedback | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [submittedTypedAnswer, setSubmittedTypedAnswer] = useState('')
  const [makeSentenceAnswer, setMakeSentenceAnswer] = useState('')
  const [submittedMakeSentenceAnswer, setSubmittedMakeSentenceAnswer] = useState('')
  const [history, setHistory] = useState<PracticeStateSnapshot[]>([])
  // MARK 선택 상태는 단일 값으로만 관리한다. 켜진 MARK 를 다시 누르면 null,
  // 다른 MARK 를 누르면 기존 MARK 를 끄고 즉시 교체된다(동시 선택 없음).
  const [markMode, setMarkMode] = useState<MarkMode>(null)
  const showGrammar = markMode === 'GRAMMAR'
  const showVocab = markMode === 'VOCAB'
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
  const [reviewMarkComplete, setReviewMarkComplete] = useState<boolean | null>(true)
  const [reviewSaveScrap, setReviewSaveScrap] = useState<boolean | null>(false)

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
  const isCardsStep = practiceStep === 'cards'
  const isTextStep = isFillStep || isMakeStep
  const isPracticeStep = isChoiceStep || isFillStep || isCardsStep || isMakeStep

  // 지금 단계에서 풀고 있는 연습 문항. 단계 안에서 문항을 순서대로 넘기며 푼다.
  const currentStage = PRACTICE_STAGE_BY_STEP[practiceStep] ?? null
  const currentStageIndex = currentStage === null ? -1 : practiceStages.indexOf(currentStage)
  const currentStageItems = currentStage === null ? [] : practiceItemsByStage[currentStage]
  const practiceItemCount = currentStageItems.length
  // 단계가 바뀌면 문항 수가 달라져서 커서가 범위를 벗어날 수 있어 항상 범위 안으로 맞춘다.
  const practiceItemIndex =
    practiceItemCount > 0 ? Math.min(practiceItemCursor, practiceItemCount - 1) : 0
  const activePractice = currentStageItems[practiceItemIndex] ?? null
  const hasNextPracticeItem = practiceItemIndex < practiceItemCount - 1
  // 연습 화면인데 보여 줄 문항이 없으면 데모로 폴백하지 않고 빈 상태/오류 안내를 그린다.
  const showPracticeEmptyState = isPracticeStep && activePractice === null
  // 진행 표시줄 / 안내 문구 / Next 버튼은 실제 문항을 그릴 때만 띄운다.
  const showPracticeChrome = isPracticeStep && !showPracticeEmptyState
  const fillPromptParts = useMemo(() => {
    if (!isFillStep || activePractice === null) return null

    const lines = activePractice.prefix
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length < 2) return null

    return {
      promptLine: lines.slice(0, -1).join(' '),
      beforeBlank: lines[lines.length - 1],
      afterBlank: activePractice.suffix,
    }
  }, [activePractice, isFillStep])

  const choiceOptions = activePractice?.options ?? []
  // 자유 작문 연습이 고정 질문("이것은 뭐예요?")을 들고 있으면 제시어 줄 대신 그 질문만 보여 준다.
  const sentenceTokens =
    activePractice !== null && activePractice.stage === 'make' && activePractice.fixedQuestion === ''
      ? toSentenceTokens(activePractice.prefix)
      : []

  const currentAnswer = isChoiceStep
    ? selectedAnswer
    : isFillStep
    ? submittedTypedAnswer
    : isMakeStep
    ? submittedMakeSentenceAnswer
    : ''

  // 문항에 정답이 실려 있으면 그것으로, 없으면 채점 API 결과(textGrade)로 판정한다.
  const matchedTextGrade = textGrade && textGrade.answer === currentAnswer ? textGrade : null
  const correctAnswer = matchedTextGrade?.correctAnswer ?? activePractice?.answers[0] ?? ''
  const isAnswered = currentAnswer.length > 0
  // free 연습(자료 free 블록 / FREE 문항)은 정답이 하나로 정해지지 않고 sample(모범 답안)만
  // 오므로 정/오답을 매기지 않는다. 채점 API 응답이 예시였을 때도 같게 본다.
  const isFreeWritingPractice =
    (activePractice?.kind === 'free' && activePractice.isSampleAnswer) ||
    matchedTextGrade?.isSample === true
  const showMakeSample = isFreeWritingPractice && isAnswered && correctAnswer.length > 0

  let isCorrectAnswer: boolean
  let isWrongAnswer: boolean
  if (!isPracticeStep || isFreeWritingPractice) {
    isCorrectAnswer = false
    isWrongAnswer = false
  } else if (isChoiceStep) {
    isCorrectAnswer = isAnswered && serverGradedAnswers[currentAnswer] === true
    isWrongAnswer = isAnswered && serverGradedAnswers[currentAnswer] === false
  } else {
    isCorrectAnswer = matchedTextGrade?.correct === true
    isWrongAnswer = matchedTextGrade?.correct === false
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
  const canMoveToNextPracticeStep = isCardsStep
    ? activePractice !== null
    : isAnswered &&
      !checkAnswer.isPending &&
      (!isChoiceStep || showChoiceFeedbackPanel) &&
      (!isTextStep || hasCompletedTextGrade)
  const currentTextAnswer = isMakeStep ? makeSentenceAnswer : typedAnswer
  const submittedTextAnswer = isMakeStep ? submittedMakeSentenceAnswer : submittedTypedAnswer
  const canSubmitTextAnswer =
    isTextStep &&
    !checkAnswer.isPending &&
    currentTextAnswer.trim().length > 0 &&
    currentTextAnswer.trim() !== submittedTextAnswer
  const isNextPracticeStepEnabled = canSubmitTextAnswer || canMoveToNextPracticeStep

  // 서버 문항이 내려오면 그것을 쓰고, 개발 서버에서만 시안 문항으로 폴백한다.
  // 운영 빌드에서는 grammarPracticeDemo 가 null 이라 문항이 없으면 그냥 비워 둔다.
  const hasServerQuestions = serverPracticeQuestions.length > 0
  const canUseDemoQuestions =
    !hasServerQuestions && !isInitialQuestionsLoading && grammarPracticeDemo !== null
  const readingQuestions: PracticeQuestionModel[] = hasServerQuestions
    ? serverPracticeQuestions
    : canUseDemoQuestions
      ? grammarPracticeDemo?.readingQuestions ?? []
      : []
  // 데모 지문 문항은 화면에 직접 박아 둔 빈칸 두 개를 따로 채워야 완료로 본다.
  const isReadingComplete = isInitialQuestionsLoading
    ? false
    : readingQuestions.length === 0
      ? true
      : hasServerQuestions
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
  const listeningQuestions = isInitialQuestionsLoading
    ? []
    : hasServerQuestions
      ? serverPracticeQuestions
      : canUseDemoQuestions
        ? grammarPracticeDemo?.listeningQuestions ?? []
        : []
  // 문항이 하나도 없는 섹션이라도 대본만 듣고 완료할 수 있어야 해서 빈 목록은 완료로 본다.
  const isListeningComplete =
    !isInitialQuestionsLoading &&
    !checkAnswer.isPending &&
    listeningQuestions.every(
      (question) => {
        const hasAnswer = (listeningAnswers[question.questionId] ?? '').trim().length > 0
        // FREE 는 채점하지 않으므로 답을 쓰기만 하면 완료로 본다.
        if (question.type === 'free') return hasAnswer
        return hasAnswer && listeningGradedAnswers[question.questionId] !== undefined
      },
    )
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
  // 서버 설명이 있으면 mother language 에 맞는 것을 쓴다.
  // 없으면 개발 서버에서만 시안 문구로 폴백하고, 운영에서는 설명 영역을 비워 둔다.
  const grammarExplanation = pickContentExplanation(grammarContent, contentLanguage)
  const serverGrammarExplanationLines = grammarExplanation
    ? toTextLines(grammarExplanation.text)
    : []
  const grammarExplanationLines =
    serverGrammarExplanationLines.length > 0
      ? serverGrammarExplanationLines
      : grammarPracticeDemo?.explanationLines(contentLanguage) ?? []
  const grammarExplanationDir = grammarExplanation
    ? contentTextDirection(toContentLanguage(grammarExplanation.lang))
    : contentTextDirection(contentLanguage)
  // 서버가 이 섹션의 대화를 내려주면 레슨별 예문을 그대로 쓰고, 없을 때만 데모 예문으로 폴백한다.
  // 서버 예문은 annotation API(unit) 매칭 정보를 들고 있어 Mark Grammar / Mark Vocab
  // 하이라이트가 annotation 범위 그대로 붙는다.
  const serverNextGrammarExamples: NextGrammarExampleMessage[] = grammarDialogueLines.map(
    (model, index) => ({
      id: `grammar-dialogue-${index}`,
      side: model.speaker === grammarDialogueLines[0]?.speaker ? 'left' : 'right',
      translation: pickDialogueTranslation(model.line, contentLanguage),
      tokens: [{ text: model.source.text, emphasis: 'medium' as const }],
      annotated: model.source,
    }),
  )
  const nextGrammarExamples =
    serverNextGrammarExamples.length > 0
      ? serverNextGrammarExamples
      : grammarPracticeDemo?.nextGrammarExamples(contentLanguage) ?? []
  // 서버 표가 있으면 헤더/행 그대로 표를 그린다.
  // 표가 없으면 운영에서는 아무것도 그리지 않고, 개발 서버에서만 시안 그리드를 보여 준다.
  const grammarTable = toGrammarTable(grammarContent?.table)
  const demoGrammarGridItems =
    grammarTable === null ? grammarPracticeDemo?.grammarGridItems ?? null : null
  // 아래 두 노트는 데모 예문의 토큰 마크 전용이다. 운영 예문은 annotation API 로 팝업을 띄운다.
  const nextGrammarNotes: Record<NextGrammarNoteId, { title: string; description: string }> | null =
    grammarPracticeDemo?.grammarNotes ?? null
  const nextGrammarVocabNotes:
    | Record<NextGrammarVocabId, { title: string; description: string }>
    | null = grammarPracticeDemo?.vocabNotes ?? null

  const toggleShowGrammar = () => {
    setMarkMode((current) => (current === 'GRAMMAR' ? null : 'GRAMMAR'))
    setActiveNextGrammarDialog(null)
  }
  const toggleShowVocab = () => {
    setMarkMode((current) => (current === 'VOCAB' ? null : 'VOCAB'))
    setActiveNextGrammarDialog(null)
  }

  // 목적지 조회가 404 등으로 실패했을 때 팝업에 대신 띄우는 문구.
  const [annotationLessonBlockedMessage, setAnnotationLessonBlockedMessage] = useState<
    string | null
  >(null)
  const [isCheckingAnnotationTarget, setIsCheckingAnnotationTarget] = useState(false)

  // 서버 annotation 마크 클릭 → concept.explanation 팝업.
  const handleAnnotationPress = (unit: AnnotationUnit, annotations: SectionAnnotation[]) => {
    if (annotations.length === 0) return
    setAnnotationLessonBlockedMessage(null)
    setIsCheckingAnnotationTarget(false)
    setActiveNextGrammarDialog({
      kind: 'annotation',
      unitId: unit.id,
      annotations,
      index: 0,
    })
  }

  // annotation 팝업의 GO TO LESSON.
  // annotation 타입과 맞는 목적지인지 확인하고, 실제로 열리는 섹션일 때만 이동한다.
  // 이동할 수 없으면 다른 화면으로 폴백하지 않고 팝업에 안내 문구만 남긴다.
  const handleGoToAnnotationLesson = async (unitId: string, annotation: SectionAnnotation) => {
    if (isCheckingAnnotationTarget) return

    const target = resolveAnnotationTarget(annotation)
    if (!target || target.sectionId === null || !onOpenAnnotationTarget || sectionId === null || markMode === null) {
      setAnnotationLessonBlockedMessage(annotationNoLessonMessage(annotation.type))
      return
    }

    setIsCheckingAnnotationTarget(true)
    let available = false
    try {
      available = await isAnnotationTargetAvailable(target.sectionId, target.sectionType)
    } finally {
      setIsCheckingAnnotationTarget(false)
    }

    if (!available) {
      setAnnotationLessonBlockedMessage(annotationNoLessonMessage(annotation.type))
      return
    }

    saveAnnotationReturn({
      sectionId,
      unitId,
      annotationId: annotation.id,
      markMode,
    })

    if (!onOpenAnnotationTarget(target, { sectionId, step: practiceStep })) {
      // 화면을 열지 못했으면 복귀 기록을 되돌리고 안내 문구만 띄운다.
      clearAnnotationReturn()
      setAnnotationLessonBlockedMessage(annotationNoLessonMessage(annotation.type))
      return
    }

    setActiveNextGrammarDialog(null)
  }

  // GO TO LESSON 후 상단 뒤로가기로 복귀했을 때 저장해 둔 팝업을 다시 연다.
  const [pendingAnnotationRestore, setPendingAnnotationRestore] = useState(() => {
    if (explanationOnly || sectionId === null) return null
    const record = readAnnotationReturn()
    return record && record.sectionId === sectionId ? record : null
  })

  useEffect(() => {
    if (pendingAnnotationRestore === null || annotationsData === null) return

    const timer = window.setTimeout(() => {
      clearAnnotationReturn()
      setPendingAnnotationRestore(null)

      const unit = annotationsData.units.find(
        (candidate) => candidate.id === pendingAnnotationRestore.unitId,
      )
      const annotation =
        unit?.annotations.find(
          (candidate) =>
            candidate.id === pendingAnnotationRestore.annotationId &&
            candidate.type === pendingAnnotationRestore.markMode,
        ) ?? null
      if (!unit || !annotation) return

      setMarkMode(pendingAnnotationRestore.markMode)
      setActiveNextGrammarDialog({
        kind: 'annotation',
        unitId: unit.id,
        annotations: [annotation],
        index: 0,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [annotationsData, pendingAnnotationRestore])

  // 라인 하나를 annotation unit 과 매칭해 그린다. 원문이 unit.text 와 정확히
  // 일치하지 않거나 분석 전이면 AnnotatedText 가 일반 텍스트로 폴백한다.
  const renderAnnotatedLineText = (source: AnnotatedLineSource, className?: string) => {
    const unit = findAnnotationUnit(annotationsData, source.materialId, source.jsonPath, source.text)
    return (
      <AnnotatedText
        text={source.text}
        unit={unit}
        markMode={markMode}
        className={className}
        onAnnotationPress={(annotations) => {
          if (unit) handleAnnotationPress(unit, annotations)
        }}
      />
    )
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
  // 한 문항을 끝내고 다음 문항/단계로 넘어갈 때 입력과 채점 결과를 비운다.
  const resetPracticeAnswers = () => {
    setSelectedAnswer('')
    setRevealedAnswers([])
    setChoiceFeedback(null)
    setTypedAnswer('')
    setSubmittedTypedAnswer('')
    setMakeSentenceAnswer('')
    setSubmittedMakeSentenceAnswer('')
    setServerGradedAnswers({})
    setTextGrade(null)
  }
  const resetPracticeFlow = () => {
    setPracticeItemCursor(0)
    resetPracticeAnswers()
  }
  // 다음 연습 단계로 이동한다. 남은 단계가 없으면 마무리(review) 화면으로 넘어간다.
  const goToNextPracticeStage = () => {
    const nextStage = currentStageIndex >= 0 ? practiceStages[currentStageIndex + 1] : undefined
    setPracticeItemCursor(0)
    resetPracticeAnswers()
    setPracticeStep(nextStage ? toStageEntryStep(nextStage, false) : 'review')
  }


  const isNextGrammarDialogActive = (
    kind: 'grammar' | 'vocab',
    id: NextGrammarNoteId | NextGrammarVocabId,
  ) =>
    activeNextGrammarDialog !== null &&
    activeNextGrammarDialog.kind === kind &&
    activeNextGrammarDialog.id === id

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
  // 서버 예문은 annotation 기반으로, 데모 예문은 하드코딩된 토큰 마크로 그린다.
  const renderNextGrammarExampleContent = (example: NextGrammarExampleMessage) =>
    example.annotated
      ? renderAnnotatedLineText(example.annotated, 'grammar-practice-next-grammar-bubble-medium')
      : renderNextGrammarExampleTokens(example.tokens)

  const currentSnapshot: PracticeStateSnapshot = {
    practiceStep,
    selectedAnswer,
    revealedAnswers,
    choiceFeedback,
    typedAnswer,
    submittedTypedAnswer,
    makeSentenceAnswer,
    submittedMakeSentenceAnswer,
    practiceItemIndex: practiceItemCursor,
    serverGradedAnswers,
    textGrade,
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
    setPracticeItemCursor(snapshot.practiceItemIndex)
    setServerGradedAnswers(snapshot.serverGradedAnswers)
    setTextGrade(snapshot.textGrade)
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
  // 하단 BACK 전용 핸들러: 수업 내부의 이전 단계로만 이동한다.
  // 상단 화살표/닫기는 onExit으로 분리되어 항상 수업을 종료한다.
  const handleBackPress = () => {
    if (history.length > 0) {
      const previousSnapshot = history[history.length - 1]
      setHistory((prev) => prev.slice(0, -1))
      applySnapshot(previousSnapshot)
      return
    }
    onBack()
  }

  // 지금 문항을 채점한다. 문항에 정답이 실려 있으면(자료 연습/문항 API 응답) 바로 판정하고,
  // 정답이 없고 문항 API 문항이면 채점 API 를 부른다. 둘 다 아니면 채점하지 않는다.
  //
  // 자유 작문(FREE)은 예외다. 문항 목록의 answer 도, 채점 API 의 correctAnswer 도
  // 유일한 정답이 아니라 예시 문장이라 Exact match 로 정/오답을 매기지 않고 예시만 보여 준다.
  const gradePracticeAnswer = async (
    item: PracticeItemModel,
    answer: string,
  ): Promise<TextAnswerGrade | null> => {
    const isSample = isSampleAnswerItem(item)

    if (item.answers.length > 0) {
      return {
        answer,
        correct: isSample ? false : matchesPracticeAnswer(item, answer),
        correctAnswer: item.answers[0],
        isSample,
      }
    }

    if (item.questionId === null || sectionId === null) {
      // 예시 문장조차 없는 자유 작문은 제출만으로 끝낸다(다음으로 넘어갈 수 있게 한다).
      return item.kind === 'free' ? { answer, correct: false, isSample: true } : null
    }

    try {
      const result = await checkAnswer.mutateAsync({
        sectionId,
        payload: { questionId: item.questionId, userAnswer: answer },
      })
      // FREE 는 응답의 correct 를 판정으로 쓰지 않는다(항상 true 로 오고 correctAnswer 는 예시다).
      const isSampleResult = isSample || item.kind === 'free'
      return {
        answer,
        correct: isSampleResult ? false : Boolean(result?.correct),
        correctAnswer: result?.correctAnswer,
        isSample: isSampleResult,
      }
    } catch {
      // 채점 요청 실패는 오답으로 표시하지 않는다.
      return item.kind === 'free' ? { answer, correct: false, isSample: true } : null
    }
  }

  const handleChoiceOptionClick = async (option: string) => {
    if (activePractice === null) return

    pushHistory()
    setSelectedAnswer(option)
    setChoiceFeedback(null)
    setRevealedAnswers((prev) => (prev.includes(option) ? prev : [...prev, option]))

    const grade = await gradePracticeAnswer(activePractice, option)
    if (grade === null) return

    setServerGradedAnswers((prev) => ({ ...prev, [option]: grade.correct }))
    setChoiceFeedback({
      answer: option,
      result: grade.correct ? 'correct' : 'wrong',
      phase: 'flash',
    })
  }

  const handleTextAnswerSubmit = async (kind: 'fill' | 'make', rawAnswer: string) => {
    const answer = rawAnswer.trim()
    if (kind === 'fill') setSubmittedTypedAnswer(answer)
    else setSubmittedMakeSentenceAnswer(answer)

    if (answer.length === 0 || activePractice === null) return

    const grade = await gradePracticeAnswer(activePractice, answer)
    if (grade !== null) setTextGrade(grade)
  }

  const handleReadingAnswerChange = async (
    index: number,
    question: PracticeQuestionModel,
    answer: string,
  ) => {
    setReadingAnswers((prev) => ({ ...prev, [index]: answer }))

    if (answer.trim().length === 0) return

    // FREE 는 answer 가 예시 문장이라 Exact match 로 채점하지 않고 정/오답 표시도 하지 않는다.
    if (question.type === 'free') return

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

    // FREE 는 answer 가 예시 문장이라 Exact match 로 채점하지 않고 정/오답 표시도 하지 않는다.
    if (question.type === 'free') return

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
      onOpenNextSection(null, { openNextLessonWhenMissing: true })
      return
    }

    try {
      const result = await saveProgress.mutateAsync({
        sectionId,
        payload: {
          currentPage: Math.max(1, listeningQuestions.length),
          stayTimeSeconds: 0,
          isCompleted: true,
        },
      })
      onOpenNextSection(result?.nextSection ?? null, { openNextLessonWhenMissing: true })
    } catch {
      // 저장 실패 시 현재 화면을 유지해 사용자가 다시 시도할 수 있게 한다.
    }
  }

  const handleReadingComplete = async () => {
    if (!isReadingComplete || saveProgress.isPending || explanationOnly) return

    // 개발용
    if (sectionId === null || sectionId < 0) {
      pushHistory()
      setListeningQuestionIndex(0)
      setListeningAnswers({})
      listeningAnswersRef.current = {}
      setListeningGradedAnswers({})
      setPracticeStep('listening')
      return
    }

    try {
      const result = await saveProgress.mutateAsync({
        sectionId,
        payload: {
          currentPage: Math.max(1, readingQuestions.length),
          stayTimeSeconds: 0,
          isCompleted: true,
        },
      })
      onOpenNextSection(result?.nextSection ?? null)
    } catch {
      // 저장 실패 시 READING 화면을 유지해 다시 시도할 수 있게 한다.
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

  const handleReviewSubmit = async () => {
    if (reviewMarkComplete === null) return

    // sectionId 가 없으면(데모/프리뷰) 서버 진행도가 없으므로 지금 섹션 안에서만 다음 화면으로 넘어간다.
    if (sectionId === null) {
      pushHistory()
      setPracticeStep('next-grammar')
      return
    }

    let nextSection: NextSection | null = null
    try {
      const result = await saveProgress.mutateAsync({
        sectionId,
        payload: {
          currentPage: 1,
          stayTimeSeconds: 0,
          isCompleted: reviewMarkComplete === true,
          difficulty: reviewMarkComplete === true ? reviewDifficulty : undefined,
        },
      })
      nextSection = result?.nextSection ?? null
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

    // 다음 섹션 ID/타입은 서버가 정한다. 여기서 현재 sectionId 를 유지하면
    // 방금 끝낸 섹션 자료를 다시 불러와 같은 화면이 반복된다.
    onOpenNextSection(nextSection)
  }

  const answerColumn = (
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
        <p className="grammar-practice-correct-answer grammar-practice-correct-answer-fill">{correctAnswer}</p>
      ) : null}
    </div>
  )

  if (isFillIntroStep) {
    return (
      <main className="grammar-practice-fill-intro-page">
        <section className="grammar-practice-fill-intro-content" aria-label="word typing intro">
          <button
            type="button"
            className="grammar-practice-fill-intro-back"
            onClick={onExit}
            aria-label="수업 나가기"
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
            onClick={onExit}
            aria-label="수업 나가기"
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
            <button type="button" className="grammar-practice-close" onClick={onExit} aria-label="수업 나가기">
              <svg className="grammar-practice-close-icon" width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
                <path d="M21 9L9 21M9 9L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className="grammar-practice-title">Review</h1>
          </header>
        ) : (
          <header className="grammar-practice-header">
            <button type="button" className="grammar-practice-back" onClick={onExit} aria-label="수업 나가기">
              <svg className="grammar-practice-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="grammar-practice-title">
              {isNextGrammarStep
                ? grammarContent?.title || grammarPracticeDemo?.sectionTitle || 'Grammar'
                : isListeningStep
                ? 'Listening'
                : isReadingStep
                ? 'Reading'
                : 'Practice'}
            </h1>
          </header>
        )}

        {!showPracticeChrome ? null : (
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

        {!showPracticeChrome ? null : (
          <p className="grammar-practice-guide">
            {isMakeStep
              ? 'Make your own sentence.'
              : isFillStep
              ? 'Fill in the blanks.'
              : isCardsStep
              ? 'Tap each card to check the meaning.'
              : 'Choose the correct answer.'}
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
              {/* 카드 연습은 한 화면에 카드를 모두 펼치므로 문항 진행 점을 그리지 않는다. */}
              {practiceItemCount > 1 && !isCardsStep ? (
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
                onClick={() => void handleReviewSubmit()}
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
              {isInitialMaterialsLoading ? (
                <p className="grammar-practice-status">Loading...</p>
              ) : grammarExplanationLines.length > 0 ? (
                <div className="grammar-practice-next-grammar-description" dir={grammarExplanationDir}>
                  {grammarExplanationLines.map((line, index) => (
                    <p key={`${index}-${line}`} className="grammar-practice-next-grammar-description-line">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="grammar-practice-status">
                  {sectionLoadError
                    ? sectionLoadError.message
                    : '아직 이 문법의 설명이 준비되지 않았어요.'}
                </p>
              )}
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
              ) : demoGrammarGridItems ? (
                <div className="grammar-practice-next-grammar-grid" aria-hidden="true">
                  {demoGrammarGridItems.map((item, index) => (
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
              ) : null}
            </section>

            {nextGrammarExamples.length > 0 ? (
            <section className="grammar-practice-next-grammar-examples-section">
              <h2 className="grammar-practice-next-grammar-heading">Examples</h2>
              <div className="grammar-practice-next-grammar-hero-row">
                <span className="grammar-practice-next-grammar-example-avatar grammar-practice-next-grammar-example-avatar-left" aria-hidden="true">
                  <img src={exampleLeftImage} alt="" />
                </span>
                <div className="grammar-practice-next-grammar-bubble-stack">
                  <div className="grammar-practice-next-grammar-bubble-row">
                    <div className="grammar-practice-next-grammar-bubble">
                      <div>{renderNextGrammarExampleContent(nextGrammarExamples[0])}</div>
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
                          <div>{renderNextGrammarExampleContent(example)}</div>
                          {visibleExampleTranslations[example.id] ? (
                            <div
                              className={`grammar-practice-next-grammar-translation grammar-practice-next-grammar-translation-${example.side}`}
                              dir={isTranslationRtl ? 'rtl' : 'ltr'}
                            >
                              {example.translation}
                            </div>
                          ) : null}
                        </div>
                        {example.translation.length > 0 ? (
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
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            ) : null}

            {/* EXPLANATION_ONLY 로 이동해 온 화면에서는 하단 BACK/NEXT 를 쓸 수 없다. */}
            <div className="grammar-practice-next-grammar-actions">
              <button
                type="button"
                className="grammar-practice-next-grammar-action-button grammar-practice-next-grammar-action-button-back"
                disabled={explanationOnly}
                onClick={handleBackPress}
              >
                BACK
              </button>
              <button
                type="button"
                className="grammar-practice-next-grammar-action-button"
                disabled={explanationOnly}
                onClick={() => {
                  pushHistory()
                  setActiveNextGrammarDialog(null)
                  resetPracticeFlow()
                  // 실제로 존재하는 첫 연습 단계로 넘어간다. MCQ 가 없으면 choice 화면은 건너뛴다.
                  setPracticeStep(firstPracticeStep ?? 'review')
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
                  listeningDialogueLines.map((model) => (
                    <p key={model.key} className="grammar-practice-listening-script-line">
                      <span className="grammar-practice-listening-script-speaker">{model.speaker}</span>{' '}
                      {renderAnnotatedLineText(model.source)}
                    </p>
                  ))
                ) : listeningTranscriptLines.length > 0 ? (
                  listeningTranscriptLines.map((line, index) => (
                    <p key={`${index}-${line}`} className="grammar-practice-listening-script-line">
                      {/* transcript 는 라인별 jsonPath 를 알 수 없어 원문 일치로만 unit 을 찾는다. */}
                      {renderAnnotatedLineText({
                        text: line,
                        materialId: listeningMaterial?.id ?? null,
                        jsonPath: null,
                      })}
                    </p>
                  ))
                ) : grammarPracticeDemo ? (
                  grammarPracticeDemo.listeningScript.map((line, index) => (
                    <p
                      key={`${index}-${line.text}`}
                      className={`grammar-practice-listening-script-line ${
                        line.indented ? 'grammar-practice-listening-script-line-indented' : ''
                      }`}
                    >
                      {line.speaker ? (
                        <>
                          <span className="grammar-practice-listening-script-speaker">{line.speaker}</span>{' '}
                        </>
                      ) : null}
                      {line.text}
                    </p>
                  ))
                ) : (
                  <p className="grammar-practice-status">
                    {sectionLoadError
                      ? sectionLoadError.message
                      : '아직 이 수업의 듣기 대본이 준비되지 않았어요.'}
                  </p>
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
              {!isInitialQuestionsLoading && listeningQuestions.length === 0 ? (
                <p className="grammar-practice-status">
                  {sectionLoadError
                    ? sectionLoadError.message
                    : '이 수업에는 듣기 문제가 없어요. 대본을 확인한 뒤 다음으로 넘어가세요.'}
                </p>
              ) : null}
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
                  isListeningComplete && !saveProgress.isPending && !explanationOnly
                    ? 'grammar-practice-listening-next-button-active'
                    : ''
                }`}
                disabled={!isListeningComplete || saveProgress.isPending || explanationOnly}
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
                readingDialogueLines.map((model) => (
                  <p key={model.key} className="grammar-practice-reading-line">
                    <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                      {model.speaker}
                    </span>{' '}
                    {renderAnnotatedLineText(model.source)}
                  </p>
                ))
              ) : isInitialMaterialsLoading ? (
                <p className="grammar-practice-status">Loading...</p>
              ) : grammarPracticeDemo ? (
                grammarPracticeDemo.readingScript.map((line, index) => (
                  <p
                    key={`${index}-${line.text}`}
                    className={`grammar-practice-reading-line ${
                      line.indented ? 'grammar-practice-reading-line-indented' : ''
                    }`}
                  >
                    {line.speaker ? (
                      <>
                        <span className={`grammar-practice-reading-name ${showVocab ? 'is-visible' : ''}`}>
                          {line.speaker}
                        </span>{' '}
                      </>
                    ) : null}
                    {line.text}
                  </p>
                ))
              ) : (
                <p className="grammar-practice-status">
                  {sectionLoadError
                    ? sectionLoadError.message
                    : '아직 이 수업의 지문이 준비되지 않았어요.'}
                </p>
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
                          question.type === 'blank' || question.type === 'free'
                            ? 'grammar-practice-reading-question-card-blank'
                            : ''
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
                        ) : grammarPracticeDemo ? (
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
                        ) : null}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
            {!isInitialQuestionsLoading && readingQuestions.length === 0 ? (
              <p className="grammar-practice-status">
                {sectionLoadError
                  ? sectionLoadError.message
                  : '이 수업에는 읽기 문제가 없어요. 지문을 확인한 뒤 다음으로 넘어가세요.'}
              </p>
            ) : null}
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
              className={`grammar-practice-reading-next-button ${isReadingComplete && !saveProgress.isPending && !explanationOnly ? 'grammar-practice-reading-next-button-active' : ''}`}
              disabled={!isReadingComplete || saveProgress.isPending || explanationOnly}
              onClick={() => void handleReadingComplete()}
            >
              {saveProgress.isPending ? 'SAVING...' : 'Next'}
            </button>
            {saveProgress.error ? (
              <p className="grammar-practice-review-error">{saveProgress.error.message}</p>
            ) : null}
          </section>
        ) : showPracticeEmptyState ? (
          // 연습 문제가 없거나 불러오지 못했을 때. 데모 문항으로 폴백하지 않는다.
          <section className="grammar-practice-empty-state" aria-live="polite">
            {isInitialSectionLoading ? (
              <p className="grammar-practice-status">Loading...</p>
            ) : (
              <>
                <p className="grammar-practice-empty-state-text">
                  {sectionLoadError
                    ? sectionLoadError.message
                    : '아직 이 수업의 연습 문제가 준비되지 않았어요.'}
                </p>
                <div className="grammar-practice-empty-state-actions">
                  {sectionLoadError ? (
                    <button
                      type="button"
                      className="grammar-practice-empty-state-button"
                      onClick={() => {
                        void refetchMaterials()
                        void refetchQuestions()
                      }}
                    >
                      다시 시도
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="grammar-practice-empty-state-button"
                    onClick={() => {
                      pushHistory()
                      setPracticeStep('review')
                    }}
                  >
                    수업 마치기
                  </button>
                </div>
              </>
            )}
          </section>
        ) : isCardsStep ? (
          // 카드 뒤집기 연습. SectionQuestion 에는 없고 자료 practices(kind: cards)에만 있는 형태라
          // 자료 데이터를 그대로 그린다.
          <section className="grammar-practice-cards-screen" aria-label="card practice">
            <div className="grammar-practice-cards-list" role="list">
              {currentStageItems.map((card) => {
                const isRevealed = revealedAnswers.includes(card.key)
                return (
                  <button
                    key={card.key}
                    type="button"
                    role="listitem"
                    className={`grammar-practice-card-item ${isRevealed ? 'is-revealed' : ''}`}
                    aria-pressed={isRevealed}
                    onClick={() =>
                      setRevealedAnswers((prev) =>
                        prev.includes(card.key)
                          ? prev.filter((key) => key !== card.key)
                          : [...prev, card.key],
                      )
                    }
                  >
                    <span className="grammar-practice-card-front">{card.prefix}</span>
                    {isRevealed && card.cardBack ? (
                      <span className="grammar-practice-card-back">{card.cardBack}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
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
                {isFillStep && fillPromptParts ? (
                  <div className="grammar-practice-fill-prompt-lines">
                    <p className="grammar-practice-question-text grammar-practice-fill-prompt-line">
                      {fillPromptParts.promptLine}
                    </p>
                    <div className="grammar-practice-question-row grammar-practice-fill-sentence-line">
                      <span className="grammar-practice-question-text">{fillPromptParts.beforeBlank}</span>
                      {answerColumn}
                      <span className="grammar-practice-question-text">{fillPromptParts.afterBlank}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grammar-practice-question-row">
                    <p className="grammar-practice-question-text">{activePractice?.prefix ?? ''}</p>
                    {answerColumn}
                    {activePractice !== null && activePractice.suffix ? (
                      <p className="grammar-practice-question-text">{activePractice.suffix}</p>
                    ) : activePractice !== null && activePractice.questionId !== null ? (
                      <span className="grammar-practice-question-dot">.</span>
                    ) : null}
                  </div>
                )}
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
                  {isInitialQuestionsLoading ? (
                    <p className="grammar-practice-status">Loading...</p>
                  ) : choiceOptions.length === 0 ? (
                    <p className="grammar-practice-status">보기가 준비되지 않은 문항이에요.</p>
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

        {!showPracticeChrome ? null : (
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
              if (!canMoveToNextPracticeStep || currentStage === null) return

              pushHistory()
              // 같은 단계에 남은 연습 문항이 있으면 다음 문항으로, 없으면 다음 단계로 넘어간다.
              // 카드 연습은 한 화면에 카드를 모두 펼치므로 바로 다음 단계로 넘어간다.
              if (hasNextPracticeItem && !isCardsStep) {
                setPracticeItemCursor(practiceItemIndex + 1)
                resetPracticeAnswers()
                return
              }
              goToNextPracticeStage()
            }}
          >
            Next
          </button>
        )}

        {/* MARK 팝업. annotation 팝업은 reading/listening 단계에서도 뜨도록 단계 밖에서 그린다. */}
        {activeNextGrammarDialog ? (
          <div
            className="grammar-practice-next-grammar-note-backdrop"
            role="presentation"
            onClick={() => setActiveNextGrammarDialog(null)}
          >
            <div
              className={`grammar-practice-next-grammar-note-dialog grammar-practice-next-grammar-note-dialog-${
                activeNextGrammarDialog.kind === 'annotation'
                  ? activeNextGrammarDialog.annotations[activeNextGrammarDialog.index]?.type ===
                    'VOCAB'
                    ? 'vocab'
                    : 'grammar'
                  : activeNextGrammarDialog.kind
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="next-grammar-note-title"
              onClick={(event) => event.stopPropagation()}
            >
              {activeNextGrammarDialog.kind === 'annotation'
                ? (() => {
                    const dialog = activeNextGrammarDialog
                    const annotation = dialog.annotations[dialog.index]
                    if (!annotation) return null

                    const explanationText = pickAnnotationExplanation(
                      annotation.concept?.explanation,
                      contentLanguage,
                    )
                    // annotation 타입과 맞는 목적지가 아니면 GO TO LESSON 자체를 숨긴다.
                    const target = resolveAnnotationTarget(annotation)
                    const canGoToLesson =
                      target !== null &&
                      Boolean(onOpenAnnotationTarget) &&
                      sectionId !== null &&
                      markMode !== null
                    const blockedMessage = canGoToLesson
                      ? annotationLessonBlockedMessage
                      : annotationNoLessonMessage(annotation.type)

                    return (
                      <>
                        {dialog.annotations.length > 1 ? (
                          // 같은 구간에 annotation 이 겹치면 제목 탭으로 골라 볼 수 있다.
                          <div
                            className="grammar-practice-annotation-note-tabs"
                            role="tablist"
                            aria-label="이 구간의 annotation 목록"
                          >
                            {dialog.annotations.map((candidate, index) => (
                              <button
                                key={candidate.id}
                                type="button"
                                role="tab"
                                aria-selected={index === dialog.index}
                                className={`grammar-practice-annotation-note-tab ${
                                  index === dialog.index ? 'is-selected' : ''
                                }`}
                                onClick={() => {
                                  // 다른 annotation 으로 바꾸면 이전 안내 문구는 지운다.
                                  setAnnotationLessonBlockedMessage(null)
                                  setActiveNextGrammarDialog({ ...dialog, index })
                                }}
                              >
                                {candidate.concept?.title || candidate.surface}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="grammar-practice-next-grammar-note-header">
                          <h3
                            id="next-grammar-note-title"
                            className="grammar-practice-next-grammar-note-title"
                          >
                            {annotation.concept?.title || annotation.surface}
                          </h3>
                          <span className="grammar-practice-next-grammar-note-plus" aria-hidden="true" />
                        </div>
                        <p
                          className={`grammar-practice-next-grammar-note-description ${
                            annotation.type === 'VOCAB'
                              ? 'grammar-practice-next-grammar-note-description-vocab'
                              : ''
                          }`}
                        >
                          {explanationText || annotation.surface}
                        </p>
                        {blockedMessage ? (
                          <p className="grammar-practice-annotation-note-empty" role="status">
                            {blockedMessage}
                          </p>
                        ) : (
                          <button
                            type="button"
                            className="grammar-practice-next-grammar-note-button"
                            disabled={isCheckingAnnotationTarget}
                            onClick={() => {
                              void handleGoToAnnotationLesson(dialog.unitId, annotation)
                            }}
                          >
                            {isCheckingAnnotationTarget ? 'LOADING...' : 'GO TO LESSON'}
                          </button>
                        )}
                      </>
                    )
                  })()
                : (() => {
                    // 데모 예문 전용 팝업. 운영 빌드에는 이 노트가 없어 팝업도 열리지 않는다.
                    const dialog = activeNextGrammarDialog
                    const note =
                      dialog.kind === 'grammar'
                        ? nextGrammarNotes?.[dialog.id] ?? null
                        : nextGrammarVocabNotes?.[dialog.id] ?? null
                    if (note === null) return null

                    return (
                      <>
                        <div className="grammar-practice-next-grammar-note-header">
                          <h3 id="next-grammar-note-title" className="grammar-practice-next-grammar-note-title">
                            {note.title}
                          </h3>
                          <span className="grammar-practice-next-grammar-note-plus" aria-hidden="true" />
                        </div>
                        <p
                          className={`grammar-practice-next-grammar-note-description ${
                            dialog.kind === 'vocab' ? 'grammar-practice-next-grammar-note-description-vocab' : ''
                          }`}
                        >
                          {note.description}
                        </p>
                        {dialog.kind === 'grammar' ? (
                          <button type="button" className="grammar-practice-next-grammar-note-button" onClick={handleGoToNextGrammarLesson}>
                            GO TO LESSON
                          </button>
                        ) : null}
                      </>
                    )
                  })()}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default GrammarPracticePage
