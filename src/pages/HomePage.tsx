import { useMemo, useState } from 'react'
import './HomePage.css'
import homeIcon from '../assets/home.svg'
import classIcon from '../assets/Class.svg'
import fileIcon from '../assets/file.svg'
import bookOpenIcon from '../assets/book-open.svg'
import profileIcon from '../assets/user.svg'
import lessonCharacterImage from '../assets/9.png'
import practiceComingSoonImage from '../assets/2.png'
import type { LastLesson } from '../types/home.types.ts'
import { useHomeResume } from '../hooks/useHomeResume.ts'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: classIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

interface HomePageProps {
  userName?: string
  onOpenClass: () => void
  onOpenNotebook: () => void
  onOpenProfile: () => void
  onOpenPractice: () => void
  onStartLesson?: (lesson: LastLesson) => void
}

function getLessonPreview(lesson: LastLesson): string {
  switch (lesson.sectionType) {
    case 'GRAMMAR':
      return lesson.grammarPreview ?? ''
    case 'VOCAB':
      return lesson.vocabPreview ?? ''
    case 'LISTENING':
      return lesson.listeningPreview ?? ''
    case 'SPEAKING':
      return lesson.speakingPreview ?? ''
    case 'READING':
      return lesson.readingPreview ?? ''
    default:
      return ''
  }
}

function HomePage({
  userName,
  onOpenClass,
  onOpenNotebook,
  onOpenProfile,
  onOpenPractice,
  onStartLesson,
}: HomePageProps) {
  const [selectedGoalType, setSelectedGoalType] = useState<'today' | 'week'>('today')
  const { data, loading, error, refetch } = useHomeResume()

  const displayName = data?.userFirstName ?? userName ?? ''
  const dailyStreak = data?.dailyStreak ?? 0
  const lastLesson = data?.lastLesson ?? null
  const weeklyAttendance = data?.weeklyAttendance ?? []
  const lessonPreview = lastLesson
    ? {
        course: `Course ${lastLesson.courseId} lesson ${lastLesson.lessonId}`,
        title: lastLesson.lessonTitle,
        firstLine: lastLesson.sectionTitle,
        secondLine: getLessonPreview(lastLesson),
      }
    : {
        course: 'Course 1 lesson 5',
        title: '-을까요?',
        firstLine: '같이 점심',
        secondLine: '먹을까요?',
      }

  const activeGoal = useMemo(() => {
    if (selectedGoalType === 'today') {
      return {
        title: 'Today’s Goal',
        current: data?.todayGoal.studiedMin ?? 0,
        total: data?.todayGoal.targetMin ?? 0,
      }
    }
    return {
      title: 'Week Goal',
      current: data?.weekGoal.studiedMin ?? 0,
      total: data?.weekGoal.targetMin ?? 0,
    }
  }, [data, selectedGoalType])

  const progressPercent =
    activeGoal.total > 0
      ? Math.min(100, Math.max(0, (activeGoal.current / activeGoal.total) * 100))
      : 0
  const shortFillPercent = progressPercent
  const bubbleLeft = Math.min(98, Math.max(2, progressPercent))

  if (loading && !data) {
    return (
      <main className="home-screen">
        <section className="home-content">
          <p className="home-loading">Loading...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="home-screen">
      <section className="home-content">
        {error && !data ? (
          <button type="button" className="home-sync-status" onClick={() => void refetch()}>
            Sync unavailable
          </button>
        ) : null}

        <header className="home-greeting">
          <p className="home-greeting-hi">Hi, {displayName || 'Lior'}</p>
          <p className="home-greeting-welcome">Welcome back</p>
        </header>

        <section className="home-card lesson-card">
          <div className="lesson-head">
            <h3 className="lesson-title">Today’s lesson</h3>
            <p className="lesson-subtitle">{lessonPreview.course}</p>
          </div>
          <div className="lesson-main">
            <div className="lesson-body">
              <p className="lesson-sentence primary">{lessonPreview.title}</p>
              <p className="lesson-sentence secondary">
                <span className="lesson-word">{lessonPreview.firstLine}</span>
                <span className="lesson-apply">{lessonPreview.secondLine}</span>
              </p>
            </div>
            <img className="lesson-character" src={lessonCharacterImage} alt="" aria-hidden="true" />
          </div>
          <button
            className="start-btn"
            type="button"
            disabled={!lastLesson || !onStartLesson}
            onClick={() => {
              if (lastLesson) onStartLesson?.(lastLesson)
            }}
          >
            START
          </button>
        </section>

        <section className="home-card streak-card">
          <h2 className="streak-title">{dailyStreak} days in a row !</h2>
          <div className="streak-indicators" role="list" aria-label="Daily streak progress">
            <div className="streak-track">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                const isComplete = weeklyAttendance[index] ?? index < dailyStreak

                return (
                  <span
                    key={`${day}-${index}`}
                    className={`streak-dot ${isComplete ? 'filled' : ''}`}
                    role="listitem"
                    aria-label={`${day} ${isComplete ? 'completed' : 'not completed'}`}
                  >
                    {isComplete ? day : null}
                  </span>
                )
              })}
            </div>
          </div>
        </section>

        <section className="home-card goal-card">
          <div className="goal-segmented" role="tablist" aria-label="Goal period">
            <button
              type="button"
              role="tab"
              aria-selected={selectedGoalType === 'today'}
              className={`goal-tab goal-tab-left ${selectedGoalType === 'today' ? 'selected' : ''}`}
              onClick={() => setSelectedGoalType('today')}
            >
              Today’s Goal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedGoalType === 'week'}
              className={`goal-tab goal-tab-right ${selectedGoalType === 'week' ? 'selected' : ''}`}
              onClick={() => setSelectedGoalType('week')}
            >
              Week Goal
            </button>
          </div>

          <section className="goal-card-body">
            <section className="goal-progress" aria-label={`${activeGoal.title} progress`}>
              <div className="goal-progress-row">
                <div className="goal-progress-track-wrap">
                  <div
                    className="goal-progress-bubble"
                    style={{ left: `${bubbleLeft}%` }}
                    aria-hidden="true"
                  >
                    {activeGoal.current}min
                  </div>
                  <div
                    className="goal-progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progressPercent)}
                  >
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${shortFillPercent}%` }}
                    />
                  </div>
                </div>
                <span className="goal-total">{activeGoal.total}min</span>
              </div>
            </section>
          </section>
        </section>

        <button type="button" className="home-card practice-card" onClick={onOpenPractice}>
          <h3 className="practice-title">Practice</h3>
          <div className="practice-coming-soon">
            <img
              className="practice-coming-soon-character"
              src={practiceComingSoonImage}
              alt=""
              aria-hidden="true"
            />
            <p className="practice-coming-soon-text">Comming Soon</p>
          </div>
        </button>
      </section>

      <nav className="home-bottom-nav">
        {tabs.map((tab) => (
          <button
            type="button"
            className={`home-tab ${tab.label === 'HOME' ? 'home-tab-active' : ''}`}
            key={tab.label}
            onClick={() => {
              if (tab.label === 'CLASS') onOpenClass()
              if (tab.label === 'PRACTICE') onOpenPractice()
              if (tab.label === 'NOTEBOOK') onOpenNotebook()
              if (tab.label === 'PROFILE') onOpenProfile()
            }}
          >
            <img className="home-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
            <span className="home-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default HomePage
