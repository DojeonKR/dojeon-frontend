export const lessonStageOrder = ['Vocabulary', 'Grammar', 'Reading', 'Listening'] as const

export type LessonStage = (typeof lessonStageOrder)[number]
export type LessonPathId = 'vocab' | 'grammar' | 'reading' | 'listening'

export interface LessonItem {
  id: string
  label: string
  stage: LessonStage
  title: string
  progress: number
}

export interface CourseItem {
  id: string
  label: string
  lessons: LessonItem[]
}

export const currentCourseId = 'course1'
export const currentLessonId = 'lesson5'

const buildLessons = (
  activeLessonNumber: number | null,
  activeLessonProgress = 0,
  activeLessonStage: LessonStage = 'Vocabulary',
): LessonItem[] =>
  Array.from({ length: 5 }, (_, index) => {
    const lessonNumber = index + 1
    const progress =
      activeLessonNumber === null
        ? 0
        : lessonNumber < activeLessonNumber
          ? 100
          : lessonNumber === activeLessonNumber
            ? activeLessonProgress
            : 0
    const stage =
      activeLessonNumber === null
        ? lessonStageOrder[0]
        : lessonNumber < activeLessonNumber
          ? lessonStageOrder[lessonStageOrder.length - 1]
          : lessonNumber === activeLessonNumber
            ? activeLessonStage
            : lessonStageOrder[0]

    return {
      id: `lesson${lessonNumber}`,
      label: `lesson ${lessonNumber}`,
      stage,
      title: `${stage} ${lessonNumber}`,
      progress,
    }
  })

export const courseItems: CourseItem[] = [
  { id: currentCourseId, label: 'Course 1', lessons: buildLessons(5, 45, 'Vocabulary') },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `course${index + 2}`,
    label: `Course ${index + 2}`,
    lessons: buildLessons(null),
  })),
]

export const getLessonPathId = (stage: LessonStage): LessonPathId => {
  if (stage === 'Vocabulary') {
    return 'vocab'
  }

  if (stage === 'Grammar') {
    return 'grammar'
  }

  if (stage === 'Reading') {
    return 'reading'
  }

  return 'listening'
}

export const findCourseById = (courseId: string) =>
  courseItems.find((course) => course.id === courseId)

export const findLessonById = (course: CourseItem, lessonId: string) =>
  course.lessons.find((lesson) => lesson.id === lessonId)
