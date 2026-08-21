import { useEffect, useMemo, useState } from 'react'
import './ClassPage.css'
import homeIcon from '../assets/home.svg'
import classIcon from '../assets/Class.svg'
import fileIcon from '../assets/file.svg'
import bookOpenIcon from '../assets/book-open.svg'
import profileIcon from '../assets/user.svg'
import { useCoursesDashboard } from '../hooks/useCoursesDashboard.ts'
import type { DashboardCourse } from '../types/dasboard.types.ts'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: classIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

const progressDotInset = 10
const progressDotStopGap = 8
const minimumCourseCount = 5
const fallbackProgressPercent = 18
const trialTargetDays = 7
const trialLabel = `${trialTargetDays}-day Trial available`

function getClassProgressFillWidth(activeCourseIndex: number, dotCount: number): string {
  if (activeCourseIndex < 0) return '0%'
  const targetDotIndex = activeCourseIndex + 1
  if (targetDotIndex >= dotCount - 1) return '100%'

  return `calc(${progressDotInset}px + ((100% - ${progressDotInset * 2}px) / ${
    dotCount - 1
  }) * ${targetDotIndex} - ${progressDotStopGap}px)`
}

function createFallbackLessons(courseOrder: number): DashboardCourse['lessons'] {
  return Array.from({ length: 5 }, (_, index) => ({
    lessonId: -(courseOrder * 100 + index + 1),
    title: 'Vocabulary',
    subtitle: null,
    orderNum: index + 1,
    sectionCount: 1,
    completedSectionCount: 1,
    progressPercent: 100,
    isCompleted: true,
  }))
}

function createFallbackCourse(courseOrder: number): DashboardCourse {
  return {
    courseId: -courseOrder,
    title: `Course ${courseOrder}`,
    description: '',
    orderNum: courseOrder,
    isActive: true,
    totalSections: 5,
    completedSections: courseOrder === 1 ? 5 : 0,
    overallProgressPercent: courseOrder === 1 ? 100 : 0,
    totalStaySeconds: 0,
    lessons: createFallbackLessons(courseOrder),
  }
}

function getDisplayCourses(apiCourses: DashboardCourse[]): DashboardCourse[] {
  const coursesByOrder = new Map<number, DashboardCourse>()
  for (const course of apiCourses) {
    coursesByOrder.set(course.orderNum || course.courseId, course)
  }

  return Array.from({ length: Math.max(minimumCourseCount, apiCourses.length) }, (_, index) => {
    const courseOrder = index + 1
    return coursesByOrder.get(courseOrder) ?? createFallbackCourse(courseOrder)
  })
}

interface ClassPageProps {
  preferFallbackContent?: boolean
  defaultOpenCourseOrder?: number
  onOpenHome: () => void
  onOpenPractice: () => void
  onOpenNotebook: () => void
  onOpenProfile: () => void
  onOpenLesson: (courseId: number, lessonId: number) => void
  onUnauthorized: () => void
}

function ClassPage({
  preferFallbackContent = false,
  defaultOpenCourseOrder,
  onOpenHome,
  onOpenPractice,
  onOpenNotebook,
  onOpenProfile,
  onOpenLesson,
  onUnauthorized,
}: ClassPageProps) {
  const { data, loading, error, refetch } = useCoursesDashboard()
  const [manuallyToggled, setManuallyToggled] = useState<Map<number, boolean>>(new Map())

  const resumeBanner = data?.resumeBanner ?? null
  const apiCourses = useMemo(() => data?.courses ?? [], [data])
  const courses = useMemo(() => getDisplayCourses(apiCourses), [apiCourses])
  const isUsingFallbackCourses = apiCourses.length === 0
  const isUnauthorized = error?.status === 401 || error?.status === 403

  useEffect(() => {
    if (isUnauthorized) onUnauthorized()
  }, [isUnauthorized, onUnauthorized])

  const progressPercent = useMemo(() => {
    if (isUsingFallbackCourses) return fallbackProgressPercent
    if (!resumeBanner) return 0
    const activeCourse = courses.find((c) => c.courseId === resumeBanner.courseId)
    return activeCourse?.overallProgressPercent ?? resumeBanner.overallProgressPercent ?? 0
  }, [courses, isUsingFallbackCourses, resumeBanner])

  const activeCourseIndex = (() => {
    if (!courses.length) return -1
    if (isUsingFallbackCourses || !resumeBanner) return 0

    const index = courses.findIndex((course) => course.courseId === resumeBanner.courseId)
    return index >= 0 ? index : 0
  })()
  const classProgressDotCount = Math.max(1, courses.length)
  const progressFillWidth = getClassProgressFillWidth(activeCourseIndex, classProgressDotCount)

  const openCourseIds = useMemo(() => {
    const open = new Set<number>()
    if (defaultOpenCourseOrder !== undefined && !manuallyToggled.size) {
      const defaultCourse = courses.find((course) => course.orderNum === defaultOpenCourseOrder)
      if (defaultCourse) open.add(defaultCourse.courseId)
    }
    for (const [courseId, isOpen] of manuallyToggled) {
      if (isOpen) open.add(courseId)
      else open.delete(courseId)
    }
    return open
  }, [courses, defaultOpenCourseOrder, manuallyToggled])

  const toggleCourse = (courseId: number) => {
    const currentlyOpen = openCourseIds.has(courseId)
    setManuallyToggled((prev) => {
      const next = new Map(prev)
      next.set(courseId, !currentlyOpen)
      return next
    })
  }

  if (loading && !preferFallbackContent) {
    return (
      <main className="class-screen">
        <section className="class-content">
          <p className="class-status">Loading...</p>
        </section>
      </main>
    )
  }

  if (isUnauthorized) return null

  if (error && !isUsingFallbackCourses && !preferFallbackContent) {
    return (
      <main className="class-screen">
        <section className="class-content">
          <p className="class-status">{error.message}</p>
          <button type="button" onClick={() => void refetch()}>
            Retry
          </button>
        </section>
      </main>
    )
  }

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
              style={{ width: progressFillWidth }}
              aria-hidden="true"
            />
            {Array.from({ length: classProgressDotCount }).map((_, index) => (
              <span
                key={index}
                className={`class-progress-dot ${
                  index <= activeCourseIndex
                    ? 'class-progress-dot-past'
                    : 'class-progress-dot-upcoming'
                }`}
                style={{
                  left: `calc(${progressDotInset}px + ((100% - ${progressDotInset * 2}px) / ${
                    classProgressDotCount - 1
                  }) * ${index})`,
                }}
                role="listitem"
              />
            ))}
          </div>
        </section>

        <section className="class-course-list" aria-label="courses">
          {courses.map((course) => {
            const isOpen = openCourseIds.has(course.courseId)
            const courseLabel = `Course ${course.orderNum || course.courseId}`

            return (
              <article key={course.courseId} className="class-course-item">
                <button
                  type="button"
                  className="class-course-toggle"
                  aria-expanded={isOpen}
                  aria-controls={`course-${course.courseId}-lessons`}
                  onClick={() => toggleCourse(course.courseId)}
                >
                  <span className="class-course-toggle-label">{courseLabel}</span>
                  <svg
                    className={`class-course-arrow ${
                      isOpen ? 'class-course-arrow-open' : 'class-course-arrow-closed'
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
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {isOpen ? (
                  <div
                    id={`course-${course.courseId}-lessons`}
                    className="class-course-lessons"
                  >
                    {course.lessons.map((lesson) => (
                      <button
                        key={`${course.courseId}-${lesson.lessonId}`}
                        type="button"
                        className="class-lesson-card"
                        onClick={() => {
                          onOpenLesson(course.courseId, lesson.lessonId)
                        }}
                        aria-label={`Open ${courseLabel}, ${lesson.title}`}
                      >
                        <span className="class-lesson-main">
                          <span
                            className="class-lesson-progress"
                            aria-label={`${lesson.progressPercent}% progress`}
                            style={{
                              background: `conic-gradient(from 0deg, var(--dojeon-color-primary-300) 0deg ${
                                lesson.progressPercent * 3.6
                              }deg, var(--dojeon-color-primary-border) ${lesson.progressPercent * 3.6}deg 360deg)`,
                            }}
                          >
                            <span className="class-lesson-progress-text">
                              <span className="class-lesson-progress-number">
                                {lesson.progressPercent}
                              </span>
                              <span className="class-lesson-progress-unit">%</span>
                            </span>
                          </span>

                          <span className="class-lesson-copy">
                            <span className="class-lesson-chip">
                              lesson {lesson.orderNum}
                            </span>
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

      <div className="class-trial-banner">
        <span className="class-trial-banner-text">{trialLabel}</span>
      </div>

      <nav className="class-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`class-tab ${tab.label === 'CLASS' ? 'class-tab-active' : ''}`}
            onClick={() => {
              if (tab.label === 'HOME') onOpenHome()
              if (tab.label === 'PRACTICE') onOpenPractice()
              if (tab.label === 'NOTEBOOK') onOpenNotebook()
              if (tab.label === 'PROFILE') onOpenProfile()
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
