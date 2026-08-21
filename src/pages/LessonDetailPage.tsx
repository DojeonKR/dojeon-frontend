import { useEffect, useState } from 'react'
import './LessonDetailPage.css'
import { useLessonSections } from '../hooks/useLessonSections.ts'
import { useSaveSectionProgress } from '../hooks/useSaveSectionProgress.ts'
import { useUpdateLessonPreferences } from '../hooks/useUpdateLessonPreferences.ts'
import type {
  LessonSectionsData,
  LessonSectionType,
} from '../types/lessons.types.ts'

type LessonPathId = 'vocab' | 'grammar' | 'reading' | 'listening'

const lessonPathOptions: {
  id: LessonPathId
  label: string
  sectionType: LessonSectionType
}[] = [
  { id: 'vocab', label: 'Vocab', sectionType: 'VOCAB' },
  { id: 'grammar', label: 'Grammar', sectionType: 'GRAMMAR' },
  { id: 'reading', label: 'Reading', sectionType: 'READING' },
  { id: 'listening', label: 'Listening', sectionType: 'LISTENING' },
]

const minimumModuleFillPercent = 6
const lessonProgressDotSize = 6
const lessonProgressDotOverrun = 10
const lessonProgressDotCount = 4

const previewLessonTitles = ['Vocabulary', 'Grammar 1', 'Grammar 2', 'Grammar 3', 'Reading', 'Listening 1']

function getPreviewLessonOrder(lessonId: number | null): number {
  if (lessonId === null || lessonId >= 0) return 5
  return Math.abs(lessonId) % 100 || 5
}

function getPreviewCourseOrder(lessonId: number | null): number {
  if (lessonId === null || lessonId >= 0) return 1
  return Math.max(1, Math.floor(Math.abs(lessonId) / 100))
}

function createPreviewLessonSectionsData(lessonId: number | null): LessonSectionsData {
  const lessonOrder = getPreviewLessonOrder(lessonId)
  const courseOrder = getPreviewCourseOrder(lessonId)
  const normalizedLessonId = lessonId ?? -(courseOrder * 100 + lessonOrder)

  return {
    courseId: -courseOrder,
    lessonId: normalizedLessonId,
    title: `lesson ${lessonOrder}`,
    subtitle: null,
    siblingLessons: Array.from({ length: 5 }, (_, index) => ({
      lessonId: -(courseOrder * 100 + index + 1),
      title: `lesson ${index + 1}`,
      orderNum: index + 1,
    })),
    overallProgressPercent: 25,
    selectedTypes: ['VOCAB', 'GRAMMAR', 'READING', 'LISTENING'],
    sections: previewLessonTitles.map((title, index) => ({
      sectionId: -(courseOrder * 1000 + lessonOrder * 10 + index + 1),
      type:
        index === 0
          ? 'VOCAB'
          : index <= 3
            ? 'GRAMMAR'
            : index === 4
              ? 'READING'
              : 'LISTENING',
      title,
      totalPages: 4,
      orderNum: index + 1,
      currentPage: index === 0 ? 1 : 0,
      progressPercent: index === 0 ? 25 : 0,
      isCompleted: false,
      hasContent: true,
    })),
  }
}

function getLessonProgressDotPosition(index: number, dotCount: number): string {
  return `calc((((100% - ${dotCount * lessonProgressDotSize}px) / ${
    dotCount + 1
  }) * ${index + 1}) + ${lessonProgressDotSize * index + lessonProgressDotSize / 2}px)`
}

function getLessonProgressFillWidth(overallProgress: number, dotCount: number): string {
  if (dotCount <= 0 || overallProgress <= 0) return '0%'
  if (overallProgress >= 100) return '100%'

  const currentDotIndex = getLessonProgressActiveDotIndex(overallProgress, dotCount)
  return `calc(${getLessonProgressDotPosition(currentDotIndex, dotCount)} + ${lessonProgressDotOverrun}px)`
}

function getLessonProgressActiveDotIndex(overallProgress: number, dotCount: number): number {
  if (dotCount <= 0 || overallProgress <= 0) return -1
  if (overallProgress >= 100) return dotCount - 1

  return Math.min(
    Math.max(Math.ceil((overallProgress / 100) * (dotCount - 1)), 0),
    dotCount - 1,
  )
}

function getSectionPathId(sectionType: string): LessonPathId | null {
  const normalizedType = sectionType.toUpperCase()
  if (normalizedType.includes('VOCAB')) return 'vocab'
  if (normalizedType.includes('GRAMMAR')) return 'grammar'
  if (normalizedType.includes('READING')) return 'reading'
  if (normalizedType.includes('LISTENING')) return 'listening'
  return null
}

interface LessonDetailPageProps {
  lessonId: number | null
  initialSelectedModuleOrder?: number
  onSelectLesson: (lessonId: number) => void
  onStartLesson: (sectionId: number, sectionType: string) => void
  onBack: () => void
}

function LessonDetailPage({
  lessonId,
  initialSelectedModuleOrder,
  onSelectLesson,
  onStartLesson,
  onBack,
}: LessonDetailPageProps) {
  const isPreviewLesson = lessonId !== null && lessonId < 0
  const { data, loading, error } = useLessonSections(isPreviewLesson ? null : lessonId)
  const saveProgress = useSaveSectionProgress()
  const updatePreferences = useUpdateLessonPreferences()
  const savePreferences = updatePreferences.mutate

  const [isLessonPickerOpen, setIsLessonPickerOpen] = useState(false)
  const [selectedPathIds, setSelectedPathIds] = useState<Set<LessonPathId> | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [completedSectionIds, setCompletedSectionIds] = useState<Set<number>>(() => new Set())
  const serverSelectedTypes = new Set(
    data?.selectedTypes ?? lessonPathOptions.map((option) => option.sectionType),
  )
  const effectiveSelectedPathIds =
    selectedPathIds ??
    new Set(
      lessonPathOptions
        .filter((option) => serverSelectedTypes.has(option.sectionType))
        .map((option) => option.id),
    )

  useEffect(() => {
    if (
      !data ||
      lessonId === null ||
      lessonId < 0 ||
      selectedPathIds === null ||
      selectedPathIds.size === 0
    ) return

    const timer = window.setTimeout(() => {
      savePreferences({
        lessonId,
        selectedTypes: lessonPathOptions
          .filter((option) => selectedPathIds.has(option.id))
          .map((option) => option.sectionType),
      })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [data, lessonId, savePreferences, selectedPathIds])

  const lessonData = data ?? (isPreviewLesson ? createPreviewLessonSectionsData(lessonId) : null)
  const sections = lessonData?.sections ?? []
  const isSectionCompleted = (sectionId: number, serverCompleted: boolean) =>
    serverCompleted || completedSectionIds.has(sectionId)
  const completedSectionCount = sections.filter((section) =>
    isSectionCompleted(section.sectionId, section.isCompleted),
  ).length
  const overallProgress = sections.length
    ? Math.max(
      lessonData?.overallProgressPercent ?? 0,
      Math.round((completedSectionCount / sections.length) * 100),
    )
    : lessonData?.overallProgressPercent ?? 0
  const lessonProgressFillWidth = getLessonProgressFillWidth(
    overallProgress,
    lessonProgressDotCount,
  )
  const siblingLessons = lessonData?.siblingLessons ?? []
  const lessonTitle = lessonData?.title ?? ''
  const displayedSections = sections.filter((section) => {
    const pathId = getSectionPathId(section.type)
    return pathId === null || effectiveSelectedPathIds.has(pathId)
  })
  const initialSelectedModuleId =
    initialSelectedModuleOrder !== undefined
      ? sections[initialSelectedModuleOrder - 1]?.sectionId ?? null
      : null
  const effectiveSelectedModuleId = selectedModuleId ?? initialSelectedModuleId

  const getModuleProgressDisplayValue = (
    sectionId: number,
    progressPercent: number,
    serverCompleted: boolean,
  ) =>
    completedSectionIds.has(sectionId) || serverCompleted ? 100 :
    progressPercent >= 100 ? 100 : Math.max(progressPercent, minimumModuleFillPercent)
  const selectedSection = sections.find((section) => section.sectionId === effectiveSelectedModuleId)
  const selectedSectionIsCompleted = selectedSection
    ? isSectionCompleted(selectedSection.sectionId, selectedSection.isCompleted)
    : false

  const togglePath = (pathId: LessonPathId) => {
    setSelectedPathIds((current) => {
      const next = new Set(current ?? effectiveSelectedPathIds)

      if (next.has(pathId)) {
        if (next.size === 1) return current
        next.delete(pathId)
      } else {
        next.add(pathId)
      }

      return next
    })
    setSelectedModuleId(null)
  }

  const handleStartLesson = () => {
    if (!displayedSections.length) return
    const selectedModule = displayedSections.find((section) => section.sectionId === effectiveSelectedModuleId)
    const fallback = displayedSections.find((section) =>
      !isSectionCompleted(section.sectionId, section.isCompleted),
    ) ?? displayedSections[0]
    const target = selectedModule ?? fallback

    if (target) {
      onStartLesson(target.sectionId, target.type)
    }
  }

  const handleMarkComplete = async () => {
    if (effectiveSelectedModuleId === null) return
    const section = sections.find((s) => s.sectionId === effectiveSelectedModuleId)
    if (!section) return
    if (isSectionCompleted(section.sectionId, section.isCompleted)) return

    if (effectiveSelectedModuleId < 0) {
      setCompletedSectionIds((current) => new Set(current).add(effectiveSelectedModuleId))
      return
    }

    try {
      await saveProgress.mutateAsync({
        sectionId: effectiveSelectedModuleId,
        payload: {
          currentPage: section.totalPages || 1,
          stayTimeSeconds: 0,
          isCompleted: true,
          difficulty: section.type === 'GRAMMAR' ? 'NORMAL' : undefined,
        },
      })
      setCompletedSectionIds((current) => new Set(current).add(effectiveSelectedModuleId))
    } catch {
      // 사용자가 다시 시도할 수 있도록 선택한 모듈 상태를 유지한다.
    }
  }

  if (loading) {
    return (
      <main className="lesson-detail-screen">
        <section className="lesson-detail-content">
          <div className="lesson-detail-header-area">
            <header className="lesson-detail-header">
              <button type="button" className="lesson-detail-back" onClick={onBack} aria-label="Go back">
                <svg className="lesson-detail-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </header>
          </div>
          <p className="lesson-detail-status">Loading...</p>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="lesson-detail-screen">
        <section className="lesson-detail-content">
          <div className="lesson-detail-header-area">
            <header className="lesson-detail-header">
              <button type="button" className="lesson-detail-back" onClick={onBack} aria-label="Go back">
                <svg className="lesson-detail-back-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </header>
          </div>
          <p className="lesson-detail-status">{error.message}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="lesson-detail-screen">
      <section className="lesson-detail-content">
        <div className="lesson-detail-header-area">
          <header className="lesson-detail-header">
            <button
              type="button"
              className="lesson-detail-back"
              onClick={onBack}
              aria-label="Go back"
            >
              <svg
                className="lesson-detail-back-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              className="lesson-detail-picker-toggle"
              aria-expanded={isLessonPickerOpen}
              aria-controls="lesson-detail-picker-panel"
              onClick={() => setIsLessonPickerOpen((current) => !current)}
            >
              <h1 className="lesson-detail-title">{lessonTitle}</h1>
              <svg
                className={`lesson-detail-picker-icon ${
                  isLessonPickerOpen
                    ? 'lesson-detail-picker-icon-open'
                    : 'lesson-detail-picker-icon-closed'
                }`}
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4.5 6.75L9 11.25L13.5 6.75"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </header>

          {isLessonPickerOpen ? (
            <section id="lesson-detail-picker-panel" className="lesson-detail-picker-panel">
              {siblingLessons.map((lesson) => {
                const isCurrent = lesson.lessonId === lessonId

                return (
                  <button
                    key={lesson.lessonId}
                    type="button"
                    className={`lesson-detail-picker-option ${
                      isCurrent ? 'lesson-detail-picker-option-current' : ''
                    }`}
                    onClick={() => {
                      onSelectLesson(lesson.lessonId)
                      setIsLessonPickerOpen(false)
                    }}
                  >
                    {lesson.title}
                  </button>
                )
              })}
            </section>
          ) : null}
        </div>

        {isLessonPickerOpen ? (
          <button
            type="button"
            className="lesson-detail-dim"
            aria-label="Close lesson picker"
            onClick={() => setIsLessonPickerOpen(false)}
          />
        ) : null}

        <section className="lesson-detail-path-section" aria-label="Choose path">
          <div className="lesson-detail-path-head">
            <h2 className="lesson-detail-path-title">Choose path</h2>
            <button
              type="button"
              className="lesson-detail-path-info"
              aria-label="Path information"
            >
              <svg
                className="lesson-detail-path-info-icon"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M9 7.2V11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="5.1" r="0.9" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div className="lesson-detail-path-list">
            {lessonPathOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="lesson-detail-path-item"
                role="checkbox"
                aria-checked={effectiveSelectedPathIds.has(option.id)}
                onClick={() => togglePath(option.id)}
              >
                <span
                  className={`lesson-detail-path-box ${
                    effectiveSelectedPathIds.has(option.id) ? 'lesson-detail-path-box-selected' : ''
                  }`}
                  aria-hidden="true"
                >
                  {effectiveSelectedPathIds.has(option.id) ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path
                        d="M2.1 5.1L4.1 7.1L7.9 2.9"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span className="lesson-detail-path-label">{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="lesson-detail-progress-section" aria-label="My Progress">
          <h2 className="lesson-detail-progress-title">My Progress</h2>
          <p className="lesson-detail-progress-copy">{`${Math.round(overallProgress)}% complete`}</p>

          <div className="lesson-detail-progress-bar" role="list" aria-label="lesson progress">
            <span className="lesson-detail-progress-track" aria-hidden="true" />
            <span
              className="lesson-detail-progress-fill"
              style={{ width: lessonProgressFillWidth }}
              aria-hidden="true"
            />
            {Array.from({ length: lessonProgressDotCount }).map((_, index) => (
              <span
                key={index}
                className={`lesson-detail-progress-dot ${
                  index <= getLessonProgressActiveDotIndex(overallProgress, lessonProgressDotCount)
                    ? 'lesson-detail-progress-dot-past'
                    : 'lesson-detail-progress-dot-upcoming'
                }`}
                style={{
                  left: getLessonProgressDotPosition(index, lessonProgressDotCount),
                }}
                role="listitem"
              />
            ))}
          </div>

          <div className="lesson-detail-module-grid">
            {displayedSections.map((section) => {
              const isCompleted = isSectionCompleted(section.sectionId, section.isCompleted)

              return (
                <button
                  key={section.sectionId}
                  type="button"
                  className={`lesson-detail-module-card ${
                    effectiveSelectedModuleId === section.sectionId || isCompleted
                      ? 'lesson-detail-module-card-selected'
                      : ''
                  } ${isCompleted ? 'lesson-detail-module-card-completed' : ''}`}
                  onClick={() => setSelectedModuleId(section.sectionId)}
                >
                  <h3 className="lesson-detail-module-title">{section.type}</h3>
                  <span className="lesson-detail-module-progress">
                    <span
                      className="lesson-detail-module-progress-fill"
                      style={{
                        width: `${getModuleProgressDisplayValue(
                          section.sectionId,
                          section.progressPercent,
                          section.isCompleted,
                        )}%`,
                      }}
                    />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="lesson-detail-action-row">
            {effectiveSelectedModuleId !== null && !selectedSectionIsCompleted ? (
              <div className="lesson-detail-complete-wrap">
                <span className="lesson-detail-complete-bubble">Mark as complete</span>
                <button
                  type="button"
                  className="lesson-detail-complete-button"
                  aria-label="Mark as complete"
                  disabled={saveProgress.isPending}
                  onClick={() => void handleMarkComplete()}
                >
                  <svg
                    className="lesson-detail-complete-icon"
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M7.25 6.25V15.75L14.75 11L7.25 6.25Z" fill="currentColor" />
                    <path
                      d="M16.75 6.25V15.75"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {saveProgress.error ? (
                  <p className="lesson-detail-complete-error" role="alert">
                    {saveProgress.error.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className="lesson-detail-start-button"
              onClick={handleStartLesson}
            >
              START LESSON
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}

export default LessonDetailPage
