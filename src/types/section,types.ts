// GET /section/{sectionId}/progress가 지금 비어 있다

export interface MaterialExplanation {
    lang: string;
    text: string;
}

export interface DialogueLine {
    speaker: string;
    ko: string;
    en?: string;
    he?: string;
}

export interface Dialogue {
    lines: DialogueLine[];
}

// contentText.practices: 문제 풀이용 연습 블록.
// kind 로 문항 형태가 갈리고(choose=보기 선택, fill=빈칸 입력, free=자유 작문,
// cards=카드 뒤집기), 한 블록은 같은 fixedQuestion("이것은 뭐예요?") 아래 여러
// items 를 묶어서 내려온다.
export type MaterialPracticeKind = 'choose' | 'fill' | 'free' | 'cards';

export interface MaterialPracticeItem {
    prompt?: string;
    answers?: string[];
    options?: string[];
    sample?: string;
    // cards 연습은 앞/뒷면 형태로 내려올 수 있어 둘 다 받는다.
    front?: string;
    back?: string;
    note?: string;
}

export interface MaterialPractice {
    kind: string;
    label?: string;
    fixedQuestion?: string;
    imagePlaceholder?: boolean;
    items?: MaterialPracticeItem[];
}

// GET /section/{id}/material -> data: { materials: [...] }
// material 식별자는 materialId 로 오고, contentText 는 자료 종류마다 채워지는 필드가 다르다.
// (문법표는 description + table, 지문/대본은 dialogues/dialogue/body 등)
export interface MaterialContentText {
    title: string;
    description?: string | null;
    table?: unknown;
    explanations?: MaterialExplanation[];
    imageUrl?: string;
    dialogues?: Dialogue[];
    dialogue?: DialogueLine[];
    body?: string | null;
    audioUrl?: string | null;
    transcript?: string | null;
    practices?: MaterialPractice[];
}

export interface SectionMaterial {
    id: number;
    type: string;
    sequence: number;
    isExtra: boolean;
    contentText: MaterialContentText;
}

export interface SectionMaterialData {
    sectionId?: number;
    courseId?: number;
    lessonId?: number;
    materials: SectionMaterial[];
}

export interface SectionMaterialResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: SectionMaterialData | null;
    errorCode?: string;
    timestamp: string;
}

export type CardLocales = Record<string, { back?: string; notes?: string }> | null;

// GET /section/{id}/card -> data: [{ cardId, wordFront, wordBack, audioUrl }]
// notes/locales/isScraped/scrapId 는 응답에 없을 수 있어 모두 옵션으로 둔다.
export interface SectionCard {
    id: number;
    wordFront: string;
    wordBack: string;
    notes?: string;
    locales?: CardLocales;
    audioUrl: string | null;
    sequence: number;
    isScraped: boolean;
    scrapId: string | null;
}

export interface SectionCardData {
    sectionId: number;
    cards: SectionCard[];
}

export interface SectionCardResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: SectionCardData | null;
    timestamp: string;
}


export interface SectionQuestion {
    id: number;
    type: string;
    questionText: string;
    options: string[];
    blankCount: number;
    // 서버가 정답을 함께 내려주면 채점 API 없이 앱에서 바로 채점한다.
    answer: string | null;
    explanation: string | null;
}

export interface SectionQuestionData {
    sectionId: number;
    questions: SectionQuestion[];
}

export interface SectionQuestionResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: SectionQuestionData | null;
    timestamp: string;
}

export type SectionCheckAnswerRequest =
    | { questionId: number; userAnswer: string }
    | { questionId: number; userAnswers: string[] };

export interface SectionCheckAnswerData {
    correct: boolean;
    correctAnswer?: string;
    correctAnswers?: string[];
    explanation?: string | null;
}

export interface SectionCheckAnswerResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: SectionCheckAnswerData | null;
    errorCode?: string;
    timestamp: string;
}


// POST /section/{id}/progress
// currentPage / isCompleted / stayTimeSeconds 는 필수, difficulty 는 완료 평가 시에만 보낸다.
export interface SaveProgressRequest {
    currentPage: number;
    isCompleted: boolean;
    stayTimeSeconds: number;
    difficulty?: 'EASY' | 'NORMAL' | 'HARD';
}

export interface NextSection {
    courseId: number;
    lessonId: number;
    sectionId: number;
    type: string;
    title: string;
}

// 코스의 마지막 섹션이면 nextSection 이 null 로 온다.
export interface SaveProgressData {
    nextSection: NextSection | null;
}

export interface SaveProgressResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: SaveProgressData | null;
    errorCode?: string;
    timestamp: string;
}
