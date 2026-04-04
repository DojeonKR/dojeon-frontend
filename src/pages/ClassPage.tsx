import { useState } from 'react'
import './ClassPage.css'
import homeIcon from '../assets/home.png'
import editIcon from '../assets/edit.png'
import fileIcon from '../assets/file.png'
import bookOpenIcon from '../assets/book-open.png'
import profileIcon from '../assets/user.png'
import {
  courseItems,
  currentCourseId,
  currentLessonId,
  findCourseById,
  findLessonById,
  getLessonPathId,
  type LessonPathId,
} from '../data/classLessons'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: editIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

const progressPercent = 18
const progressFillPercent = Math.min(100, progressPercent + 4)
const progressDotCount = 5
const progressDotInset = 10
const learningStreakDays = 5
const trialTargetDays = 7
const trialLabel = `${trialTargetDays}-day Trial available`

interface ClassPageProps {
  onOpenHome: () => void
  onOpenPractice: () => void
  onOpenCurrentLesson: () => void
  onOpenLesson: (courseId: string, lessonId: string, initialPathId?: LessonPathId) => void
}

const currentCourse = findCourseById(currentCourseId) ?? courseItems[0]
const currentLesson =
  findLessonById(currentCourse, currentLessonId) ?? currentCourse.lessons[currentCourse.lessons.length - 1]

function ClassPage({ onOpenHome, onOpenPractice, onOpenCurrentLesson, onOpenLesson }: ClassPageProps) {
  const [openCourseIds, setOpenCourseIds] = useState<string[]>([])
  const [isBottomLessonVisible, setIsBottomLessonVisible] = useState(true)

  return (
    <main className="class-screen">
      <section className="class-content">
        <section className="class-progress-card">
          <h1 className="class-page-title">My progress</h1>
          <p className="class-progress-complete">{progressPercent}% complete</p>
          <div className="class-progress-bar" role="list" aria-label="class progress">
            <span className="class-progress-track" aria-hidden="true" />
            <span
              className="class-progress-fill"
              style={{ width: `${progressFillPercent}%` }}
              aria-hidden="true"
            />
            {Array.from({ length: progressDotCount }).map((_, index) => (
              <span
                key={index}
                className={`class-progress-dot ${
                  index === 0 ? 'class-progress-dot-past' : 'class-progress-dot-upcoming'
                }`}
                style={{
                  left: `calc(${progressDotInset}px + ((100% - ${progressDotInset * 2}px) / ${
                    progressDotCount - 1
                  }) * ${index})`,
                }}
                role="listitem"
              />
            ))}
          </div>
        </section>

        <section className="class-course-list" aria-label="courses">
          {courseItems.map((course) => {
            const isOpen = openCourseIds.includes(course.id)

            return (
              <article key={course.id} className="class-course-item">
                <button
                  type="button"
                  className="class-course-toggle"
                  aria-expanded={isOpen}
                  aria-controls={`${course.id}-lessons`}
                  onClick={() =>
                    setOpenCourseIds((current) =>
                      current.includes(course.id)
                        ? current.filter((courseId) => courseId !== course.id)
                        : [...current, course.id],
                    )
                  }
                >
                  <span className="class-course-toggle-label">{course.label}</span>
                  <svg
                    className={`class-course-arrow ${isOpen ? 'class-course-arrow-open' : 'class-course-arrow-closed'}`}
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4.5 6.75L9 11.25L13.5 6.75"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {isOpen ? (
                  <div id={`${course.id}-lessons`} className="class-course-lessons">
                    {course.lessons.map((lesson) => (
                      <button
                        key={`${course.id}-${lesson.id}`}
                        type="button"
                        className="class-lesson-card"
                        onClick={() => onOpenLesson(course.id, lesson.id, getLessonPathId(lesson.stage))}
                        aria-label={`Open ${course.label}, ${lesson.label}`}
                      >
                        <span className="class-lesson-main">
                          <span
                            className="class-lesson-progress"
                            aria-label={`${lesson.progress}% progress`}
                            style={{
                              background: `conic-gradient(from 0deg, #5f5f5f 0deg ${
                                lesson.progress * 3.6
                              }deg, #bdbdbd ${lesson.progress * 3.6}deg 360deg)`,
                            }}
                          >
                            <span className="class-lesson-progress-text">
                              <span className="class-lesson-progress-number">{lesson.progress}</span>
                              <span className="class-lesson-progress-unit">%</span>
                            </span>
                          </span>

                          <span className="class-lesson-copy">
                            <span className="class-lesson-chip">{lesson.label}</span>
                            <span className="class-lesson-title">{lesson.title}</span>
                          </span>
                        </span>

                        <svg
                          className="class-lesson-arrow"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M7 4L12 9L7 14"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>
      </section>

      <button
        type="button"
        className={`class-trial-toggle ${isBottomLessonVisible ? 'class-trial-toggle-expanded' : 'class-trial-toggle-collapsed'}`}
        onClick={() => setIsBottomLessonVisible((current) => !current)}
        aria-expanded={isBottomLessonVisible}
        aria-label={`${trialLabel}. ${learningStreakDays} day streak`}
      >
        <span className="class-trial-toggle-text">{trialLabel}</span>
      </button>

      {isBottomLessonVisible ? (
        <>
          <button
            type="button"
            className="class-current-lesson-card"
            onClick={onOpenCurrentLesson}
            aria-label={`Open ${currentCourse.label}, ${currentLesson.label}`}
          >
            <span className="class-current-lesson-copy">
              <span className="class-current-lesson-kicker">{`${currentCourse.label}, ${currentLesson.label}`}</span>
              <span className="class-current-lesson-title">{currentLesson.title}</span>
            </span>
            <svg
              className="class-current-lesson-arrow"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 4L12 9L7 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="class-current-lesson-progress-bar" aria-hidden="true">
            <span
              className="class-current-lesson-progress-fill"
              style={{ width: `${currentLesson.progress}%` }}
            />
          </div>
        </>
      ) : null}

      <nav className="class-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`class-tab ${tab.label === 'CLASS' ? 'class-tab-active' : ''}`}
            onClick={() => {
              if (tab.label === 'HOME') {
                onOpenHome()
              }

              if (tab.label === 'PRACTICE') {
                onOpenPractice()
              }
            }}
          >
            <img className="class-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
            <span className="class-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default ClassPage
