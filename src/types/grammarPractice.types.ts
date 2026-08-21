import type { MaterialPracticeKind } from './section,types.ts'

// 문법 연습 화면이 그릴 수 있는 모든 화면.
export type PracticeStep =
    | 'choice'
    | 'fill-intro'
    | 'fill'
    | 'cards'
    | 'make-intro'
    | 'make'
    | 'review'
    | 'reading'
    | 'listening'
    | 'next-grammar'
    | 'next-grammar-rules'

// 문법 연습 화면에서 실제로 존재하는 콘텐츠만으로 흐름을 구성하기 위한 단계 식별자.
// choice = 보기 선택, fill = 빈칸 채우기, cards = 카드 뒤집기, make = 자유 작문.
export type PracticeStageId = 'choice' | 'fill' | 'cards' | 'make'

// contentText.practices 의 kind -> 화면 단계 매핑.
export const PRACTICE_STAGE_BY_KIND: Record<MaterialPracticeKind, PracticeStageId> = {
    choose: 'choice',
    fill: 'fill',
    cards: 'cards',
    free: 'make',
}

// 자료 practices 블록이 없을 때 문항 API 로만 만들어지는 단계의 기본 순서.
export const PRACTICE_STAGE_ORDER: PracticeStageId[] = ['choice', 'fill', 'cards', 'make']

// 화면 라인 하나를 annotation unit 과 이어 주는 위치 정보.
// jsonPath 가 null 이면(transcript 분해 라인) 원문 일치로만 폴백 매칭한다.
export interface AnnotatedLineSource {
    text: string
    materialId: number | null
    jsonPath: string | null
}

// 데모 예문에만 쓰이는 마크 id. 운영 데이터는 annotation API 로 마크를 붙인다.
export type NextGrammarNoteId = 'future-proposal' | 'polite-ending'
export type NextGrammarVocabId = 'yes' | 'together' | 'lunch' | 'eat'

export interface NextGrammarExampleToken {
    text: string
    grammarId?: NextGrammarNoteId
    vocabId?: NextGrammarVocabId
    emphasis?: 'medium' | 'semibold'
}

export interface NextGrammarExampleMessage {
    id: string
    side: 'left' | 'right'
    translation: string
    tokens: NextGrammarExampleToken[]
    // 서버 예문은 annotation unit 매칭 정보를 함께 들고 AnnotatedText 로 그린다.
    annotated?: AnnotatedLineSource
}

// type: choice = 보기 선택, blank = 빈칸 채우기, free = 자유 작문(FREE 문항).
// free 는 정답이 하나로 정해지지 않아 answer 를 예시 문장(sample)으로만 쓰고 정/오답을 매기지 않는다.
export interface PracticeQuestionModel {
    questionId: number
    title: string
    prompt: string
    type: 'choice' | 'blank' | 'free'
    options: string[]
    answer: string | null
}

// 한 연습 문항을 화면 모델로 바꾼 것. 자료(contentText.practices)와 문항 API(SectionQuestion)
// 양쪽에서 같은 모양으로 만들어 단계 안에서 순서대로 푼다.
// prompt("1. 그것은 ____예요.")는 빈칸 기준으로 prefix/suffix 로 쪼개서 기존 카드 레이아웃
// (문장 - 답 칸 - 문장)에 그대로 끼워 넣는다.
export interface PracticeItemModel {
    key: string
    stage: PracticeStageId
    kind: MaterialPracticeKind
    // 문항 API 에서 온 문항만 채점 API 를 쓸 수 있다. 자료 연습 문항은 null.
    questionId: number | null
    fixedQuestion: string
    hasImagePlaceholder: boolean
    prefix: string
    suffix: string
    options: string[]
    answers: string[]
    // free 연습은 정답이 아니라 모범 답안(sample)만 오므로 정/오답을 매기지 않는다.
    isSampleAnswer: boolean
    // cards 연습의 뒷면(뜻/설명).
    cardBack: string
}

// 서버 문법표는 { headers, rows: [{ condition, form, examples[] }] } 형태로 온다.
export interface GrammarTableModel {
    headers: string[]
    rows: string[][]
}

// 데모 지문/대본 한 줄.
export interface DemoScriptLine {
    speaker?: string
    text: string
    indented?: boolean
}
