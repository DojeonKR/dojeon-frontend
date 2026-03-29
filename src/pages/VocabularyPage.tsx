import { useState } from 'react'
import './VocabularyPage.css'

interface VocabularyPageProps {
  onBack: () => void
}

function VocabularyPage({ onBack }: VocabularyPageProps) {
  const [isRecentSort, setIsRecentSort] = useState(true)

  return (
    <main className="vocabulary-screen">
      <section className="vocabulary-content">
        <header className="vocabulary-header">
          <button
            type="button"
            className="vocabulary-back"
            onClick={onBack}
            aria-label="뒤로 가기"
          >
            <svg
              className="vocabulary-back-icon"
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
          <h1 className="vocabulary-title">Vocabulary</h1>
        </header>

        <div className="vocabulary-sort-row">
          <button
            type="button"
            className="vocabulary-sort-button"
            onClick={() => setIsRecentSort((prev) => !prev)}
          >
            <span>Recently viewed</span>
            <svg
              className={`vocabulary-sort-icon ${isRecentSort ? 'is-recent' : 'is-alt'}`}
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.5 6.75L9 11.25L13.5 6.75"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <section className="vocabulary-card-list">
          {['COURSE 2', 'COURSE 1'].map((course) => (
            <article key={course} className="vocabulary-card">
              <p className="vocabulary-card-title">{course}</p>
              <div className="vocabulary-card-items">
                <p>1. 나무</p>
                <p>2. 생신</p>
                <p>3. 꽃</p>
              </div>
              <button type="button" className="vocabulary-practice-button">
                to flashcard practice
              </button>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}

export default VocabularyPage
