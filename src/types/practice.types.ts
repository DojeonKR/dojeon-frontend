// 서버 응답 기준:
// GET  /practice/topic                      -> data: PracticeTopic[]
// GET  /practice/topic/{topicId}/question   -> data: PracticeQuestion[]
// 두 응답 모두 data 가 배열이며, 식별자 필드는 topicId / questionId 다.

export interface PracticeTopic {
    topicId: number;
    titleEn: string;
    isActive: boolean;
}

export type PracticeTopicListData = PracticeTopic[];

export interface PracticeTopicListResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: PracticeTopicListData | null;
    timestamp: string;
}


export interface PracticeQuestion {
    questionId: number;
    type: string;
    questionText: string;
    options: string[];
    // 앱에서 바로 채점하라고 서버가 정답을 함께 내려준다.
    answer: string | null;
    explanation: string | null;
}

export type PracticeQuestionsData = PracticeQuestion[];

export interface PracticeQuestionsResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: PracticeQuestionsData | null;
    errorCode?: string;
    timestamp: string;
}

export interface CheckAnswerRequest {
    questionId: number;
    userAnswer: string;
}

export interface CheckAnswerData {
    correct: boolean;
    correctAnswer?: string;
    explanation?: string | null;
}

export interface CheckAnswerResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: CheckAnswerData | null;
    errorCode?: string;
    timestamp: string;
}
