import { useState } from 'react'
import './HomePage.css'
import homeIcon from '../assets/home.png'
import editIcon from '../assets/edit.png'
import fileIcon from '../assets/file.png'
import bookOpenIcon from '../assets/book-open.png'
import profileIcon from '../assets/user.png'

const tabs = [
  { icon: homeIcon, label: 'HOME' },
  { icon: editIcon, label: 'CLASS' },
  { icon: fileIcon, label: 'PRACTICE' },
  { icon: bookOpenIcon, label: 'NOTEBOOK' },
  { icon: profileIcon, label: 'PROFILE' },
]

function HomePage() {
  const [selectedGoalType, setSelectedGoalType] = useState<'today' | 'week'>('today')
  const goalData = {
    today: {
      title: "Today's Goal",
      current: 3,
      total: 15,
    },
    week: {
      title: 'Week Goal',
      current: 3,
      total: 15,
    },
  }

  const activeGoal = goalData[selectedGoalType]
  const progressPercent = Math.min(100, Math.max(0, (activeGoal.current / activeGoal.total) * 100))
  const shortFillPercent = Math.min(100, Math.max(0, progressPercent))
  const bubbleLeft = Math.min(98, Math.max(2, progressPercent))

  return (
    <main className="home-screen">
      <section className="home-content">
        <header className="home-greeting">
          <p className="home-greeting-hi">Hi, Jinri</p>
          <p className="home-greeting-welcome">Welcome back</p>
        </header>

        <section className="home-card goal-card">
          <div className="goal-segmented" role="tablist" aria-label="Goal period">
            <button
              type="button"
              role="tab"
              aria-selected={selectedGoalType === 'today'}
              className={`goal-tab goal-tab-left ${selectedGoalType === 'today' ? 'selected' : ''}`}
              onClick={() => setSelectedGoalType('today')}
            >
              Today&apos;s Goal
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
            <section className="goal-progress" aria-label={`${activeGoal.title} 진행 상태`}>
              <div className="goal-progress-row">
                <div className="goal-progress-track-wrap">
                  <div
                    className="goal-progress-bubble"
                    style={{ left: `${bubbleLeft}%` }}
                    aria-hidden="true"
                  >
                    3min
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
                <span className="goal-total">15min</span>
              </div>
            </section>
          </section>
        </section>

        <section className="home-card streak-card">
          <h2 className="streak-title">5 days in a row !</h2>
          <div className="streak-indicators" role="region" aria-label="연속 학습 진행 상태">
            <div className="streak-track">
              {Array.from({ length: 20 }).map((_, index) => (
                <span key={index} className={`streak-dot ${index < 5 ? 'filled' : ''}`} />
              ))}
            </div>
          </div>
        </section>

        <section className="home-card lesson-card">
          <div className="lesson-head">
            <h3 className="lesson-title">Today&apos;s lesson</h3>
            <p className="lesson-subtitle">Course 1 lesson 5</p>
          </div>
          <div className="lesson-body">
            <p className="lesson-sentence primary">-을까요?</p>
            <p className="lesson-sentence secondary">
              <span className="lesson-word">가다</span>
              <span className="lesson-apply">갈까요?</span>
            </p>
            <p className="lesson-sentence secondary">
              <span className="lesson-word">먹다</span>
              <span className="lesson-apply">먹을까요?</span>
            </p>
          </div>
          <button className="start-btn" type="button">
            START
          </button>
        </section>

        <section className="home-card practice-card">
          <h3 className="practice-title">Practice</h3>
          <div className="practice-content" role="list">
            <p className="practice-item" role="listitem">
              Practice 1: Grammar basics
            </p>
            <p className="practice-item" role="listitem">
              Practice 2: Sentence ending patterns
            </p>
            <p className="practice-item" role="listitem">
              Practice 3: Q&amp;A with honorifics
            </p>
            <p className="practice-item" role="listitem">
              Practice 4: Everyday conversation
            </p>
            <p className="practice-item" role="listitem">
              Practice 5: Listening check
            </p>
            <p className="practice-item" role="listitem">
              Practice 6: Speaking repeats
            </p>
          </div>
        </section>
      </section>
      <nav className="home-bottom-nav">
        {tabs.map((tab) => (
          <button type="button" className="home-tab" key={tab.label}>
            <img className="home-tab-icon" src={tab.icon} alt="" aria-hidden="true" />
            <span className="home-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export default HomePage
