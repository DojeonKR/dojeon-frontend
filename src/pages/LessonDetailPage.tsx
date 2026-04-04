import { useEffect, useState } from 'react'
import './LessonDetailPage.css'
import {
  type CourseItem,
  findLessonById,
  getLessonPathId,
  type LessonItem,
  type LessonPathId,
} from '../data/classLessons'

const lessonPathOptions: { id: LessonPathId; label: string }[] = [
  { id: 'vocab', label: 'Vocab' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'reading', label: 'Reading' },
  { id: 'listening', label: 'Listening' },
]

const lessonModuleItems = [
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'grammar-1', label: 'Grammar 1' },
  { id: 'grammar-2', label: 'Grammar 2' },
  { id: 'grammar-3', label: 'Grammar 3' },
  { id: 'reading', label: 'Reading' },
  { id: 'listening-1', label: 'Listening 1' },
]
const minimumModuleFillPercent = 6
const lessonProgressDotSize = 6

const getModuleProgressValues = (lesson: LessonItem) => {
  if (lesson.progress >= 100) {
    return [100, 100, 100, 100, 100, 100]
  }

  if (lesson.stage === 'Vocabulary') {
    return [lesson.progress, 0, 0, 0, 0, 0]
  }

  if (lesson.stage === 'Grammar') {
    return [100, lesson.progress, 0, 0, 0, 0]
  }

  if (lesson.stage === 'Reading') {
    return [100, 100, 100, 100, lesson.progress, 0]
  }

  return [100, 100, 100, 100, 100, lesson.progress]
}

const getCompletedModuleIds = (progressValues: number[]) =>
  lessonModuleItems
    .filter((_, index) => progressValues[index] >= 100)
    .map((item) => item.id)

interface LessonDetailPageProps {
  course: CourseItem
  selectedLessonId: string
  initialPathId: LessonPathId
  onSelectLesson: (lessonId: string) => void
  onBack: () => void
}

function LessonDetailPage({
  course,
  selectedLessonId,
  initialPathId,
  onSelectLesson,
  onBack,
}: LessonDetailPageProps) {
  const [isLessonPickerOpen, setIsLessonPickerOpen] = useState(false)
  const [selectedPathId, setSelectedPathId] = useState<LessonPathId>(initialPathId)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const selectedLesson = findLessonById(course, selectedLessonId) ?? course.lessons[0]
  const initialModuleProgressValues = getModuleProgressValues(selectedLesson)
  const [lessonProgressPercent, setLessonProgressPercent] = useState(selectedLesson.progress)
  const [moduleProgressValues, setModuleProgressValues] = useState(() =>
    initialModuleProgressValues,
  )
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>(() =>
    getCompletedModuleIds(initialModuleProgressValues),
  )
  const moduleProgressDisplayValues = moduleProgressValues.map((value) =>
    value >= 100 ? 100 : Math.max(value, minimumModuleFillPercent),
  )

  useEffect(() => {
    setIsLessonPickerOpen(false)
    setSelectedPathId(initialPathId ?? getLessonPathId(selectedLesson.stage))
    setSelectedModuleId(null)
    setLessonProgressPercent(selectedLesson.progress)
    const nextModuleProgressValues = getModuleProgressValues(selectedLesson)
    setModuleProgressValues(nextModuleProgressValues)
    setCompletedModuleIds(getCompletedModuleIds(nextModuleProgressValues))
  }, [course.id, initialPathId, selectedLessonId, selectedLesson.stage])

  return (
    <main className="lesson-detail-screen">
      <section className="lesson-detail-content">
        <div className="lesson-detail-header-area">
          <header className="lesson-detail-header">
            <button
              type="button"
              className="lesson-detail-back"
              onClick={onBack}
              aria-label="뒤로 가기"
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
              <h1 className="lesson-detail-title">{selectedLesson.label}</h1>
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
              {course.lessons.map((lesson) => {
                const isCurrent = lesson.id === selectedLesson.id

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className={`lesson-detail-picker-option ${
                      isCurrent ? 'lesson-detail-picker-option-current' : ''
                    }`}
                    onClick={() => onSelectLesson(lesson.id)}
                  >
                    {lesson.label}
                  </button>
                )
              })}
            </section>
          ) : null}
        </div>

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
                onClick={() => setSelectedPathId(option.id)}
              >
                <span
                  className={`lesson-detail-path-box ${
                    selectedPathId === option.id ? 'lesson-detail-path-box-selected' : ''
                  }`}
                  aria-hidden="true"
                />
                <span className="lesson-detail-path-label">{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="lesson-detail-progress-section" aria-label="My Progress">
          <h2 className="lesson-detail-progress-title">My Progress</h2>
          <p className="lesson-detail-progress-copy">{`${Math.round(lessonProgressPercent)}% complete`}</p>

          <div className="lesson-detail-progress-bar" role="list" aria-label="lesson progress">
            <span className="lesson-detail-progress-track" aria-hidden="true" />
            <span
              className="lesson-detail-progress-fill"
              style={{ width: `${lessonProgressPercent}%` }}
              aria-hidden="true"
            />
            {Array.from({ length: lessonModuleItems.length }).map((_, index) => (
              <span
                key={index}
                className={`lesson-detail-progress-dot ${
                  lessonProgressPercent > 0 &&
                  index <= Math.floor((lessonProgressPercent / 100) * (lessonModuleItems.length - 1))
                    ? 'lesson-detail-progress-dot-past'
                    : 'lesson-detail-progress-dot-upcoming'
                }`}
                style={{
                  left: `calc((((100% - ${lessonModuleItems.length * lessonProgressDotSize}px) / ${
                    lessonModuleItems.length + 1
                  }) * ${index + 1}) + ${lessonProgressDotSize * index + lessonProgressDotSize / 2}px)`,
                }}
                role="listitem"
              />
            ))}
          </div>

          <div className="lesson-detail-module-grid">
            {lessonModuleItems.map((item, index) => {
              const isCompleted = completedModuleIds.includes(item.id)

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lesson-detail-module-card ${
                    selectedModuleId === item.id || isCompleted
                      ? 'lesson-detail-module-card-selected'
                      : ''
                  }`}
                  onClick={() => {
                    if (isCompleted) {
                      return
                    }

                    setSelectedModuleId((current) => (current === item.id ? null : item.id))
                  }}
                >
                  <h3 className="lesson-detail-module-title">{item.label}</h3>
                  <span className="lesson-detail-module-progress">
                    <span
                      className="lesson-detail-module-progress-fill"
                      style={{ width: `${moduleProgressDisplayValues[index]}%` }}
                    />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="lesson-detail-action-row">
            {selectedModuleId ? (
              <div className="lesson-detail-complete-wrap">
                <span className="lesson-detail-complete-bubble">Mark as complete</span>
                <button
                  type="button"
                  className="lesson-detail-complete-button"
                  aria-label="Mark as complete"
                  onClick={() => {
                    if (!selectedModuleId) {
                      return
                    }

                    const remainingIncompleteModuleCount =
                      lessonModuleItems.length - completedModuleIds.length

                    setModuleProgressValues((current) =>
                      current.map((value, index) =>
                        lessonModuleItems[index]?.id === selectedModuleId ? 100 : value,
                      ),
                    )
                    setLessonProgressPercent((current) => {
                      if (remainingIncompleteModuleCount <= 0) {
                        return 100
                      }

                      return Math.min(
                        100,
                        current + (100 - current) / remainingIncompleteModuleCount,
                      )
                    })
                    setCompletedModuleIds((current) =>
                      current.includes(selectedModuleId) ? current : [...current, selectedModuleId],
                    )
                    setSelectedModuleId(null)
                  }}
                >
                  <svg
                    className="lesson-detail-complete-icon"
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7.25 6.25V15.75L14.75 11L7.25 6.25Z"
                      fill="currentColor"
                    />
                    <path
                      d="M16.75 6.25V15.75"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ) : null}

            <button type="button" className="lesson-detail-start-button">
              START LESSON
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}

export default LessonDetailPage
