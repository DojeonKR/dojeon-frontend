import {
  PRACTICE_STAGE_BY_KIND,
  PRACTICE_STAGE_ORDER,
} from '../types/grammarPractice.types.ts'
import type {
  GrammarTableModel,
  PracticeItemModel,
  PracticeQuestionModel,
  PracticeStageId,
  PracticeStep,
} from '../types/grammarPractice.types.ts'
import type {
  MaterialPracticeKind,
  SectionMaterial,
  SectionQuestion,
} from '../types/section,types.ts'

// GrammarPracticePage 가 서버 자료/문항을 화면 모델로 바꿀 때 쓰는 순수 함수 모음.
// 화면(JSX)과 떼어 놓아 데이터 형태가 바뀌면 이 파일만 보고 고칠 수 있게 한다.

export function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => typeof entry === 'string' || typeof entry === 'number')
    .map((entry) => String(entry))
}

// 문항 앞 번호("1. ", "2) ")만 걷어낸다. 번호 표기가 문항마다 달라 정규식으로 느슨하게 본다.
export function stripPromptNumber(prompt: string): string {
  return (prompt ?? '').replace(/^\s*\d+\s*[.)]\s*/, '')
}

// "1. 그것은 ____예요." -> { prefix: '그것은', suffix: '예요.' }
// 빈칸 표기(밑줄 개수)도 문항마다 달라서 정규식으로 느슨하게 걷어낸다.
export function splitPracticePrompt(prompt: string): { prefix: string; suffix: string } {
  const withoutNumber = stripPromptNumber(prompt)
  const blank = withoutNumber.match(/_{2,}/)
  if (!blank || blank.index === undefined) {
    return { prefix: withoutNumber.trim(), suffix: '' }
  }
  return {
    prefix: withoutNumber.slice(0, blank.index).trim(),
    suffix: withoutNumber.slice(blank.index + blank[0].length).trim(),
  }
}

export function splitPracticePromptParts(prompt: string): string[] {
  // 빈칸 직전 개행은 질문과 빈칸 문장을 분리하는 레이아웃 정보이므로 보존.
  return stripPromptNumber(prompt)
    .split(/_{2,}/)
    .map((part) => part.replace(/^[\t ]+|[\t ]+$/g, ''))
}

export const MATERIAL_PRACTICE_KINDS: MaterialPracticeKind[] = ['choose', 'fill', 'free', 'cards']

// 단계 -> 자료 kind. 문항 API 로만 만들어진 연습 문항에도 같은 kind 를 붙여 화면 분기를 통일한다.
export const STAGE_PRACTICE_KIND: Record<PracticeStageId, MaterialPracticeKind> = {
  choice: 'choose',
  fill: 'fill',
  cards: 'cards',
  make: 'free',
}

export function toPracticeKind(value: string | undefined | null): MaterialPracticeKind | null {
  const normalized = (value ?? '').trim().toLowerCase()
  return (MATERIAL_PRACTICE_KINDS as string[]).includes(normalized)
    ? (normalized as MaterialPracticeKind)
    : null
}

export function toTrimmedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// 자료에 실린 연습 문항을 단계별로 펼친다. 블록(fixedQuestion + items) 순서를 그대로 유지해
// choose 는 보기 선택, fill 은 빈칸, cards 는 카드 뒤집기, free 는 문장 만들기 단계로 이어 붙인다.
export function toMaterialPracticeItems(
  materials: SectionMaterial[],
  stage: PracticeStageId,
): PracticeItemModel[] {
  const items: PracticeItemModel[] = []

  materials.forEach((material) => {
    ;(material.contentText?.practices ?? []).forEach((practice, blockIndex) => {
      const kind = toPracticeKind(practice?.kind)
      if (kind === null || PRACTICE_STAGE_BY_KIND[kind] !== stage) return

      ;(practice.items ?? []).forEach((item, itemIndex) => {
        const answers = toStringList(item?.answers)
        const sample = toTrimmedText(item?.sample)
        const front = toTrimmedText(item?.front) || toTrimmedText(item?.prompt)
        const back = toTrimmedText(item?.back) || toTrimmedText(item?.note) || sample
        const prompt = toTrimmedText(item?.prompt) || front
        const { prefix, suffix } = splitPracticePrompt(prompt)
        const blankParts = splitPracticePromptParts(prompt)
        const promptQuestion = prompt.split(/\r?\n/, 1)[0]?.trim() ?? ''
        const fixedQuestion =
          toTrimmedText(practice.fixedQuestion) ||
          (kind === 'free' && promptQuestion.startsWith('질문:')
            ? stripPromptNumber(promptQuestion)
            : '')

        items.push({
          key: `material-${material.id}-${kind}-${blockIndex}-${itemIndex}`,
          stage,
          kind,
          // 자료 연습 문항은 정답이 함께 실려 있어 채점 API 를 쓰지 않는다.
          questionId: null,
          fixedQuestion,
          hasImagePlaceholder: practice.imagePlaceholder === true,
          prefix: stage === 'cards' ? front : prefix,
          suffix: stage === 'cards' ? '' : suffix,
          blankParts,
          blankCount: kind === 'fill' ? Math.max(1, blankParts.length - 1) : 1,
          options: toStringList(item?.options),
          // 자유 작문(free)은 answers 없이 sample(모범 답안)만 온다.
          answers: answers.length > 0 ? answers : sample.length > 0 ? [sample] : [],
          isSampleAnswer: answers.length === 0 && sample.length > 0,
          cardBack: back,
        })
      })
    })
  })

  return items
}

// 자유 작문(FREE) 문항인지. 빈칸이 아니라 문장 전체를 직접 쓰는 문항이라
// 정답이 하나로 정해지지 않고 answer 는 예시 문장(sample)으로만 온다.
export function isFreeQuestion(question: SectionQuestion): boolean {
  return matchesQuestionType(question, ['FREE'])
}

// 문항 API 문항이 어떤 단계에 속하는지 정한다.
// 서버 type 문자열이 섹션마다 달라서 키워드로 느슨하게 본다.
export function toQuestionStage(question: SectionQuestion): PracticeStageId {
  // FREE 는 자유 작문 단계로 고정한다. 보기가 딸려 와도(예시 단어 목록) 객관식으로 보지 않는다.
  if (isFreeQuestion(question)) return 'make'
  if ((question.options?.length ?? 0) > 0) return 'choice'
  if (matchesQuestionType(question, ['MCQ', 'CHOICE'])) return 'choice'
  if (matchesQuestionType(question, ['SENTENCE', 'MAKE', 'WRITE', 'COMPOSE'])) return 'make'
  // BLANK/FILL/SHORT/WORD 를 포함해 타입을 알 수 없는 주관식은 빈칸 단계로 본다.
  // FREE 는 위에서 이미 걸러지므로 이 폴백으로 내려오지 않는다.
  return 'fill'
}

export function toQuestionPracticeItems(
  questions: SectionQuestion[],
  stage: PracticeStageId,
): PracticeItemModel[] {
  return questions
    .filter((question) => toQuestionStage(question) === stage)
    .map((question) => {
      const questionText = toTrimmedText(question.questionText)
      const isFree = isFreeQuestion(question)
      // FREE 는 문장 전체를 쓰는 문항이라 빈칸으로 쪼개지 않고 제시문을 그대로 보여 준다.
      const { prefix, suffix } = isFree
        ? { prefix: stripPromptNumber(questionText).trim(), suffix: '' }
        : splitPracticePrompt(questionText)
      const answer = toTrimmedText(question.answer)
      const parsedBlankParts = splitPracticePromptParts(questionText)
      const blankCount = stage === 'fill' ? Math.max(1, question.blankCount) : 1
      const blankParts =
        parsedBlankParts.length === blankCount + 1
          ? parsedBlankParts
          : [prefix, ...Array(Math.max(0, blankCount - 1)).fill(''), suffix]

      return {
        key: `question-${question.id}`,
        stage,
        kind: STAGE_PRACTICE_KIND[stage],
        questionId: question.id,
        fixedQuestion: '',
        hasImagePlaceholder: false,
        prefix,
        suffix,
        blankParts,
        blankCount,
        // FREE 는 보기 선택 문항이 아니라서 보기가 딸려 와도 그리지 않는다.
        options: isFree ? [] : question.options ?? [],
        answers: answer.length > 0 ? [answer] : [],
        // FREE 의 answer 는 유일한 정답이 아니라 예시 문장이므로 채점 기준으로 쓰지 않는다.
        isSampleAnswer: isFree,
        cardBack: '',
      }
    })
}

// 같은 문항이 자료와 문항 API 양쪽에 실려 있을 수 있어 문장/보기 기준으로 합친다.
// 자료 문항을 먼저 두고, 같은 문장을 가리키는 문항 API 문항은 자료 문항에 흡수시켜
// 문항 id(채점 API)와 정답을 채운다. 짝이 없는 문항 API 문항은 뒤에 그대로 이어 붙인다.
//
// 같은 출처 안에서는 절대 합치지 않는다. 문항 번호("1. ", "2. ")를 걷어내고 비교하기 때문에
// 서버가 정말 비슷한 문항을 여러 개 내려줘도 하나로 뭉개지면 안 된다.
export function mergePracticeItems(
  materialItems: PracticeItemModel[],
  questionItems: PracticeItemModel[],
): PracticeItemModel[] {
  const signatureOf = (item: PracticeItemModel) =>
    [
      normalizeAnswerText(item.prefix),
      normalizeAnswerText(item.suffix),
      item.options.map(normalizeAnswerText).join('|'),
    ].join('␟')

  const merged = [...materialItems]
  // 자료 문항 하나는 문항 API 문항 하나만 흡수한다(먼저 오는 것부터 짝을 짓는다).
  const unmatchedMaterialIndexes = new Map<string, number[]>()
  materialItems.forEach((item, index) => {
    const signature = signatureOf(item)
    const bucket = unmatchedMaterialIndexes.get(signature)
    if (bucket) bucket.push(index)
    else unmatchedMaterialIndexes.set(signature, [index])
  })

  questionItems.forEach((item) => {
    const bucket = unmatchedMaterialIndexes.get(signatureOf(item))
    const targetIndex = bucket?.shift()
    if (targetIndex === undefined) {
      merged.push(item)
      return
    }

    const existing = merged[targetIndex]
    merged[targetIndex] = {
      ...existing,
      // 자료에 정답이 실려 있으면 그걸 그대로 쓰고, 없을 때만 문항 API 정답/채점 API 로 넘긴다.
      questionId: existing.questionId ?? item.questionId,
      answers: existing.answers.length > 0 ? existing.answers : item.answers,
      isSampleAnswer: existing.answers.length > 0 ? existing.isSampleAnswer : item.isSampleAnswer,
    }
  })

  return merged
}

// 이 섹션에 실제로 존재하는 연습 단계만 순서대로 돌려준다.
// 자료 practices 블록 순서를 그대로 흐름 순서로 쓰고, 자료에 없는 단계는
// 문항 API 에 문항이 실제로 있을 때만 뒤에 덧붙인다.
export function toPracticeStages(
  materials: SectionMaterial[],
  questions: SectionQuestion[],
): PracticeStageId[] {
  const stages: PracticeStageId[] = []
  const add = (stage: PracticeStageId) => {
    if (!stages.includes(stage)) stages.push(stage)
  }

  materials.forEach((material) => {
    ;(material.contentText?.practices ?? []).forEach((practice) => {
      const kind = toPracticeKind(practice?.kind)
      if (kind === null || (practice.items?.length ?? 0) === 0) return
      add(PRACTICE_STAGE_BY_KIND[kind])
    })
  })

  PRACTICE_STAGE_ORDER.forEach((stage) => {
    if (questions.some((question) => toQuestionStage(question) === stage)) add(stage)
  })

  return stages
}

export function normalizeAnswerText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// 예시 답안(sample)만 있는 문항. 정답이 하나로 정해지지 않아 Exact match 로 채점하면 안 된다.
export function isSampleAnswerItem(item: PracticeItemModel): boolean {
  return item.isSampleAnswer
}

export function matchesPracticeAnswer(item: PracticeItemModel, answer: string): boolean {
  // sample 은 정답 목록이 아니라 예시 문장이라 일치 여부를 따지지 않는다.
  if (isSampleAnswerItem(item)) return false
  const normalized = normalizeAnswerText(answer)
  return item.answers.some((candidate) => normalizeAnswerText(candidate) === normalized)
}

export function matchesPracticeAnswers(item: PracticeItemModel, answers: string[]): boolean {
  if (isSampleAnswerItem(item)) return false

  // 단일 빈칸의 answers는 허용 가능한 복수 정답 목록이다.
  if (item.blankCount <= 1) {
    return answers.length === 1 && matchesPracticeAnswer(item, answers[0])
  }

  // 복수 빈칸의 answers는 화면 빈칸과 같은 순서의 정답 배열이다.
  return (
    answers.length === item.blankCount &&
    item.answers.length === item.blankCount &&
    answers.every(
      (answer, index) => normalizeAnswerText(answer) === normalizeAnswerText(item.answers[index]),
    )
  )
}

// 행 객체의 키 순서. 서버 표는 headers 순서대로 condition -> form -> examples 를 채워 내려준다.
// (예: headers ["받침","형태","예시"] / row { condition: "받침 O", form: "N이에요", examples: [...] })
export const TABLE_ROW_KEYS = ['condition', 'form', 'examples']

export function toTableCellText(value: unknown): string {
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

export function toTableRowCells(row: unknown): string[] {
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
export function toGrammarTable(table: unknown): GrammarTableModel | null {
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

export function toTextLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function matchesQuestionType(question: SectionQuestion, keywords: string[]): boolean {
  const type = (question.type ?? '').toUpperCase()
  return keywords.some((keyword) => type.includes(keyword))
}

// 문장 만들기 단계에 보여줄 제시어. 서버가 "준호 / 커피 / 마시다" 처럼 구분자로 내려주면 쪼개고,
// 아니면 문항 텍스트를 그대로 한 덩어리로 보여준다.
export function toSentenceTokens(questionText: string | undefined): string[] {
  const tokens = (questionText ?? '')
    .split(/[/,·|]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)

  return tokens.length > 0 ? tokens : []
}

export function toPracticeQuestions(questions: SectionQuestion[]): PracticeQuestionModel[] {
  return questions.map((question, index) => {
    // FREE 를 먼저 본다. 보기가 없다고 해서 전부 빈칸(blank)으로 보면 자유 작문이 빈칸으로 오인된다.
    const isFree = isFreeQuestion(question)
    return {
      questionId: question.id,
      title: `Question ${index + 1}`,
      prompt: question.questionText,
      type: isFree ? 'free' : (question.options?.length ?? 0) > 0 ? 'choice' : 'blank',
      options: isFree ? [] : question.options ?? [],
      answer: question.answer,
      blankCount: question.blankCount,
    }
  })
}

export const grammarPageByStep: Partial<Record<PracticeStep, number>> = {
  choice: 0,
  'fill-intro': 1,
  fill: 2,
  'make-intro': 3,
  make: 4,
  review: 5,
  'next-grammar': 6,
  cards: 7,
}

export const PRACTICE_STEP_BY_STAGE: Record<PracticeStageId, PracticeStep> = {
  choice: 'choice',
  fill: 'fill',
  cards: 'cards',
  make: 'make',
}

// 시작 화면("Well done! Now let's try something harder")은 앞 단계를 끝냈을 때만 의미가 있어서
// 해당 단계가 흐름의 첫 단계면 건너뛴다.
export const PRACTICE_INTRO_STEP_BY_STAGE: Partial<Record<PracticeStageId, PracticeStep>> = {
  fill: 'fill-intro',
  make: 'make-intro',
}

export const PRACTICE_STAGE_BY_STEP: Partial<Record<PracticeStep, PracticeStageId>> = {
  choice: 'choice',
  'fill-intro': 'fill',
  fill: 'fill',
  cards: 'cards',
  'make-intro': 'make',
  make: 'make',
}

// 서버 연습 데이터가 하나도 없을 때 개발 서버에서만 쓰는 시안 흐름.
export const DEMO_PRACTICE_STAGES: PracticeStageId[] = ['choice', 'fill', 'make']

export function toStageEntryStep(stage: PracticeStageId, isFirstStage: boolean): PracticeStep {
  if (isFirstStage) return PRACTICE_STEP_BY_STAGE[stage]
  return PRACTICE_INTRO_STEP_BY_STAGE[stage] ?? PRACTICE_STEP_BY_STAGE[stage]
}

// 실제로 존재하지 않는 단계에 머무르지 않도록 그릴 단계를 정한다.
// MCQ 가 없는 섹션에서 'choice' 로 들어왔으면 첫 연습 단계(FILL/카드/자유 연습)로 바꾸고,
// 흐름의 첫 단계에서는 "Well done!" 시작 화면을 건너뛴다.
export function resolvePracticeStep(
  step: PracticeStep,
  stages: PracticeStageId[],
  isLoading: boolean,
): PracticeStep {
  const stage = PRACTICE_STAGE_BY_STEP[step]
  if (stage === undefined || isLoading) return step

  const stageIndex = stages.indexOf(stage)
  // 단계가 아예 없으면 그대로 두고 빈 상태 안내를 그린다.
  if (stageIndex < 0) return stages.length > 0 ? toStageEntryStep(stages[0], true) : step
  return stageIndex === 0 ? PRACTICE_STEP_BY_STAGE[stage] : step
}
