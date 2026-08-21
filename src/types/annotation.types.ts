// GET /section/{sectionId}/annotations — MARK VOCAB / MARK GRAMMAR 용 annotation 응답.
// unit/annotation/concept 의 id 는 DB BigInt 라서 number 로 바꾸지 않고 문자열 그대로 유지한다.

export type AnnotationType = 'VOCAB' | 'GRAMMAR'

// MARK 선택 상태. 두 boolean 이 아니라 단일 값으로만 관리한다.
// (VOCAB 과 GRAMMAR 가 동시에 켜지는 상태는 존재하지 않는다.)
export type MarkMode = AnnotationType | null

export interface AnnotationTarget {
    // EXPLANATION_ONLY 면 이동한 수업에서 하단 BACK/NEXT 를 쓸 수 없다.
    mode: string
    courseId: number | null
    lessonId: number | null
    sectionId: number | null
    sectionType: string
    cardId: number | null
    materialId: number | null
    pageNumber: number | null
}

export interface AnnotationConcept {
    id: string
    title: string
    // 팝업 내용. 서버 스키마가 확정되지 않아 문자열/언어별 객체를 모두 받는다.
    explanation: unknown
    // GO TO LESSON 목적지. 없으면 팝업만 띄운다.
    target: AnnotationTarget | null
}

export interface SectionAnnotation {
    id: string
    type: AnnotationType
    // JavaScript 문자열과 동일한 UTF-16 기준 [start, end) 범위.
    startOffset: number
    endOffset: number
    surface: string
    posTags: string[]
    confidence: number | null
    concept: AnnotationConcept | null
}

export interface AnnotationUnit {
    id: string
    materialId: number
    // SectionMaterial.contentText 안에서 원문이 있는 위치. (예: $.dialogues[0].lines[1].ko)
    jsonPath: string
    text: string
    // 프론트 캐시 무효화용 버전 값으로만 쓴다.
    textHash: string
    analysisStatus: string
    annotations: SectionAnnotation[]
}

export interface SectionAnnotationsData {
    sectionId: number
    courseId: number | null
    lessonId: number | null
    offsetEncoding: string
    units: AnnotationUnit[]
}
