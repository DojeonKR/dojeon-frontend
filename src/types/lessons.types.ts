export interface SiblingLesson {
    lessonId: number;
    title: string;
    orderNum: number;
}

export interface LessonSection {
    sectionId: number;
    type: string;
    title: string;
    totalPages: number;
    orderNum: number;
    currentPage: number;
    progressPercent: number;
    isCompleted: boolean;
    hasContent: boolean;
}

export type LessonSectionType = 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING';

export interface LessonSectionsData {
    courseId: number;
    lessonId: number;
    title: string;
    subtitle: string | null;
    siblingLessons: SiblingLesson[];
    overallProgressPercent: number;
    selectedTypes: LessonSectionType[];
    sections: LessonSection[];
}

export interface UpdateLessonPreferencesData {
    lessonId: number;
    selectedTypes: LessonSectionType[];
}

export interface LessonSectionsResponse {
    isSuccess: boolean;
    code: string;
    message: string;
    data: LessonSectionsData | null;
    errorCode?: string;
    timestamp: string;
}
